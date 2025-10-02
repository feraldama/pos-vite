const express = require("express");
const router = express.Router();
const partidoController = require("../controllers/partido.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas públicas (si necesitas alguna, por ejemplo para obtener partidos sin login)
// router.get("/public", partidoController.getAllPartidos);

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, partidoController.getAllPartidos);
router.get(
  "/all",
  authMiddleware,
  partidoController.getAllPartidosSinPaginacion
);
router.get("/search", authMiddleware, partidoController.searchPartidos);
router.get("/:id", authMiddleware, partidoController.getPartidoById);
router.post("/", authMiddleware, partidoController.createPartido);
router.put("/:id", authMiddleware, partidoController.updatePartido);
router.delete("/:id", authMiddleware, partidoController.deletePartido);

// Ruta pública para traer todos los partidos sin paginación

module.exports = router;
