const express = require("express");
const router = express.Router();
const partidoJugadorController = require("../controllers/partidojugador.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas públicas (si necesitas alguna, por ejemplo para obtener partido jugadores sin login)
// router.get("/public", partidoJugadorController.getAllPartidoJugadores);

// Rutas protegidas (requieren autenticación)
router.get(
  "/",
  authMiddleware,
  partidoJugadorController.getAllPartidoJugadores
);
router.get(
  "/all",
  authMiddleware,
  partidoJugadorController.getAllPartidoJugadoresSinPaginacion
);
router.get(
  "/search",
  authMiddleware,
  partidoJugadorController.searchPartidoJugadores
);
router.get(
  "/partido/:partidoId",
  authMiddleware,
  partidoJugadorController.getPartidoJugadoresByPartidoId
);
router.get(
  "/:id",
  authMiddleware,
  partidoJugadorController.getPartidoJugadorById
);
router.post("/", authMiddleware, partidoJugadorController.createPartidoJugador);
router.put(
  "/:id",
  authMiddleware,
  partidoJugadorController.updatePartidoJugador
);
router.delete(
  "/:id",
  authMiddleware,
  partidoJugadorController.deletePartidoJugador
);

// Ruta pública para traer todos los partido jugadores sin paginación

module.exports = router;
