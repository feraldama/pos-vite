const Alquiler = require("../models/alquiler.model");
const AlquilerPrendas = require("../models/alquilerprendas.model");
const { withTransaction } = require("../config/db");

// Falta de stock detectada dentro de una transacción: lleva el cuerpo del 400
// y, al lanzarse, hace rollback
class StockError extends Error {
  constructor(body) {
    super(body.message);
    this.body = body;
  }
}

// dd/mm/aaaa para los mensajes de conflicto
const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const date = new Date(fecha);
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${date.getFullYear()}`;
};

// Condición de solapamiento con el rango pedido, para alquileres que todavía
// ocupan la prenda. Parámetros: fechaEntrega, fechaDevolucion, excluirAlquilerId
const SOLAPA_RANGO = `
  a.AlquilerEstado NOT IN ('Devuelto', 'Cancelado')
  AND a.AlquilerFechaEntrega IS NOT NULL
  AND a.AlquilerFechaDevolucion IS NOT NULL
  AND DATE(?) <= DATE(a.AlquilerFechaDevolucion)
  AND DATE(?) >= DATE(a.AlquilerFechaEntrega)
  AND a.AlquilerId <> ?`;

// Bloquea los productos y verifica que haya stock libre para cada prenda en el
// rango de fechas; si falta, lanza StockError (y la transacción hace rollback).
//
// - Dos alquileres simultáneos de la misma prenda quedan en fila: el segundo
//   espera el bloqueo del primero y, al validar, ya ve sus prendas.
// - El conteo va en una consulta aparte del bloqueo: en PostgreSQL una
//   consulta que esperó un bloqueo usa la foto de antes de esperar y no vería
//   lo que el otro acaba de confirmar.
// - Todo usa la conexión de la transacción: si validara por el pool general,
//   con muchas transacciones esperando el bloqueo el pool podría agotarse y la
//   que lo tiene no conseguiría conexión para terminar.
// - Los ids se bloquean en orden para que dos transacciones con los mismos
//   productos no se traben entre sí.
//
// excluirAlquilerId: al editar, las prendas del propio alquiler no cuentan
async function bloquearYValidarStock(
  client,
  prendas,
  fechaEntrega,
  fechaDevolucion,
  excluirAlquilerId = null
) {
  // Cada prenda del array es 1 unidad
  const solicitadas = new Map();
  for (const prenda of prendas) {
    const id = Number(prenda.ProductoId);
    if (id) solicitadas.set(id, (solicitadas.get(id) || 0) + 1);
  }
  const ids = [...solicitadas.keys()].sort((a, b) => a - b);
  if (ids.length === 0) return;

  const excluir = excluirAlquilerId || 0;
  await client.q(
    "SELECT ProductoId FROM producto WHERE ProductoId = ANY(?) ORDER BY ProductoId FOR UPDATE",
    [ids]
  );

  const { rows: productos } = await client.q(
    `SELECT
      p.ProductoId,
      p.ProductoCodigo,
      p.ProductoNombre,
      p.ProductoStock,
      p.ProductoImagen,
      (SELECT COUNT(*) FROM alquilerprendas ap
        INNER JOIN alquiler a ON ap.AlquilerId = a.AlquilerId
        WHERE ap.ProductoId = p.ProductoId AND ${SOLAPA_RANGO}) AS Alquiladas
    FROM producto p
    WHERE p.ProductoId = ANY(?)`,
    [fechaEntrega, fechaDevolucion, excluir, ids]
  );

  const prendasNoDisponibles = [];
  for (const producto of productos) {
    const cantidadSolicitada = solicitadas.get(producto.ProductoId);
    const stockDisponible = Number(producto.ProductoStock) || 0;
    const prendasAlquiladas = Number(producto.Alquiladas) || 0;
    const stockRealDisponible = stockDisponible - prendasAlquiladas;
    if (cantidadSolicitada <= stockRealDisponible) continue;

    // Alquileres con los que choca, para el detalle del aviso
    const { rows: conflictos } = await client.q(
      `SELECT DISTINCT a.AlquilerId, a.AlquilerFechaEntrega, a.AlquilerFechaDevolucion
      FROM alquilerprendas ap
      INNER JOIN alquiler a ON ap.AlquilerId = a.AlquilerId
      WHERE ap.ProductoId = ? AND ${SOLAPA_RANGO}
      ORDER BY a.AlquilerFechaEntrega`,
      [producto.ProductoId, fechaEntrega, fechaDevolucion, excluir]
    );

    prendasNoDisponibles.push({
      ProductoId: producto.ProductoId,
      ProductoNombre: `${producto.ProductoCodigo || ""} - ${
        producto.ProductoNombre || "Producto"
      }`,
      ProductoCodigo: producto.ProductoCodigo || "",
      ProductoImagen:
        producto.ProductoImagen && producto.ProductoImagen.length
          ? producto.ProductoImagen.toString("base64")
          : null,
      cantidadSolicitada,
      stockDisponible,
      prendasAlquiladas,
      stockRealDisponible,
      conflictos: conflictos.map((c) => ({
        AlquilerId: c.AlquilerId,
        AlquilerFechaEntrega: c.AlquilerFechaEntrega,
        AlquilerFechaDevolucion: c.AlquilerFechaDevolucion,
        FechaEntregaFormateada: formatearFecha(c.AlquilerFechaEntrega),
        FechaDevolucionFormateada: formatearFecha(c.AlquilerFechaDevolucion),
      })),
    });
  }

  if (prendasNoDisponibles.length > 0) {
    throw new StockError({
      success: false,
      message:
        "No hay suficiente stock disponible para una o más prendas en el rango de fechas seleccionado",
      prendasNoDisponibles,
      detalles: prendasNoDisponibles.map(
        (p) =>
          `${p.ProductoNombre}: Se solicitaron ${p.cantidadSolicitada} prenda(s), pero solo hay ${p.stockRealDisponible} disponible(s) (Stock: ${p.stockDisponible}` +
          (p.prendasAlquiladas ? `, Alquiladas: ${p.prendasAlquiladas})` : ")")
      ),
    });
  }
}

// Monto válido: número finito y no negativo. undefined/null = "no se envió"
const montoInvalido = (v) =>
  v !== undefined && v !== null && !(Number.isFinite(Number(v)) && Number(v) >= 0);

// Valida los montos de un alquiler antes de guardarlo. `actual` son los valores
// guardados (al editar), para comparar descuento y total aunque uno no venga.
// Devuelve el mensaje de error o null
function validarMontos(data, actual = {}) {
  for (const campo of ["AlquilerTotal", "AlquilerEntrega", "AlquilerDescuento"]) {
    if (montoInvalido(data[campo])) {
      return `${campo} debe ser un número mayor o igual a 0`;
    }
  }
  if (data.pagos) {
    for (const [medio, monto] of Object.entries(data.pagos)) {
      if (montoInvalido(monto)) return `El pago "${medio}" no es un monto válido`;
    }
  }
  if (Array.isArray(data.prendas)) {
    const i = data.prendas.findIndex(
      (p) => montoInvalido(p.AlquilerPrendasPrecio) || !Number(p.ProductoId)
    );
    if (i >= 0) return `La prenda ${i + 1} tiene producto o precio inválido`;
  }
  const total = Number(data.AlquilerTotal ?? actual.AlquilerTotal ?? 0);
  const descuento = Number(
    data.AlquilerDescuento ?? data.pagos?.voucher ?? actual.AlquilerDescuento ?? 0
  );
  if (descuento > total) {
    return "El descuento no puede ser mayor que el total del alquiler";
  }
  return null;
}

// Lo que cubre del alquiler un cobro: importes BASE. El recargo de tarjeta
// (3% / 5%) entra a caja pero no reduce la deuda. El voucher va aparte, como
// descuento
const entregaDePagos = (pagos) =>
  ["efectivo", "transferencia", "tarjetaDebito", "tarjetaCredito"].reduce(
    (sum, medio) => sum + (Number(pagos[medio]) || 0),
    0
  );

// TipoGastoId = 2 (ingresos). Grupos: 1 VENTA (efectivo), 6 TRANSFER, 4 VENTA POS
const TIPO_GASTO_INGRESO = 2;

// Movimientos de caja de un cobro al crear el alquiler. El voucher no se
// registra: es un descuento, no un ingreso. MontoAplicado es lo que el
// movimiento descuenta del saldo (sin el recargo de tarjeta)
function movimientosDePago(pagos, alquilerId) {
  const movs = [];
  const agregar = (base, recargo, grupo, medio) => {
    const monto = Number(base) || 0;
    if (monto > 0) {
      movs.push({
        TipoGastoGrupoId: grupo,
        RegistroDiarioCajaDetalle: `Alquiler #${alquilerId} - ${medio}`,
        RegistroDiarioCajaMonto: Math.round(monto * recargo),
        MontoAplicado: Math.round(monto),
      });
    }
  };
  agregar(pagos.efectivo, 1, 1, "Efectivo");
  agregar(pagos.transferencia, 1, 6, "Transferencia");
  agregar(pagos.tarjetaDebito, 1.03, 4, "Tarjeta Débito (3% adicional)");
  agregar(pagos.tarjetaCredito, 1.05, 4, "Tarjeta Crédito (5% adicional)");
  return movs;
}

