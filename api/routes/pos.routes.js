const express = require("express");
const router = express.Router();
const posController = require("../controllers/pos.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.post("/venta", posController.confirmarVenta);
router.post("/credito", posController.cobrarCredito);
router.post("/anular-venta", posController.anularVenta);

module.exports = router;
