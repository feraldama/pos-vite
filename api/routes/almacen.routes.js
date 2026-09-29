const express = require("express");
const router = express.Router();
const almacenController = require("../controllers/almacen.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Almacen
router.get("/search", authMiddleware, almacenController.searchAlmacenes);
router.get("/", authMiddleware, almacenController.getAll);
router.get("/:id", authMiddleware, almacenController.getById);
router.post("/", authMiddleware, almacenController.create);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("ALMACENES", "editar"),
  almacenController.update
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("ALMACENES", "eliminar"),
  almacenController.delete
);

module.exports = router;
