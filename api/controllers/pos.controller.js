/**
 * Controlador POS: reemplaza los webservices SOAP de GeneXus.
 *
 *   PVentaConfirmarWS        -> confirmarVenta          (POST /api/pos/venta)
 *   PCreditoWS               -> cobrarCredito           (POST /api/pos/credito)
 *   PBorrarRegistoDiarioWS   -> borrarRegistroDiario    (POST /api/pos/borrar-registro-diario)
 *
 * Todo corre dentro de una transacción: si algo falla, no queda una venta a
 * medias ni un movimiento de caja huérfano.
 *
 * Comportamiento replicado del GeneXus original (verificado contra la base):
 *  - El stock se descuenta de producto.ProductoStock. La tabla productoalmacen
 *    no se usa en esta instalación (siempre estuvo vacía).
 *  - caja.CajaMonto se ajusta con cada movimiento, igual que hace
 *    registrodiariocaja.controller.js en la apertura/cierre.
 *  - Los textos de RegistroDiarioCajaDetalle respetan el formato histórico
 *    ("Venta N°: 12"), para no romper los reportes ni los 1895 registros
 *    que ya existen.
 */
const { withTransaction } = require("../config/db");

// tipogasto: 1 = EGRESOS, 2 = INGRESOS
const INGRESO = 2;

// tipogastogrupo de esta base (verificados en la tabla, no asumidos)
const GRUPO_VENTA = 1; // (2,1) VENTA
const GRUPO_VENTA_CREDITO = 3; // (2,3) VENTA CRÉDITO
const GRUPO_VENTA_POS = 4; // (2,4) VENTA POS
const GRUPO_VOUCHER = 5; // (2,5) VOUCHER
const GRUPO_TRANSFER = 6; // (2,6) TRANSFER

/**
 * Medios de pago de una venta. El orden define el orden de los movimientos.
 * `cuentaCliente` no figura acá: no mueve caja, queda como saldo del cliente.
 */
const MEDIOS_VENTA = [
  { campo: "efectivo", grupo: GRUPO_VENTA, detalle: (id) => `Venta N°: ${id}` },
  { campo: "pos", grupo: GRUPO_VENTA_POS, detalle: (id) => `Venta POS N°: ${id}` },
  { campo: "transferencia", grupo: GRUPO_TRANSFER, detalle: (id) => `Venta Transferencia N°: ${id}` },
  { campo: "voucher", grupo: GRUPO_VOUCHER, detalle: (id) => `Venta Voucher N°: ${id}` },
];

// En una venta a crédito el efectivo entregado en el momento no va al grupo
// VENTA sino a VENTA CRÉDITO, con otro texto. Verificado contra GeneXus.
const MEDIO_VENTA_CREDITO = {
  campo: "efectivo",
  grupo: GRUPO_VENTA_CREDITO,
  detalle: (id) => `Venta Crédito N°: ${id}`,
};

/**
 * Medios de cobro de crédito, por el codigo que manda el selector de la pantalla
 * (CO contado, CR credito, PO tarjeta, TR transferencia). Los textos siguen el
 * formato historico de GeneXus: "Cobro Credito Efectivo N°: 12".
 */
const MEDIOS_CREDITO = {
  CO: { grupo: GRUPO_VENTA_CREDITO, etiqueta: "Efectivo" },
  CR: { grupo: GRUPO_VENTA_CREDITO, etiqueta: "Efectivo" },
  PO: { grupo: GRUPO_VENTA_POS, etiqueta: "POS" },
  TR: { grupo: GRUPO_TRANSFER, etiqueta: "Transfer" },
};

function error(mensaje, status) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

/**
 * Responde al cliente sin filtrar detalles del motor de base de datos
 * (los mensajes de PostgreSQL nombran tablas, columnas y constraints).
 * El detalle completo queda en el log del servidor.
 */
function responderError(res, err, contexto) {
  console.error(`Error en ${contexto}:`, err.message, err.query ? `
SQL: ${err.query}` : "");

  if (err.status) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  // 23503 = violacion de clave foranea, 23505 = clave duplicada
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Hay un dato relacionado que no existe (cliente, almacén, caja o producto). Verificá la selección.",
    });
  }
  if (err.code === "23505") {
    return res.status(409).json({ success: false, message: "El registro ya existe." });
  }
  return res.status(500).json({
    success: false,
    message: "No se pudo completar la operación. Reintentá; si persiste, avisá al administrador.",
  });
}

/**
 * Inserta el movimiento de caja y ajusta el saldo de la caja.
 * `tipoGastoId` INGRESO suma, EGRESO resta.
 */
