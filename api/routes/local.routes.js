const express = require("express");
const router = express.Router();
const localController = require("../controllers/local.controller");
const authMiddleware = require("../middlewares/auth");
const verificarPermiso = require("../middlewares/permiso");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, localController.getAllLocales);
router.get("/search", authMiddleware, localController.searchLocales);
router.get("/:id", authMiddleware, localController.getLocalById);
router.post("/", authMiddleware, localController.createLocal);
router.put(
  "/:id",
  authMiddleware,
  verificarPermiso("LOCALES", "editar"),
  localController.updateLocal
);
router.delete(
  "/:id",
  authMiddleware,
  verificarPermiso("LOCALES", "eliminar"),
  localController.deleteLocal
);

module.exports = router;
