const express = require("express");
const router = express.Router();
const tipogastoController = require("../controllers/tipogasto.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

router.use(authMiddleware);

router.get("/search", authMiddleware, tipogastoController.searchTipoGastos);
router.get("/", authMiddleware, tipogastoController.getAll);
router.get("/paginated", authMiddleware, tipogastoController.getAllPaginated);
router.get("/:id", authMiddleware, tipogastoController.getById);
router.post("/", authMiddleware, tipogastoController.create);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("TIPOSGASTO", "editar"),
  tipogastoController.update
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("TIPOSGASTO", "eliminar"),
  tipogastoController.delete
);

module.exports = router;