// Mismo insert que RegistroDiarioCaja.create, pero dentro de la transacción.
// Devuelve el RegistroDiarioCajaId
async function insertarRegistroCaja(client, data) {
  const { rows } = await client.q(
    `INSERT INTO registrodiariocaja (
      CajaId,
      RegistroDiarioCajaFecha,
      TipoGastoId,
      TipoGastoGrupoId,
      RegistroDiarioCajaDetalle,
      RegistroDiarioCajaMonto,
      UsuarioId
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING RegistroDiarioCajaId`,
    [
      data.CajaId,
      data.RegistroDiarioCajaFecha || new Date(),
      TIPO_GASTO_INGRESO,
      data.TipoGastoGrupoId,
      // La columna es varchar(50)
      String(data.RegistroDiarioCajaDetalle || "").slice(0, 50),
      data.RegistroDiarioCajaMonto,
      data.UsuarioId,
    ]
  );
  return rows[0].RegistroDiarioCajaId;
}

// Deja registrado cuánto de un cobro se aplicó a un alquiler (ver la migración
// de alquilerpago). fecha: "YYYY-MM-DD" o null para hoy.
// tipo "AJUSTE": corrección manual de lo entregado; puede ser negativa
function insertarPagoAlquiler(
  client,
  { alquilerId, registroId, fecha, monto, tipo = "PAGO" }
) {
  const importe = Math.round(Number(monto) || 0);
  if (tipo === "PAGO" ? importe <= 0 : importe === 0) return null;
  return client.q(
    `INSERT INTO alquilerpago (
      AlquilerId,
      RegistroDiarioCajaId,
      AlquilerPagoFecha,
      AlquilerPagoMonto,
      AlquilerPagoTipo
    ) VALUES (?, ?, COALESCE(?::date, CURRENT_DATE), ?, ?)`,
    [alquilerId, registroId || null, fecha || null, importe, tipo]
  );
}

