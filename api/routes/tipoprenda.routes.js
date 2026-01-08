const express = require("express");
const router = express.Router();
const tipoprendaController = require("../controllers/tipoprenda.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, tipoprendaController.getAllTiposPrenda);
router.get(
  "/all",
  authMiddleware,
  tipoprendaController.getAllTiposPrendaSinPaginacion
);
router.get("/search", authMiddleware, tipoprendaController.searchTiposPrenda);
router.get("/:id", authMiddleware, tipoprendaController.getTipoPrendaById);
router.post("/", authMiddleware, tipoprendaController.createTipoPrenda);
router.put("/:id", authMiddleware, tipoprendaController.updateTipoPrenda);
router.delete("/:id", authMiddleware, tipoprendaController.deleteTipoPrenda);

module.exports = router;
