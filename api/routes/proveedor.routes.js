const express = require("express");
const router = express.Router();
const proveedorController = require("../controllers/proveedor.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, proveedorController.getAllProveedores);
router.get(
  "/all",
  authMiddleware,
  proveedorController.getAllProveedoresSinPaginacion
);
router.get("/search", authMiddleware, proveedorController.searchProveedores);
router.get("/:id", authMiddleware, proveedorController.getProveedorById);
router.post("/", authMiddleware, proveedorController.createProveedor);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("COMPRAS", "editar"),
  proveedorController.updateProveedor
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("COMPRAS", "eliminar"),
  proveedorController.deleteProveedor
);

module.exports = router;