// Actualiza la cabecera del alquiler dentro de una transacción. Estado, total,
// entrega y descuento que no vienen se conservan. Si la entrega cambia a mano
// (formulario de /alquileres), la diferencia queda como AJUSTE en alquilerpago,
// así los pagos del alquiler siguen sumando lo entregado.
// Devuelve false si el alquiler no existe
async function actualizarCabecera(client, id, data) {
  const { rows } = await client.q(
    "SELECT AlquilerEntrega FROM alquiler WHERE AlquilerId = ? FOR UPDATE",
    [id]
  );
  if (rows.length === 0) return false;

  await client.q(
    `UPDATE alquiler SET
      ClienteId = COALESCE(?, ClienteId),
      AlquilerFechaAlquiler = COALESCE(?, AlquilerFechaAlquiler),
      AlquilerFechaEntrega = ?,
      AlquilerFechaDevolucion = ?,
      AlquilerEstado = COALESCE(?, AlquilerEstado),
      AlquilerTotal = COALESCE(?, AlquilerTotal),
      AlquilerEntrega = COALESCE(?, AlquilerEntrega),
      AlquilerDescuento = COALESCE(?, AlquilerDescuento)
      WHERE AlquilerId = ?`,
    [
      data.ClienteId ?? null,
      data.AlquilerFechaAlquiler || null,
      data.AlquilerFechaEntrega || null,
      data.AlquilerFechaDevolucion || null,
      data.AlquilerEstado ?? null,
      data.AlquilerTotal ?? null,
      data.AlquilerEntrega ?? null,
      data.AlquilerDescuento ?? null,
      id,
    ]
  );

  if (data.AlquilerEntrega !== undefined && data.AlquilerEntrega !== null) {
    await insertarPagoAlquiler(client, {
      alquilerId: id,
      monto: Number(data.AlquilerEntrega) - Number(rows[0].AlquilerEntrega),
      tipo: "AJUSTE",
    });
  }
  return true;
}

