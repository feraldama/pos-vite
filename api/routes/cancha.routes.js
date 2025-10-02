const express = require("express");
const router = express.Router();
const canchaController = require("../controllers/cancha.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Cancha
router.get("/search", authMiddleware, canchaController.searchCanchas);
router.get("/", authMiddleware, canchaController.getAll);
router.get("/:id", authMiddleware, canchaController.getById);
router.post("/", authMiddleware, canchaController.create);
router.put("/:id", authMiddleware, canchaController.update);
router.delete("/:id", authMiddleware, canchaController.delete);

module.exports = router;
