const express = require("express");
const router = express.Router();
const reporteController = require("../controllers/reporte.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Reportes
router.get(
  "/jugadores",
  authMiddleware,
  reporteController.getEstadisticasJugadores
);
router.get(
  "/jugadores/search",
  authMiddleware,
  reporteController.searchEstadisticasJugadores
);
router.get(
  "/jugadores/:id",
  authMiddleware,
  reporteController.getEstadisticasJugador
);
router.get("/resumen", authMiddleware, reporteController.getResumenGeneral);
router.get("/top", authMiddleware, reporteController.getTopJugadores);

module.exports = router;