async function registrarCaja(client, { cajaId, fecha, tipoGastoId, grupoId, detalle, monto, usuarioId, ventaId }) {
  const importe = Math.round(Number(monto));
  await client.q(
    `INSERT INTO registrodiariocaja
       (CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
        RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId, VentaId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [cajaId, fecha, tipoGastoId, grupoId, String(detalle).slice(0, 50), importe, usuarioId, ventaId ?? null]
  );
  const signo = tipoGastoId === INGRESO ? 1 : -1;
  await client.q(`UPDATE caja SET CajaMonto = CajaMonto + ? WHERE CajaId = ?`, [signo * importe, cajaId]);
}

/** Ajusta producto.ProductoStock. `delta` negativo descuenta. */
async function ajustarStock(client, productoId, delta) {
  await client.q(`UPDATE producto SET ProductoStock = ProductoStock + ? WHERE ProductoId = ?`, [
    Math.round(delta),
    productoId,
  ]);
}

function validarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw error("Debe incluir al menos un producto", 400);
  }
}

/**
 * POST /api/pos/venta
 *
 * {
 *   fecha: "YYYY-MM-DD", clienteId, almacenId, cajaId, usuarioId,
 *   ventaTipo: "CO" | "CR", pagoTipo: "E", total,
 *   pagos: { efectivo, pos, transferencia, voucher, cuentaCliente },
 *   items: [{ productoId, cantidad, precio, precioTotal, unidad }]
 * }
 */
exports.confirmarVenta = async (req, res) => {
  try {
    const {
      fecha,
      clienteId,
      almacenId,
      cajaId,
      usuarioId,
      ventaTipo = "CO",
      pagoTipo = "E",
      total,
      pagos = {},
      items,
    } = req.body;

    validarItems(items);
    if (!fecha) throw error("La fecha es requerida", 400);
    if (cajaId === undefined || cajaId === null) throw error("La caja es requerida", 400);

    // Los medios de pago tienen que cubrir el total. Sin este control se podía
    // grabar una venta de 50.000 cobrando 20.000 y la caja quedaba descuadrada
    // sin que nadie se enterara.
    const totalVenta = Math.round(Number(total));
    const sumaPagos =
      MEDIOS_VENTA.reduce((acc, m) => acc + Math.round(Number(pagos[m.campo] || 0)), 0) +
      Math.round(Number(pagos.cuentaCliente || 0));
    if (sumaPagos !== totalVenta) {
      throw error(
        `Los pagos suman ${sumaPagos} y el total es ${totalVenta}. Revisá el desglose.`,
        400
      );
    }
    const aCuenta = Math.round(Number(pagos.cuentaCliente || 0));
    if (aCuenta > 0 && ventaTipo !== "CR") {
      throw error("Una venta con saldo a cuenta del cliente debe ser de tipo CR", 400);
    }
    if (aCuenta === 0 && ventaTipo === "CR") {
      throw error("Una venta de tipo CR requiere un saldo a cuenta del cliente", 400);
    }

    const resultado = await withTransaction(async (client) => {
      // El POS manda como almacén el LocalId del usuario. La convención de esta
      // instalación es que coinciden (verificado sobre 1000 ventas históricas:
      // lavadero/local 2 -> almacén 2, vendedor/local 1 -> almacén 1), pero el
      // local 0 "TODOS" no tiene almacén. Sin esta validación el INSERT moría
      // con un error de clave foránea que no le dice nada al vendedor.
      const alm = await client.q(`SELECT AlmacenId FROM almacen WHERE AlmacenId = ?`, [almacenId]);
      if (!alm.rows.length) {
        throw error(
          `El usuario no tiene un almacén válido asignado (recibido: ${almacenId}). ` +
            `Ingresá con un usuario asignado a un local concreto, o asignale uno a este usuario.`,
          400
        );
      }

      const ins = await client.q(
        `INSERT INTO venta
           (VentaFecha, ClienteId, AlmacenId, VentaTipo, VentaPagoTipo,
            VentaCantidadProductos, VentaUsuario, Total, VentaEntrega)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING "VentaId"`,
        [
          fecha,
          clienteId,
          almacenId,
          ventaTipo,
          pagoTipo,
          items.length,
          usuarioId,
          totalVenta,
          totalVenta - aCuenta,
        ]
      );
      const ventaId = ins.rows[0].VentaId;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const prod = await client.q(`SELECT ProductoPrecioPromedio FROM producto WHERE ProductoId = ?`, [
          it.productoId,
        ]);
        if (!prod.rows.length) throw error(`El producto ${it.productoId} no existe`, 400);
        const promedio = Math.round(prod.rows[0].ProductoPrecioPromedio || 0);

        await client.q(
          `INSERT INTO ventaproducto
             (VentaId, VentaProductoId, ProductoId, VentaProductoPrecioPromedio,
              VentaProductoCantidad, VentaProductoPrecio, VentaProductoPrecioTotal,
              VentaProductoUnitario)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ventaId,
            i + 1,
            it.productoId,
            promedio,
            it.cantidad,
            Math.round(it.precio),
            Math.round(it.precioTotal),
            it.unidad || "N",
          ]
        );
        await ajustarStock(client, it.productoId, -Math.abs(it.cantidad));
      }

      // Venta a crédito: se abre el crédito. Si el cliente entrega algo en el
      // momento, eso queda asentado como el pago nro 1 (igual que GeneXus).
      const anticipo = totalVenta - aCuenta;
      if (ventaTipo === "CR") {
        const cred = await client.q(
          `INSERT INTO ventacredito (VentaId, VentaCreditoPagoCant) VALUES (?, ?)
           RETURNING "VentaCreditoId"`,
          [ventaId, anticipo > 0 ? 1 : 0]
        );
        if (anticipo > 0) {
          await client.q(
            `INSERT INTO ventacreditopago
               (VentaCreditoId, VentaCreditoPagoId, VentaCreditoPagoFecha, VentaCreditoPagoMonto)
             VALUES (?, 1, ?, ?)`,
            [cred.rows[0].VentaCreditoId, fecha, anticipo]
          );
        }
      }

      const medios = ventaTipo === "CR"
        ? [MEDIO_VENTA_CREDITO, ...MEDIOS_VENTA.filter((m) => m.campo !== "efectivo")]
        : MEDIOS_VENTA;

      for (const medio of medios) {
        const monto = Number(pagos[medio.campo] || 0);
        if (monto > 0) {
          await registrarCaja(client, {
            cajaId,
            fecha,
            tipoGastoId: INGRESO,
            grupoId: medio.grupo,
            detalle: medio.detalle(ventaId),
            monto,
            usuarioId,
            ventaId,
          });
        }
      }

      return { ventaId };
    });

    res.status(201).json({ success: true, ...resultado });
  } catch (err) {
    responderError(res, err, "confirmarVenta");
  }
};

