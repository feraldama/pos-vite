const express = require("express");
const router = express.Router();
const alquilerprendasController = require("../controllers/alquilerprendas.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Rutas protegidas (requieren autenticación)
router.get(
  "/",
  authMiddleware,
  alquilerprendasController.getAllAlquilerPrendas
);
router.get(
  "/search",
  authMiddleware,
  alquilerprendasController.searchAlquilerPrendas
);
router.get(
  "/prendas-alquiladas-actuales",
  authMiddleware,
  alquilerprendasController.getPrendasAlquiladasActuales
);
router.get(
  "/fechas-ocupadas",
  authMiddleware,
  alquilerprendasController.getFechasOcupadas
);
router.get(
  "/alquiler/:alquilerId",
  authMiddleware,
  alquilerprendasController.getAlquilerPrendasByAlquilerId
);
router.get(
  "/:alquilerId/:alquilerPrendasId",
  authMiddleware,
  alquilerprendasController.getAlquilerPrendasById
);
router.post(
  "/",
  authMiddleware,
  alquilerprendasController.createAlquilerPrendas
);
router.put(
  "/:alquilerId/:alquilerPrendasId",
  authMiddleware,
  verificarPermiso("ALQUILER", "editar"),
  alquilerprendasController.updateAlquilerPrendas
);
router.delete(
  "/:alquilerId/:alquilerPrendasId",
  authMiddleware,
  verificarPermiso("ALQUILER", "eliminar"),
  alquilerprendasController.deleteAlquilerPrendas
);

module.exports = router;