// Inserta las prendas numerándolas 1..n (una fila por unidad)
async function insertarPrendas(client, alquilerId, prendas) {
  if (!Array.isArray(prendas)) return;
  for (const [index, prenda] of prendas.entries()) {
    await client.q(
      `INSERT INTO alquilerprendas (
        AlquilerId,
        AlquilerPrendasId,
        ProductoId,
        AlquilerPrendasPrecio,
        AlquilerPrendasObservacion
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        alquilerId,
        index + 1,
        prenda.ProductoId,
        prenda.AlquilerPrendasPrecio || 0,
        prenda.AlquilerPrendasObservacion || "",
      ]
    );
  }
}

// getAllAlquileres
exports.getAllAlquileres = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "AlquilerId";
    const sortOrder = req.query.sortOrder || "ASC";
    const { alquileres, total } = await Alquiler.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: alquileres,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// searchAlquileres
exports.searchAlquileres = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "AlquilerId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { alquileres, total } = await Alquiler.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: alquileres,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// getAlquilerById
exports.getAlquilerById = async (req, res) => {
  try {
    const alquiler = await Alquiler.getById(req.params.id);
    if (!alquiler) {
      return res.status(404).json({ message: "Alquiler no encontrado" });
    }
    // Obtener las prendas del alquiler
    const prendas = await AlquilerPrendas.getByAlquilerId(req.params.id);
    res.json({
      ...alquiler,
      prendas: prendas || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createAlquiler
exports.createAlquiler = async (req, res) => {
  try {
    const camposRequeridos = ["ClienteId", "AlquilerFechaAlquiler"];
    for (const campo of camposRequeridos) {
      if (
        req.body[campo] === undefined ||
        req.body[campo] === null ||
        (typeof req.body[campo] === "string" && req.body[campo].trim() === "")
      ) {
        return res.status(400).json({
          success: false,
          message: `El campo ${campo} es requerido`,
        });
      }
    }

    const errorMontos = validarMontos(req.body);
    if (errorMontos) {
      return res.status(400).json({ success: false, message: errorMontos });
    }

    // Validar que se proporcionen fechas de entrega y devolución si se van a crear prendas
    if (
      req.body.prendas &&
      Array.isArray(req.body.prendas) &&
      req.body.prendas.length > 0
    ) {
      if (!req.body.AlquilerFechaEntrega || !req.body.AlquilerFechaDevolucion) {
        return res.status(400).json({
          success: false,
          message:
            "Las fechas de entrega y devolución son requeridas para alquilar prendas",
        });
      }
    }

    // Stock, cabecera, prendas y movimientos de caja van en una sola
    // transacción: si falla el registro en caja no queda un alquiler con una
    // entrega que la caja no refleja
    const nuevoAlquilerId = await withTransaction(async (client) => {
      if (Array.isArray(req.body.prendas) && req.body.prendas.length > 0) {
        await bloquearYValidarStock(
          client,
          req.body.prendas,
          req.body.AlquilerFechaEntrega,
          req.body.AlquilerFechaDevolucion
        );
      }

      const { rows } = await client.q(
        `INSERT INTO alquiler (
          ClienteId,
          AlquilerFechaAlquiler,
          AlquilerFechaEntrega,
          AlquilerFechaDevolucion,
          AlquilerEstado,
          AlquilerTotal,
          AlquilerEntrega,
          AlquilerDescuento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING AlquilerId`,
        [
          req.body.ClienteId,
          req.body.AlquilerFechaAlquiler,
          req.body.AlquilerFechaEntrega || null,
          req.body.AlquilerFechaDevolucion || null,
          req.body.AlquilerEstado || "Pendiente",
          req.body.AlquilerTotal || 0,
          // Con desglose de pagos, la entrega se calcula acá y no se toma la
          // que manda el cliente (que llegó a incluir el recargo de tarjeta)
          req.body.pagos
            ? Math.round(entregaDePagos(req.body.pagos))
            : req.body.AlquilerEntrega || 0,
          // El voucher es un descuento: no entra a caja pero reduce el saldo
          req.body.AlquilerDescuento ?? req.body.pagos?.voucher ?? 0,
        ]
      );
      const alquilerId = rows[0].AlquilerId;

      await insertarPrendas(client, alquilerId, req.body.prendas);

      // Cada medio de pago: su movimiento de caja (si hay caja) y lo aplicado
      // al alquiler. Sin caja el pago igual queda registrado, sin movimiento
      const { pagos, CajaId, UsuarioId } = req.body;
      if (pagos) {
        const conCaja = Boolean(CajaId && UsuarioId);
        const fecha = new Date();
        for (const { MontoAplicado, ...mov } of movimientosDePago(
          pagos,
          alquilerId
        )) {
          const registroId = conCaja
            ? await insertarRegistroCaja(client, {
                CajaId,
                UsuarioId,
                RegistroDiarioCajaFecha: fecha,
                ...mov,
              })
            : null;
          await insertarPagoAlquiler(client, {
            alquilerId,
            registroId,
            monto: MontoAplicado,
          });
        }
      }
      return alquilerId;
    });

    const nuevoAlquiler = await Alquiler.getById(nuevoAlquilerId);

    res.status(201).json({
      success: true,
      data: nuevoAlquiler,
      message: "Alquiler creado exitosamente",
    });
  } catch (error) {
    if (error instanceof StockError) {
      return res.status(400).json(error.body);
    }
    res.status(500).json({
      success: false,
      message: "Error al crear alquiler",
      error: error.message,
    });
  }
};

// updateAlquiler
exports.updateAlquiler = async (req, res) => {
  try {
    const { id } = req.params;
    const alquilerData = req.body;
    const prendas = Array.isArray(alquilerData.prendas)
      ? alquilerData.prendas
      : null;

    const existente = await Alquiler.getById(id);
    if (!existente) {
      return res.status(404).json({
        success: false,
        message: "Alquiler no encontrado",
      });
    }

    const errorMontos = validarMontos(alquilerData, existente);
    if (errorMontos) {
      return res.status(400).json({ success: false, message: errorMontos });
    }

    // Sin prendas: solo se actualiza la cabecera (p.ej. cambio de estado)
    if (!prendas) {
      const existe = await withTransaction((client) =>
        actualizarCabecera(client, id, alquilerData)
      );
      if (!existe) {
        return res.status(404).json({
          success: false,
          message: "Alquiler no encontrado",
        });
      }
      return res.json({
        success: true,
        data: await Alquiler.getById(id),
        message: "Alquiler actualizado exitosamente",
      });
    }

    // Las prendas agregadas o cambiadas tienen que estar libres en las fechas
    // del alquiler; las que ya tenía este mismo alquiler no cuentan como ocupadas
    const estadoActivo = !["Devuelto", "Cancelado"].includes(
      alquilerData.AlquilerEstado ?? existente.AlquilerEstado
    );

    // Cabecera y detalle se reemplazan juntos: si algo falla no queda el
    // alquiler sin prendas. Estado, entrega y descuento solo cambian si se
    // envían: así editar prendas no pisa un pago hecho mientras tanto
    await withTransaction(async (client) => {
      if (
        estadoActivo &&
        prendas.length > 0 &&
        alquilerData.AlquilerFechaEntrega &&
        alquilerData.AlquilerFechaDevolucion
      ) {
        await bloquearYValidarStock(
          client,
          prendas,
          alquilerData.AlquilerFechaEntrega,
          alquilerData.AlquilerFechaDevolucion,
          Number(id)
        );
      }

      await actualizarCabecera(client, id, alquilerData);
      await client.q("DELETE FROM alquilerprendas WHERE AlquilerId = ?", [id]);
      await insertarPrendas(client, id, prendas);
    });

    const updatedAlquiler = await Alquiler.getById(id);
    res.json({
      success: true,
      data: updatedAlquiler,
      message: "Alquiler actualizado exitosamente",
    });
  } catch (error) {
    if (error instanceof StockError) {
      return res.status(400).json(error.body);
    }
    res.status(500).json({
      success: false,
      message: "Error al actualizar alquiler",
      error: error.message,
    });
  }
};

// PATCH /:id/estado — cambia solo el estado. No reenvía total ni entrega,
// así no pisa pagos o ediciones hechas desde otra pantalla
const ESTADOS_ALQUILER = ["Pendiente", "Entregado", "Devuelto", "Cancelado"];
exports.updateEstadoAlquiler = async (req, res) => {
  try {
    const { id } = req.params;
    const { AlquilerEstado } = req.body;
    if (!ESTADOS_ALQUILER.includes(AlquilerEstado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Valores permitidos: ${ESTADOS_ALQUILER.join(", ")}`,
      });
    }
    const alquiler = await Alquiler.updateEstado(id, AlquilerEstado);
    if (!alquiler) {
      return res.status(404).json({
        success: false,
        message: "Alquiler no encontrado",
      });
    }
    res.json({
      success: true,
      data: alquiler,
      message: "Estado del alquiler actualizado",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar el estado del alquiler",
      error: error.message,
    });
  }
};