/**
 * POST /api/pos/credito
 *
 * Cobra un monto a cuenta de las ventas a crédito pendientes de un cliente,
 * imputándolo de la más antigua a la más nueva.
 *
 * { fecha: "YYYY-MM-DD", clienteId, montoRecibido, cajaId, usuarioId,
 *   ventaPagoTipo: "CO" | "CR" | "PO" | "TR" }
 */
exports.cobrarCredito = async (req, res) => {
  try {
    const { fecha, clienteId, montoRecibido, cajaId, usuarioId, ventaPagoTipo = "CO" } = req.body;

    const monto = Math.round(Number(montoRecibido));
    if (!(monto > 0)) throw error("El monto a cobrar debe ser mayor a cero", 400);
    if (!clienteId) throw error("El cliente es requerido", 400);
    if (!fecha) throw error("La fecha es requerida", 400);
    if (cajaId === undefined || cajaId === null) throw error("La caja es requerida", 400);

    const medio = MEDIOS_CREDITO[String(ventaPagoTipo).toUpperCase()] || MEDIOS_CREDITO.CO;
    const { grupo, etiqueta } = medio;

    const resultado = await withTransaction(async (client) => {
      // Ventas a crédito con saldo, de la más vieja a la más nueva
      const pendientes = await client.q(
        `SELECT VentaId, Total, VentaEntrega, (Total - VentaEntrega) AS Saldo
           FROM venta
          WHERE ClienteId = ? AND VentaTipo = 'CR' AND (Total - VentaEntrega) > 0
          ORDER BY VentaFecha ASC, VentaId ASC
          FOR UPDATE`,
        [clienteId]
      );

      const deuda = pendientes.rows.reduce((acc, v) => acc + Number(v.Saldo), 0);
      if (deuda <= 0) throw error("El cliente no tiene saldo pendiente", 400);
      if (monto > deuda) throw error("El monto supera el saldo pendiente del cliente", 400);

      let restante = monto;
      const imputaciones = [];

      for (const venta of pendientes.rows) {
        if (restante <= 0) break;
        const aplicar = Math.min(restante, Number(venta.Saldo));

        await client.q(`UPDATE venta SET VentaEntrega = VentaEntrega + ? WHERE VentaId = ?`, [
          aplicar,
          venta.VentaId,
        ]);

        // El crédito puede no existir si la venta vino de datos viejos
        let credito = await client.q(`SELECT VentaCreditoId, VentaCreditoPagoCant FROM ventacredito WHERE VentaId = ?`, [
          venta.VentaId,
        ]);
        if (!credito.rows.length) {
          credito = await client.q(
            `INSERT INTO ventacredito (VentaId, VentaCreditoPagoCant) VALUES (?, 0)
             RETURNING "VentaCreditoId", 0 AS "VentaCreditoPagoCant"`,
            [venta.VentaId]
          );
        }
        const { VentaCreditoId, VentaCreditoPagoCant } = credito.rows[0];
        const pagoId = Number(VentaCreditoPagoCant) + 1;

        await client.q(
          `INSERT INTO ventacreditopago
             (VentaCreditoId, VentaCreditoPagoId, VentaCreditoPagoFecha, VentaCreditoPagoMonto)
           VALUES (?, ?, ?, ?)`,
          [VentaCreditoId, pagoId, fecha, aplicar]
        );
        await client.q(`UPDATE ventacredito SET VentaCreditoPagoCant = ? WHERE VentaCreditoId = ?`, [
          pagoId,
          VentaCreditoId,
        ]);

        await registrarCaja(client, {
          cajaId,
          fecha,
          tipoGastoId: INGRESO,
          grupoId: grupo,
          detalle: `Cobro Crédito ${etiqueta} N°: ${venta.VentaId}`,
          monto: aplicar,
          usuarioId,
          ventaId: venta.VentaId,
        });

        imputaciones.push({ ventaId: venta.VentaId, monto: aplicar });
        restante -= aplicar;
      }

      return { imputaciones, cobrado: monto - restante };
    });

    res.status(201).json({ success: true, ...resultado });
  } catch (err) {
    responderError(res, err, "cobrarCredito");
  }
};

