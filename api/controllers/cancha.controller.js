const Cancha = require("../models/cancha.model");

exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "CanchaId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Cancha.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: result.canchas,
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
    const cancha = await Cancha.getById(req.params.id);
    if (!cancha) {
      return res.status(404).json({ message: "Cancha no encontrada" });
    }
    res.json(cancha);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = ["CanchaNombre", "SucursalId"];
    for (const campo of camposRequeridos) {
      if (
        req.body[campo] === undefined ||
        req.body[campo] === null ||
        (typeof req.body[campo] === "string" && req.body[campo].trim() === "")
      ) {
        return res.status(400).json({
          success: false,
          message: `El campo ${campo} es requerido`,
        });
      }
    }

    // Validar CanchaEstado (puede ser boolean o string)
    if (req.body.CanchaEstado === undefined || req.body.CanchaEstado === null) {
      return res.status(400).json({
        success: false,
        message: "El campo CanchaEstado es requerido",
      });
    }

    const cancha = await Cancha.create(req.body);
    res.status(201).json({
      success: true,
      message: "Cancha creada exitosamente",
      data: cancha,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al crear cancha",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const canchaData = req.body;

    if (!canchaData.CanchaNombre) {
      return res.status(400).json({
        success: false,
        message: "CanchaNombre es un campo requerido",
      });
    }

    // Validar CanchaEstado si se proporciona
    if (
      canchaData.CanchaEstado !== undefined &&
      canchaData.CanchaEstado === null
    ) {
      return res.status(400).json({
        success: false,
        message: "CanchaEstado no puede ser null",
      });
    }

    const cancha = await Cancha.update(id, canchaData);
    if (!cancha) {
      return res.status(404).json({
        success: false,
        message: "Cancha no encontrada",
      });
    }
    res.json({
      success: true,
      message: "Cancha actualizada exitosamente",
      data: cancha,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al actualizar cancha",
      error: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Cancha.delete(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Cancha no encontrada",
      });
    }
    res.json({
      success: true,
      message: "Cancha eliminada exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar cancha",
      error: error.message,
    });
  }
};

exports.searchCanchas = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "CanchaId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await Cancha.searchCanchas(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.canchas,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar canchas" });
  }
};
