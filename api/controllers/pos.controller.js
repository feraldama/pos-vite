/**
 * Controlador POS: reemplaza los webservices GeneXus
 *  - PVentaConfirmarWS  -> confirmarVenta
 *  - PDevolucionWS      -> confirmarDevolucion
 *  - PCompraConfirmarWS -> confirmarCompra
 *  - PInventarioWS      -> actualizarInventario
 *  - PBorrarRegistoDiarioWS -> borrarRegistroDiario
 *
 * Todas las operaciones se ejecutan dentro de una transacción PostgreSQL.
 */
const { withTransaction } = require("../config/db");

// Grupos de registrodiariocaja (tipogasto 1 = EGRESOS, 2 = INGRESOS)
const INGRESO = 2;
const EGRESO = 1;
const GRUPO_VENTA = 1; // (2,1) VENTA
const GRUPO_COMPRA = 1; // (1,1) COMPRA
const GRUPO_COMPRA_CREDITO = 3; // (1,3) COMPRA CRÉDITO
const GRUPO_VENTA_POS = 4; // (2,4) VENTA POS
const GRUPO_DEVOLUCION = 5; // (1,5) DEVOLUCIÓN
const GRUPO_TRANSFER = 6; // (2,6) TRANSFER

async function registrarCaja(client, { cajaId, fecha, tipoGastoId, grupoId, detalle, monto, usuarioId }) {
  await client.q(
    `INSERT INTO registrodiariocaja
      (CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId, RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cajaId, fecha, tipoGastoId, grupoId, String(detalle).slice(0, 50), Math.round(monto), usuarioId]
  );
}

// Si el producto aún no tiene fila en este almacén, crearla con el stock NO
// asignado a otros almacenes (los datos de GeneXus llevaban el stock en
// producto.ProductoStock y muchas veces sin fila en productoalmacen)
async function asegurarFilaAlmacen(client, productoId, almacenId) {
  await client.q(
    `INSERT INTO productoalmacen (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario)
     SELECT p.ProductoId, ?,
            p.ProductoStock - COALESCE((SELECT SUM(pa.ProductoAlmacenStock) FROM productoalmacen pa WHERE pa.ProductoId = p.ProductoId), 0),
            p.ProductoStockUnitario - COALESCE((SELECT SUM(pa.ProductoAlmacenStockUnitario) FROM productoalmacen pa WHERE pa.ProductoId = p.ProductoId), 0)
     FROM producto p WHERE p.ProductoId = ?
     ON CONFLICT ("ProductoId", "AlmacenId") DO NOTHING`,
    [almacenId, productoId]
  );
}

// Recalcular el stock total del producto como la suma de todos los almacenes
async function recalcularStockTotal(client, productoId) {
  await client.q(
    `UPDATE producto SET
       ProductoStock = (SELECT COALESCE(SUM(pa.ProductoAlmacenStock), 0) FROM productoalmacen pa WHERE pa.ProductoId = ?),
       ProductoStockUnitario = (SELECT COALESCE(SUM(pa.ProductoAlmacenStockUnitario), 0) FROM productoalmacen pa WHERE pa.ProductoId = ?)
     WHERE ProductoId = ?`,
    [productoId, productoId, productoId]
  );
}

async function ajustarStock(client, productoId, almacenId, delta) {
  await asegurarFilaAlmacen(client, productoId, almacenId);
  await client.q(
    `UPDATE productoalmacen SET ProductoAlmacenStock = ProductoAlmacenStock + ?
     WHERE ProductoId = ? AND AlmacenId = ?`,
    [delta, productoId, almacenId]
  );
  await recalcularStockTotal(client, productoId);
}

function validarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("Debe incluir al menos un producto");
    err.status = 400;
    throw err;
  }
}

/**
 * POST /api/pos/venta
 * { fecha, clienteId, almacenId, cajaId, usuarioId, ventaTipo, pagoTipo, total, entrega,
 *   pagos: { efectivo, pos, transferencia }, items: [{ productoId, cantidad, precio, precioTotal, unidad }] }
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
      entrega,
      pagos = {},
      items,
    } = req.body;
    validarItems(items);

    const resultado = await withTransaction(async (client) => {
      const ins = await client.q(
        `INSERT INTO venta
          (VentaFecha, ClienteId, AlmacenId, VentaTipo, VentaPagoTipo, VentaCantidadProductos,
           VentaUsuario, VentaNroFactura, VentaTimbrado, Total, VentaEntrega)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?) RETURNING "VentaId"`,
        [
          fecha,
          clienteId,
          almacenId,
          ventaTipo,
          pagoTipo,
          items.length,
          usuarioId,
          Math.round(total),
          Math.round(entrega !== undefined ? entrega : total),
        ]
      );
      const ventaId = ins.rows[0].VentaId;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const prod = await client.q(`SELECT ProductoPrecioPromedio FROM producto WHERE ProductoId = ?`, [
          it.productoId,
        ]);
        const promedio = prod.rows.length ? Math.round(prod.rows[0].ProductoPrecioPromedio || 0) : 0;
        await client.q(
          `INSERT INTO ventaproducto
            (VentaId, VentaProductoId, ProductoId, VentaProductoPrecioPromedio,
             VentaProductoCantidad, VentaProductoPrecio, VentaProductoPrecioTotal, VentaProductoUnitario)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ventaId, i + 1, it.productoId, promedio, it.cantidad, Math.round(it.precio), Math.round(it.precioTotal), it.unidad || "C"]
        );
        await ajustarStock(client, it.productoId, almacenId, -Math.abs(it.cantidad));
      }

      if (ventaTipo === "CR") {
        await client.q(`INSERT INTO ventacredito (VentaId, VentaCreditoPagoCant) VALUES (?, 0)`, [ventaId]);
      }

      const movimientos = [
        { monto: pagos.efectivo, grupo: GRUPO_VENTA, det: "Efectivo" },
        { monto: pagos.pos, grupo: GRUPO_VENTA_POS, det: "POS" },
        { monto: pagos.transferencia, grupo: GRUPO_TRANSFER, det: "Transferencia" },
      ];
      for (const mov of movimientos) {
        if (Number(mov.monto) > 0) {
          await registrarCaja(client, {
            cajaId,
            fecha,
            tipoGastoId: INGRESO,
            grupoId: mov.grupo,
            detalle: `Venta #${ventaId} - ${mov.det}`,
            monto: Number(mov.monto),
            usuarioId,
          });
        }
      }
      return { ventaId };
    });

    res.status(201).json({ success: true, ...resultado });
  } catch (error) {
    console.error("Error en confirmarVenta:", error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/pos/devolucion
 * Mismo cuerpo que /venta. Repone stock y registra el egreso en caja.
 */
exports.confirmarDevolucion = async (req, res) => {
  try {
    const { fecha, clienteId, almacenId, cajaId, usuarioId, total, pagos = {}, items } = req.body;
    validarItems(items);

    const resultado = await withTransaction(async (client) => {
      const ins = await client.q(
        `INSERT INTO venta
          (VentaFecha, ClienteId, AlmacenId, VentaTipo, VentaPagoTipo, VentaCantidadProductos,
           VentaUsuario, VentaNroFactura, VentaTimbrado, Total, VentaEntrega)
         VALUES (?, ?, ?, 'DV', 'E', ?, ?, 0, 0, ?, ?) RETURNING "VentaId"`,
        [fecha, clienteId, almacenId, items.length, usuarioId, Math.round(total), Math.round(total)]
      );
      const ventaId = ins.rows[0].VentaId;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await client.q(
          `INSERT INTO ventaproducto
            (VentaId, VentaProductoId, ProductoId, VentaProductoPrecioPromedio,
             VentaProductoCantidad, VentaProductoPrecio, VentaProductoPrecioTotal, VentaProductoUnitario)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
          [ventaId, i + 1, it.productoId, it.cantidad, Math.round(it.precio), Math.round(it.precioTotal), it.unidad || "C"]
        );
        // La devolución repone stock
        await ajustarStock(client, it.productoId, almacenId, Math.abs(it.cantidad));
      }

      const movimientos = [
        { monto: pagos.efectivo, det: "Efectivo" },
        { monto: pagos.transferencia, det: "Transferencia" },
      ];
      for (const mov of movimientos) {
        if (Number(mov.monto) > 0) {
          await registrarCaja(client, {
            cajaId,
            fecha,
            tipoGastoId: EGRESO,
            grupoId: GRUPO_DEVOLUCION,
            detalle: `Devolución Venta #${ventaId} - ${mov.det}`,
            monto: Number(mov.monto),
            usuarioId,
          });
        }
      }
      return { ventaId };
    });

    res.status(201).json({ success: true, ...resultado });
  } catch (error) {
    console.error("Error en confirmarDevolucion:", error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/pos/compra
 * { fecha, proveedorId, factura, tipo ('CO'|'CR'), entrega, total, usuarioId, cajaId,
 *   items: [{ productoId, cantidad, precio, unidad, almacenId, bonificacion }] }
 */
exports.confirmarCompra = async (req, res) => {
  try {
    const { fecha, proveedorId, factura, tipo = "CO", entrega = 0, total, usuarioId, cajaId, items } = req.body;
    validarItems(items);

    const resultado = await withTransaction(async (client) => {
      const ins = await client.q(
        `INSERT INTO compra
          (CompraFecha, ProveedorId, UsuarioId, CompraFactura, CompraTipo, CompraPagoCompleto,
           CompraCantidadProductos, CompraEntrega)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING "CompraId"`,
        [fecha, proveedorId, usuarioId, factura || 0, tipo, tipo === "CO" ? "S" : "N", items.length, entrega]
      );
      const compraId = ins.rows[0].CompraId;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const cantidad = Number(it.cantidad) + Number(it.bonificacion || 0);
        // El stock se ajusta primero para que exista la fila de productoalmacen (FK de compraproducto)
        await ajustarStock(client, it.productoId, it.almacenId, Math.abs(cantidad));
        await client.q(
          `INSERT INTO compraproducto
            (CompraId, CompraProductoId, ProductoId, CompraProductoCantidad, CompraProductoCantidadUnidad,
             CompraProductoBonificacion, CompraProductoPrecio, AlmacenOrigenId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [compraId, i + 1, it.productoId, it.cantidad, it.unidad || "C", it.bonificacion || 0, it.precio, it.almacenId]
        );
        // Precio promedio ponderado del producto
        await client.q(
          `UPDATE producto SET ProductoPrecioPromedio =
             CASE WHEN ProductoStock <= 0 THEN (?)::numeric
                  ELSE ROUND(((ProductoPrecioPromedio * (ProductoStock - (?)::int)) + ((?)::numeric * (?)::int)) / ProductoStock, 2)
             END
           WHERE ProductoId = ?`,
          [it.precio, cantidad, it.precio, cantidad, it.productoId]
        );
      }

      if (tipo === "CR") {
        await client.q(`INSERT INTO facturacredito (CompraId, FacturaCreditoPagoCant) VALUES (?, 0)`, [compraId]);
        if (Number(entrega) > 0 && cajaId) {
          await registrarCaja(client, {
            cajaId,
            fecha,
            tipoGastoId: EGRESO,
            grupoId: GRUPO_COMPRA_CREDITO,
            detalle: `Compra #${compraId} - Entrega Factura ${factura || ""}`,
            monto: Number(entrega),
            usuarioId,
          });
        }
      } else if (cajaId && Number(total) > 0) {
        await registrarCaja(client, {
          cajaId,
          fecha,
          tipoGastoId: EGRESO,
          grupoId: GRUPO_COMPRA,
          detalle: `Compra #${compraId} - Factura ${factura || ""}`,
          monto: Number(total),
          usuarioId,
        });
      }
      return { compraId };
    });

    res.status(201).json({ success: true, ...resultado });
  } catch (error) {
    console.error("Error en confirmarCompra:", error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/pos/inventario
 * { productoId, almacenId, caja, unidad, tipo ('F' fijar | 'S' sumar) }
 */
exports.actualizarInventario = async (req, res) => {
  try {
    const { productoId, almacenId, caja = 0, unidad = 0, tipo = "F" } = req.body;
    if (!productoId || !almacenId) {
      return res.status(400).json({ success: false, message: "productoId y almacenId son requeridos" });
    }

    await withTransaction(async (client) => {
      if (tipo === "S") {
        await asegurarFilaAlmacen(client, productoId, almacenId);
        await client.q(
          `UPDATE productoalmacen
           SET ProductoAlmacenStock = ProductoAlmacenStock + ?,
               ProductoAlmacenStockUnitario = ProductoAlmacenStockUnitario + ?
           WHERE ProductoId = ? AND AlmacenId = ?`,
          [caja, unidad, productoId, almacenId]
        );
      } else {
        // F = fijar: el valor indicado es el stock absoluto de este almacén
        await client.q(
          `INSERT INTO productoalmacen (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario)
           VALUES (?, ?, ?, ?)
           ON CONFLICT ("ProductoId", "AlmacenId")
           DO UPDATE SET "ProductoAlmacenStock" = ?, "ProductoAlmacenStockUnitario" = ?`,
          [productoId, almacenId, caja, unidad, caja, unidad]
        );
      }
      await recalcularStockTotal(client, productoId);
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error en actualizarInventario:", error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/pos/borrar-registro-diario
 * { id, regla } — regla 1: venta (repone stock), regla 2: compra (descuenta stock y
 * elimina compraproducto/facturacredito). Los registros de caja asociados se eliminan.
 * El borrado de la venta/compra en sí lo hace el endpoint DELETE correspondiente.
 */
exports.borrarRegistroDiario = async (req, res) => {
  try {
    const { id, regla } = req.body;
    if (!id || ![1, 2].includes(Number(regla))) {
      return res.status(400).json({ success: false, message: "id y regla (1=venta, 2=compra) son requeridos" });
    }

    await withTransaction(async (client) => {
      if (Number(regla) === 1) {
        const venta = await client.q(`SELECT * FROM venta WHERE VentaId = ?`, [id]);
        if (!venta.rows.length) {
          const err = new Error("Venta no encontrada");
          err.status = 404;
          throw err;
        }
        const { AlmacenId, VentaTipo } = venta.rows[0];
        const productos = await client.q(`SELECT * FROM ventaproducto WHERE VentaId = ?`, [id]);
        // Al anular una venta se repone el stock; al anular una devolución se vuelve a descontar
        const signo = VentaTipo === "DV" ? -1 : 1;
        for (const vp of productos.rows) {
          await ajustarStock(client, vp.ProductoId, AlmacenId, signo * vp.VentaProductoCantidad);
        }
        await client.q(
          `DELETE FROM registrodiariocaja
           WHERE RegistroDiarioCajaDetalle LIKE ? OR RegistroDiarioCajaDetalle LIKE ?`,
          [`Venta #${id} - %`, `Devolución Venta #${id} - %`]
        );
      } else {
        const compra = await client.q(`SELECT * FROM compra WHERE CompraId = ?`, [id]);
        if (!compra.rows.length) {
          const err = new Error("Compra no encontrada");
          err.status = 404;
          throw err;
        }
        const productos = await client.q(`SELECT * FROM compraproducto WHERE CompraId = ?`, [id]);
        for (const cp of productos.rows) {
          const cantidad = Number(cp.CompraProductoCantidad) + Number(cp.CompraProductoBonificacion || 0);
          await ajustarStock(client, cp.ProductoId, cp.AlmacenOrigenId, -cantidad);
        }
        await client.q(
          `DELETE FROM facturacreditopago WHERE FacturaCreditoId IN
             (SELECT FacturaCreditoId FROM facturacredito WHERE CompraId = ?)`,
          [id]
        );
        await client.q(`DELETE FROM facturacredito WHERE CompraId = ?`, [id]);
        await client.q(`DELETE FROM compraproducto WHERE CompraId = ?`, [id]);
        await client.q(`DELETE FROM registrodiariocaja WHERE RegistroDiarioCajaDetalle LIKE ?`, [
          `Compra #${id} - %`,
        ]);
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error en borrarRegistroDiario:", error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