/**
 * POST /api/pos/anular-venta
 *
 * Anula una venta por completo y en una sola transacción: repone el stock,
 * devuelve el dinero a la caja, borra los movimientos y el crédito asociado, y
 * elimina la venta.
 *
 * Antes esto eran dos llamadas HTTP (deshacer efectos + DELETE /api/venta/:id).
 * Si la segunda fallaba quedaba una venta con el stock ya repuesto, y repetir
 * la primera reponía el stock otra vez. Ahora es atómico e idempotente: si la
 * venta ya no existe responde 404 sin tocar nada.
 *
 * { id }
 */
exports.anularVenta = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) throw error("El id de la venta es requerido", 400);

    await withTransaction(async (client) => {
      // FOR UPDATE: si entran dos anulaciones de la misma venta a la vez, la
      // segunda espera y encuentra la fila ya borrada.
      const venta = await client.q(
        `SELECT VentaId FROM venta WHERE VentaId = ? FOR UPDATE`,
        [id]
      );
      if (!venta.rows.length) throw error("La venta no existe o ya fue anulada", 404);

      // Reponer el stock de cada producto de la venta
      const productos = await client.q(
        `SELECT ProductoId, VentaProductoCantidad FROM ventaproducto WHERE VentaId = ?`,
        [id]
      );
      for (const vp of productos.rows) {
        await ajustarStock(client, vp.ProductoId, Math.abs(vp.VentaProductoCantidad));
      }

      // Devolver a la caja lo que había ingresado y borrar los movimientos.
      // Se filtra por VentaId, no por el texto del detalle: los movimientos
      // históricos tienen VentaId NULL y quedan intactos aunque su detalle
      // coincida con el de una venta nueva.
      const movimientos = await client.q(
        `SELECT CajaId, TipoGastoId, RegistroDiarioCajaMonto
           FROM registrodiariocaja
          WHERE VentaId = ?`,
        [id]
      );
      for (const mov of movimientos.rows) {
        const signo = mov.TipoGastoId === INGRESO ? -1 : 1;
        await client.q(`UPDATE caja SET CajaMonto = CajaMonto + ? WHERE CajaId = ?`, [
          signo * Number(mov.RegistroDiarioCajaMonto),
          mov.CajaId,
        ]);
      }
      await client.q(`DELETE FROM registrodiariocaja WHERE VentaId = ?`, [id]);

      // Crédito asociado, detalle y cabecera
      await client.q(
        `DELETE FROM ventacreditopago WHERE VentaCreditoId IN
           (SELECT VentaCreditoId FROM ventacredito WHERE VentaId = ?)`,
        [id]
      );
      await client.q(`DELETE FROM ventacredito WHERE VentaId = ?`, [id]);
      await client.q(`DELETE FROM ventaproducto WHERE VentaId = ?`, [id]);
      await client.q(`DELETE FROM venta WHERE VentaId = ?`, [id]);
    });

    res.json({ success: true });
  } catch (err) {
    responderError(res, err, "anularVenta");
  }
};
