const express = require("express");
const router = express.Router();
const alquilerController = require("../controllers/alquiler.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, alquilerController.getAllAlquileres);
router.get("/search", authMiddleware, alquilerController.searchAlquileres);
router.get(
  "/pendientes",
  authMiddleware,
  alquilerController.getDeudasPendientesPorCliente
);
router.get(
  "/pendientes/:clienteId",
  authMiddleware,
  alquilerController.getAlquileresPendientesPorCliente
);
router.get(
  "/reporte",
  authMiddleware,
  alquilerController.getReporteAlquileresPorCliente
);
router.post(
  "/procesar-pago",
  authMiddleware,
  alquilerController.procesarPagoAlquileres
);
router.get("/:id", authMiddleware, alquilerController.getAlquilerById);
router.post("/", authMiddleware, alquilerController.createAlquiler);
router.put("/:id", authMiddleware, alquilerController.updateAlquiler);
router.delete("/:id", authMiddleware, alquilerController.deleteAlquiler);

module.exports = router;
