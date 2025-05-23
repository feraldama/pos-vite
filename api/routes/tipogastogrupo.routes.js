const express = require("express");
const router = express.Router();
const tipogastoGrupoController = require("../controllers/tipogastogrupo.controller");

router.get("/", tipogastoGrupoController.getAll);
router.get("/by-tipo/:tipoGastoId", tipogastoGrupoController.getByTipoGastoId);
router.get("/:id", tipogastoGrupoController.getById);
router.post("/", tipogastoGrupoController.create);
router.put("/:tipoGastoId/:grupoId", tipogastoGrupoController.update);
router.delete("/:tipoGastoId/:grupoId", tipogastoGrupoController.delete);

module.exports = router;
