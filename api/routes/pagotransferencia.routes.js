const express = require("express");
const router = express.Router();
const pagoController = require("../controllers/pagotransferencia.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get("/", pagoController.getAll);
router.get("/sugerencias", pagoController.sugerencias);
router.get("/reporte", pagoController.reporte);
router.get("/:id/comprobante", pagoController.comprobante);
router.post("/", pagoController.create);
router.put("/:id", pagoController.update);
router.delete("/:id", pagoController.remove);

module.exports = router;
