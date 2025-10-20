const Competencia = require("../models/competencia.model");

exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "CompetenciaId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Competencia.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: result.competencias,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const competencia = await Competencia.getById(req.params.id);
    if (!competencia) {
      return res.status(404).json({ message: "Competencia no encontrada" });
    }
    res.json(competencia);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const competencia = await Competencia.create(req.body);
    res
      .status(201)
      .json({ message: "Competencia creada exitosamente", data: competencia });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const competencia = await Competencia.update(req.params.id, req.body);
    if (!competencia) {
      return res.status(404).json({ message: "Competencia no encontrada" });
    }
    res.json({
      message: "Competencia actualizada exitosamente",
      data: competencia,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await Competencia.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Competencia no encontrada" });
    }
    res.json({ message: "Competencia eliminada exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar la competencia porque tiene registros asociados.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.searchCompetencias = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "CompetenciaId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await Competencia.searchCompetencias(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.competencias,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar competencias" });
  }
};