// deleteAlquiler
exports.deleteAlquiler = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Alquiler.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Alquiler no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Alquiler eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar alquiler",
      error: error.message,
    });
  }
};

// Obtener alquileres pendientes por cliente
exports.getAlquileresPendientesPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { localId } = req.query;

    if (!clienteId) {
      return res.status(400).json({
        success: false,
        message: "El ID del cliente es requerido",
      });
    }

    const alquileres = await Alquiler.getAlquileresPendientesPorCliente(
      clienteId,
      localId
    );
    res.json({
      success: true,
      data: alquileres,
    });
  } catch (error) {
    console.error("Error al obtener alquileres pendientes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener alquileres pendientes",
      error: error.message,
    });
  }
};

// Obtener deudas pendientes agrupadas por cliente
exports.getDeudasPendientesPorCliente = async (req, res) => {
  try {
    const deudas = await Alquiler.getDeudasPendientesPorCliente();
    res.json({ success: true, data: deudas });
  } catch (error) {
    console.error("Error al obtener deudas pendientes por cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener deudas pendientes por cliente",
      error: error.message,
    });
  }
};

const MAX_DIAS_RANGO = 90;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Lee ?desde=&hasta= (YYYY-MM-DD) o ?dias= de la query.
// Devuelve { rango } o { error } con el mensaje para el 400.
function leerRangoFechas(query) {
  const { desde, hasta } = query;
  if (desde || hasta) {
    if (!FECHA_ISO.test(desde || "") || !FECHA_ISO.test(hasta || "")) {
      return { error: "Las fechas deben tener formato YYYY-MM-DD" };
    }
    const inicio = new Date(`${desde}T00:00:00Z`);
    const fin = new Date(`${hasta}T00:00:00Z`);
    if (isNaN(inicio) || isNaN(fin)) {
      return { error: "Fechas inválidas" };
    }
    if (inicio > fin) {
      return { error: "La fecha desde no puede ser mayor que la fecha hasta" };
    }
    if ((fin - inicio) / 86400000 > MAX_DIAS_RANGO) {
      return { error: `El rango no puede superar los ${MAX_DIAS_RANGO} días` };
    }
    return { rango: { desde, hasta } };
  }

  const dias = parseInt(query.dias) || 7;
  if (dias < 1 || dias > MAX_DIAS_RANGO) {
    return { error: `Los días deben estar entre 1 y ${MAX_DIAS_RANGO}` };
  }
  return { rango: { dias } };
}

