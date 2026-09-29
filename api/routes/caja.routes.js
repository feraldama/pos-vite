const express = require("express");
const router = express.Router();
const cajaController = require("../controllers/caja.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para Caja
router.get("/search", authMiddleware, cajaController.searchCajas);
router.get("/", authMiddleware, cajaController.getAll);
router.put("/:id/monto", authMiddleware, cajaController.updateMonto);
router.get("/:id", authMiddleware, cajaController.getById);
router.post("/", authMiddleware, cajaController.create);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("CAJAS", "editar"),
  cajaController.update
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("CAJAS", "eliminar"),
  cajaController.delete
);

module.exports = router;
