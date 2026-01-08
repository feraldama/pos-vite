const express = require("express");
const router = express.Router();
const alquilerprendasController = require("../controllers/alquilerprendas.controller");
const authMiddleware = require("../middlewares/auth");

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
  alquilerprendasController.updateAlquilerPrendas
);
router.delete(
  "/:alquilerId/:alquilerPrendasId",
  authMiddleware,
  alquilerprendasController.deleteAlquilerPrendas
);

module.exports = router;