// Agrega a cada alquiler su lista de prendas (una sola consulta)
async function adjuntarPrendas(alquileres) {
  const prendas = await AlquilerPrendas.getByAlquilerIds(
    alquileres.map((a) => a.AlquilerId)
  );
  const porAlquiler = {};
  for (const prenda of prendas) {
    (porAlquiler[prenda.AlquilerId] ||= []).push(prenda);
  }
  return alquileres.map((alquiler) => ({
    ...alquiler,
    prendas: porAlquiler[alquiler.AlquilerId] || [],
  }));
}

// Obtener alquileres próximos a fecha de entrega
exports.getAlquileresProximosEntrega = async (req, res) => {
  const { rango, error } = leerRangoFechas(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }
  try {
    const alquileres = await Alquiler.getAlquileresProximosEntrega(rango);
    res.json({
      success: true,
      data: await adjuntarPrendas(alquileres),
    });
  } catch (error) {
    console.error("Error al obtener alquileres próximos a entrega:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener alquileres próximos a entrega",
      error: error.message,
    });
  }
};

// Obtener alquileres próximos a fecha de devolución
exports.getAlquileresProximosDevolucion = async (req, res) => {
  const { rango, error } = leerRangoFechas(req.query);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }
  try {
    const alquileres = await Alquiler.getAlquileresProximosDevolucion(rango);
    res.json({
      success: true,
      data: await adjuntarPrendas(alquileres),
    });
  } catch (error) {
    console.error("Error al obtener alquileres próximos a devolución:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener alquileres próximos a devolución",
      error: error.message,
    });
  }
};

