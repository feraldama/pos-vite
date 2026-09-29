const express = require("express");
const router = express.Router();
const compraController = require("../controllers/compra.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, compraController.getAllCompras);
router.get("/all", authMiddleware, compraController.getAllComprasSinPaginacion);
router.get("/search", authMiddleware, compraController.searchCompras);
router.get("/:id", authMiddleware, compraController.getCompraById);
router.get(
  "/:id/productos",
  authMiddleware,
  compraController.getProductosByCompraId
);
router.post("/", authMiddleware, compraController.createCompra);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("COMPRAS", "editar"),
  compraController.updateCompra
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("COMPRAS", "eliminar"),
  compraController.deleteCompra
);

module.exports = router;
