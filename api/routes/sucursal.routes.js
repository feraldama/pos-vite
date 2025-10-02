const express = require("express");
const router = express.Router();
const sucursalController = require("../controllers/sucursal.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Sucursal
router.get("/search", authMiddleware, sucursalController.searchSucursales);
router.get("/", authMiddleware, sucursalController.getAll);
router.get("/:id", authMiddleware, sucursalController.getById);
router.post("/", authMiddleware, sucursalController.create);
router.put("/:id", authMiddleware, sucursalController.update);
router.delete("/:id", authMiddleware, sucursalController.delete);

module.exports = router;
