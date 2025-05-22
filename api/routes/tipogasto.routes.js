const express = require("express");
const router = express.Router();
const tipogastoController = require("../controllers/tipogasto.controller");

router.get("/search", tipogastoController.searchTipoGastos);
router.get("/", tipogastoController.getAll);
router.get("/:id", tipogastoController.getById);
router.post("/", tipogastoController.create);
router.put("/:id", tipogastoController.update);
router.delete("/:id", tipogastoController.delete);

module.exports = router;
