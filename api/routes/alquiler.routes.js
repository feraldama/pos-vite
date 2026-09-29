const express = require("express");
const router = express.Router();
const alquilerController = require("../controllers/alquiler.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

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
router.get(
  "/proximos-entrega",
  authMiddleware,
  alquilerController.getAlquileresProximosEntrega
);
router.get(
  "/proximos-devolucion",
  authMiddleware,
  alquilerController.getAlquileresProximosDevolucion
);
router.post(
  "/procesar-pago",
  authMiddleware,
  alquilerController.procesarPagoAlquileres
);
router.get("/:id", authMiddleware, alquilerController.getAlquilerById);
router.post("/", authMiddleware, alquilerController.createAlquiler);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("ALQUILER", "editar"),
  alquilerController.updateAlquiler
);
router.patch(
  "/:id/estado",
  authMiddleware,
  verificarPermiso("ALQUILER", "editar"),
  alquilerController.updateEstadoAlquiler
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("ALQUILER", "eliminar"),
  alquilerController.deleteAlquiler
);

module.exports = router;
