const express = require("express");
const router = express.Router();
const competenciaController = require("../controllers/competencia.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Competencia
router.get("/search", authMiddleware, competenciaController.searchCompetencias);
router.get("/", authMiddleware, competenciaController.getAll);
router.get("/:id", authMiddleware, competenciaController.getById);
router.post("/", authMiddleware, competenciaController.create);
router.put("/:id", authMiddleware, competenciaController.update);
router.delete("/:id", authMiddleware, competenciaController.delete);

module.exports = router;
