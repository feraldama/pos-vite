const ColegioCobranza = require("../models/colegiocobranza.model");

// Obtener todas las cobranzas con paginación
exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "ColegioCobranzaId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await ColegioCobranza.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json(result);
  } catch (error) {
    console.error("Error al obtener cobranzas:", error);
    res.status(500).json({ message: error.message });
  }
};

// Buscar cobranzas
exports.search = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ColegioCobranzaId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await ColegioCobranza.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json(result);
  } catch (error) {
    console.error("Error en búsqueda de cobranzas:", error);
    res.status(500).json({ message: error.message });
  }
};

// Obtener una cobranza por ID
exports.getById = async (req, res) => {
  try {
    const cobranza = await ColegioCobranza.getById(req.params.id);
    if (!cobranza) {
      return res.status(404).json({ message: "Cobranza no encontrada" });
    }
    res.json(cobranza);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear una nueva cobranza
exports.create = async (req, res) => {
  try {
    const cobranza = await ColegioCobranza.create(req.body);
    res.status(201).json({
      message: "Cobranza creada exitosamente",
      data: cobranza,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar una cobranza
exports.update = async (req, res) => {
  try {
    const cobranza = await ColegioCobranza.update(req.params.id, req.body);
    if (!cobranza) {
      return res.status(404).json({ message: "Cobranza no encontrada" });
    }
    res.json({
      message: "Cobranza actualizada exitosamente",
      data: cobranza,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar una cobranza
exports.delete = async (req, res) => {
  try {
    const success = await ColegioCobranza.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Cobranza no encontrada" });
    }
    res.json({ message: "Cobranza eliminada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
