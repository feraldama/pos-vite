-- ============================================================================
-- Reset de datos y carga de servicios del lavadero
-- Fuente: client/src/assets/SERVICIOS_setiembre_2026.xlsx (16 servicios)
-- Fecha: 2026-09-17
--
-- ALCANCE
--   BORRA    : producto y todos los movimientos (ventas, creditos, pagos,
--              combos, stock por almacen, compras y traslados).
--   MANTIENE : clientes, registrodiariocaja, usuario, perfil, perfilmenu,
--              menu, usuarioperfil, local, almacen, caja, tipogasto,
--              tipogastogrupo, proveedor.
--
-- IMPORTANTE: hacer respaldo antes de ejecutar.
--   node api/scripts/backup-db.cjs
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- --- 1. Borrado de movimientos (orden hijo -> padre) ------------------------
DELETE FROM ventacreditopago;
DELETE FROM ventacredito;
DELETE FROM ventaproducto;
DELETE FROM venta;

DELETE FROM facturacreditopago;
DELETE FROM facturacredito;
DELETE FROM compraproducto;
DELETE FROM compra;

DELETE FROM traslado;
DELETE FROM productoalmacen;
DELETE FROM combo;

-- --- 2. Borrado del catalogo anterior ---------------------------------------
DELETE FROM producto;

-- --- 3. Reinicio de contadores ----------------------------------------------
ALTER TABLE producto           AUTO_INCREMENT = 1;
ALTER TABLE venta              AUTO_INCREMENT = 1;
ALTER TABLE ventaproducto      AUTO_INCREMENT = 1;
ALTER TABLE ventacredito       AUTO_INCREMENT = 1;
ALTER TABLE ventacreditopago   AUTO_INCREMENT = 1;
ALTER TABLE combo              AUTO_INCREMENT = 1;
ALTER TABLE compra             AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- --- 4. Carga de los 16 servicios -------------------------------------------
-- LocalId 2 = LAVADERO. Los servicios no manejan stock: el sistema no
-- descuenta ProductoStock en la venta, por eso queda en 0.
-- ProductoPrecioVentaMayorista replica el precio de venta (no hay mayorista).
-- ProductoPrecioPromedio = 0: un servicio no tiene costo de compra.

INSERT INTO producto (
  ProductoCodigo,
  ProductoNombre,
  ProductoPrecioVenta,
  ProductoPrecioVentaMayorista,
  ProductoPrecioUnitario,
  ProductoPrecioPromedio,
  ProductoStock,
  ProductoStockUnitario,
  ProductoCantidadCaja,
  ProductoIVA,
  ProductoStockMinimo,
  ProductoImagen,
  ProductoImagen_GXI,
  LocalId
) VALUES
  ('LC-MOTO',    'LAVADO COMPLETO - MOTO',                          20000,  20000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('DA-AUTO',    'DUCHA + ASPIRADO - AUTO',                         40000,  40000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LC-AUTO',    'LAVADO COMPLETO - AUTO',                          50000,  50000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('DA-CAM',     'DUCHA + ASPIRADO - CAMIONETA',                    50000,  50000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LC-CAM',     'LAVADO COMPLETO - CAMIONETA',                     60000,  60000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LC-MINI',    'LAVADO COMPLETO - MINIVAN',                       70000,  70000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LC-AMB',     'LAVADO COMPLETO - AMBULANCIA',                    75000,  75000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('EN-MOTO',    'ENCERADO - MOTO',                                 50000,  50000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('PU-MOTO',    'PULIDA - MOTO',                                   80000,  80000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('PF-AUTO',    'PULIDA DE FAROS - AUTO',                          80000,  80000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('PC-AUTO',    'PULIDA COMERCIAL - AUTO',                        200000, 200000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('PC-CAM',     'PULIDA COMERCIAL - CAMIONETA',                   300000, 300000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LI-VIDRIO',  'LIMPIEZA INTEGRAL LLUVIA ACIDA POR CADA VIDRIO',  20000,  20000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LI-ASIENTO', 'LIMPIEZA INTEGRAL POR ASIENTO',                   50000,  50000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LI-TELA',    'LIMPIEZA INTEGRAL COMPLETO, ASIENTOS DE TELAS',  250000, 250000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2),
  ('LI-CUERO',   'LIMPIEZA INTEGRAL COMPLETO, ASIENTOS DE CUERO',  350000, 350000, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 2);

-- --- 5. Producto comodin ADICIONAL ------------------------------------------
-- Existia en el catalogo anterior (ProductoId 1) y se vuelve a cargar: sirve
-- para cobrar montos libres que no corresponden a un servicio de la lista.
-- LocalId 0 = TODOS, para que quede visible desde cualquier local.
-- Precio 0: el monto se carga a mano en el momento de la venta.

INSERT INTO producto (
  ProductoCodigo,
  ProductoNombre,
  ProductoPrecioVenta,
  ProductoPrecioVentaMayorista,
  ProductoPrecioUnitario,
  ProductoPrecioPromedio,
  ProductoStock,
  ProductoStockUnitario,
  ProductoCantidadCaja,
  ProductoIVA,
  ProductoStockMinimo,
  ProductoImagen,
  ProductoImagen_GXI,
  LocalId
) VALUES
  ('0', 'ADICIONAL', 0, 0, 0, 0.00, 0, 0, 1, 10, 0, '', NULL, 0);
