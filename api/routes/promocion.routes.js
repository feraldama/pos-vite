const express = require("express");
const router = express.Router();
const promocionController = require("../controllers/promocion.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get("/", promocionController.getAll);
router.get("/cliente/:clienteId", promocionController.estadoCliente);
router.get("/reportes/cumpleanos", promocionController.reporteCumpleanos);
router.get("/reportes/usos", promocionController.reporteUsos);
router.post("/", promocionController.create);
router.put("/:id", promocionController.update);
router.delete("/:id", promocionController.remove);

module.exports = router;
