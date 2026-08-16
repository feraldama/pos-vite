const express = require("express");
const router = express.Router();
const posController = require("../controllers/pos.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.post("/venta", posController.confirmarVenta);
router.post("/devolucion", posController.confirmarDevolucion);
router.post("/compra", posController.confirmarCompra);
router.post("/inventario", posController.actualizarInventario);
router.post("/borrar-registro-diario", posController.borrarRegistroDiario);

module.exports = router;
