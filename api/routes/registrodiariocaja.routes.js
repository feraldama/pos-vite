const express = require("express");
const router = express.Router();
const registroDiarioCajaController = require("../controllers/registrodiariocaja.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para registros diarios de caja
router.get("/", registroDiarioCajaController.getAll);
router.get("/search", registroDiarioCajaController.search);
router.get("/:id", registroDiarioCajaController.getById);
router.post("/", registroDiarioCajaController.create);
router.put("/:id", registroDiarioCajaController.update);
router.delete("/:id", registroDiarioCajaController.delete);

module.exports = router;
