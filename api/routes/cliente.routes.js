const express = require("express");
const router = express.Router();
const clienteController = require("../controllers/cliente.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, clienteController.getAllClientes);
router.get(
  "/all",
  authMiddleware,
  clienteController.getAllClientesSinPaginacion
);
router.get("/search", authMiddleware, clienteController.searchClientes);
router.get("/:id", authMiddleware, clienteController.getClienteById);
router.post("/", authMiddleware, clienteController.createCliente);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("CLIENTES", "editar"),
  clienteController.updateCliente
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("CLIENTES", "eliminar"),
  clienteController.deleteCliente
);

module.exports = router;
