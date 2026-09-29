const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuario.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Rutas públicas (no requieren autenticación)
router.post("/login", usuarioController.login);

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, usuarioController.getAllUsuarios);
router.get("/search", authMiddleware, usuarioController.searchUsuarios);
router.get("/:id", authMiddleware, usuarioController.getUsuarioById);
router.post(
  "/",
  authMiddleware,
  verificarPermiso("USUARIOS", "crear"),
  usuarioController.createUsuario
);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("USUARIOS", "editar"),
  usuarioController.updateUsuario
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("USUARIOS", "eliminar"),
  usuarioController.deleteUsuario
);

module.exports = router;