// Obtener reporte de alquileres por cliente (o todos) y rango de fechas
exports.getReporteAlquileresPorCliente = async (req, res) => {
  try {
    const { clienteId, fechaDesde, fechaHasta } = req.query;

    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({
        success: false,
        message: "Las fechas desde y hasta son requeridas",
      });
    }

    const esTodos =
      !clienteId ||
      clienteId === "" ||
      String(clienteId).toLowerCase() === "todos";

    const reporte = esTodos
      ? await Alquiler.getReporteAlquileresTodos(fechaDesde, fechaHasta)
      : await Alquiler.getReporteAlquileresPorCliente(
          clienteId,
          fechaDesde,
          fechaHasta
        );

    res.json({
      success: true,
      data: reporte,
    });
  } catch (error) {
    console.error("Error al obtener reporte de alquileres:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener reporte de alquileres",
      error: error.message,
    });
  }
};

// Procesar pago de alquileres (distribuir desde el más antiguo)
exports.procesarPagoAlquileres = async (req, res) => {
  try {
    const { clienteId, montoPago, tipoPago, fecha, cajaId, usuarioId } =
      req.body;

    if (!clienteId || !(Number(montoPago) > 0)) {
      return res.status(400).json({
        success: false,
        message: "ClienteId y un montoPago mayor a 0 son requeridos",
      });
    }
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({
        success: false,
        message: "La fecha debe tener el formato YYYY-MM-DD",
      });
    }

    const monto = Number(montoPago);

    // Todo en una transacción y con las filas bloqueadas: dos cobros simultáneos
    // del mismo cliente no pueden aplicar el mismo saldo, y si falla el
    // registro en caja no queda una entrega que la caja no refleja
    const resultado = await withTransaction(async (client) => {
      const { rows: pendientes } = await client.q(
        `SELECT AlquilerId, AlquilerTotal, AlquilerEntrega, AlquilerDescuento
        FROM alquiler
        WHERE ClienteId = ?
          AND AlquilerEstado <> 'Cancelado'
          AND (AlquilerTotal - AlquilerEntrega - AlquilerDescuento) > 0
        ORDER BY AlquilerFechaAlquiler ASC, AlquilerId ASC
        FOR UPDATE`,
        [clienteId]
      );

      if (pendientes.length === 0) {
        return { error: "No hay alquileres pendientes para este cliente" };
      }

      const saldoDe = (a) =>
        Number(a.AlquilerTotal) -
        Number(a.AlquilerEntrega) -
        Number(a.AlquilerDescuento);
      const totalDeuda = pendientes.reduce((sum, a) => sum + saldoDe(a), 0);
      if (monto > totalDeuda) {
        return { error: "El monto a pagar no puede ser mayor al saldo total" };
      }

      // Distribuir el pago desde el más antiguo. El estado no se toca: estar
      // pagado no significa que la prenda se haya entregado
      let montoRestante = monto;
      const actualizaciones = [];
      for (const alquiler of pendientes) {
        if (montoRestante <= 0) break;
        const montoAAplicar = Math.min(montoRestante, saldoDe(alquiler));
        const nuevaEntrega = Number(alquiler.AlquilerEntrega) + montoAAplicar;
        await client.q(
          "UPDATE alquiler SET AlquilerEntrega = ? WHERE AlquilerId = ?",
          [nuevaEntrega, alquiler.AlquilerId]
        );
        actualizaciones.push({
          AlquilerId: alquiler.AlquilerId,
          montoAplicado: montoAAplicar,
          nuevaEntrega,
        });
        montoRestante -= montoAAplicar;
      }

      let registroId = null;
      if (cajaId && usuarioId) {
        // Tipo de pago -> grupo: EF 1 VENTA, TR 6 TRANSFER, PO 4 VENTA POS
        const grupos = { TR: 6, PO: 4 };
        const numerosAlquiler = actualizaciones
          .map((act) => `#${act.AlquilerId}`)
          .join(", ");
        registroId = await insertarRegistroCaja(client, {
          CajaId: cajaId,
          UsuarioId: usuarioId,
          RegistroDiarioCajaFecha: fecha
            ? new Date(fecha + "T00:00:00")
            : new Date(),
          TipoGastoGrupoId: grupos[tipoPago] || 1,
          RegistroDiarioCajaDetalle: `Pago de alquileres ${numerosAlquiler} - Cliente ${clienteId} - ${tipoPago}`,
          RegistroDiarioCajaMonto: monto,
        });
      }

      // Lo aplicado a cada alquiler: con esto el reporte muestra la parte
      // de cada uno y no el cobro completo repetido
      for (const act of actualizaciones) {
        await insertarPagoAlquiler(client, {
          alquilerId: act.AlquilerId,
          registroId,
          fecha,
          monto: act.montoAplicado,
        });
      }

      return { actualizaciones };
    });

    if (resultado.error) {
      return res.status(400).json({
        success: false,
        message: resultado.error,
      });
    }
    const { actualizaciones } = resultado;

    res.json({
      success: true,
      message: "Pago procesado exitosamente",
      data: {
        montoPagado: monto,
        actualizaciones,
      },
    });
  } catch (error) {
    console.error("Error al procesar pago de alquileres:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar el pago",
      error: error.message,
    });
  }
};

// Solo para los tests (test/): funciones internas
exports._internos = {
  validarMontos,
  entregaDePagos,
  movimientosDePago,
  bloquearYValidarStock,
  StockError,
};
