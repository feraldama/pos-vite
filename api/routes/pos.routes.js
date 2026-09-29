const express = require("express");
const router = express.Router();
const posController = require("../controllers/pos.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

router.use(authMiddleware);

// Anular es eliminar una venta (regla 1) o una compra (regla 2)
const permisoAnular = (req, res, next) =>
  verificarPermiso(
    Number(req.body?.regla) === 2 ? "COMPRAS" : "VENTAS",
    "eliminar"
  )(req, res, next);

router.post("/venta", posController.confirmarVenta);
router.post("/devolucion", posController.confirmarDevolucion);
router.post("/compra", posController.confirmarCompra);
router.post("/inventario", posController.actualizarInventario);
router.post(
  "/borrar-registro-diario",
  permisoAnular,
  posController.borrarRegistroDiario
);

module.exports = router;
