const TipoPrenda = require("../models/tipoprenda.model");

// getAllTiposPrenda
exports.getAllTiposPrenda = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "TipoPrendaId";
    const sortOrder = req.query.sortOrder || "ASC";
    const { tiposPrenda, total } = await TipoPrenda.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: tiposPrenda,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// searchTiposPrenda
exports.searchTiposPrenda = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "TipoPrendaId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { tiposPrenda, total } = await TipoPrenda.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: tiposPrenda,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// getTipoPrendaById
exports.getTipoPrendaById = async (req, res) => {
  try {
    const tipoPrenda = await TipoPrenda.getById(req.params.id);
    if (!tipoPrenda) {
      return res.status(404).json({ message: "Tipo de prenda no encontrado" });
    }
    res.json(tipoPrenda);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createTipoPrenda
exports.createTipoPrenda = async (req, res) => {
  try {
    const camposRequeridos = ["TipoPrendaNombre"];
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
    const nuevoTipoPrenda = await TipoPrenda.create(req.body);
    res.status(201).json({
      success: true,
      data: nuevoTipoPrenda,
      message: "Tipo de prenda creado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear tipo de prenda",
      error: error.message,
    });
  }
};

// updateTipoPrenda
exports.updateTipoPrenda = async (req, res) => {
  try {
    const { id } = req.params;
    const tipoPrendaData = req.body;
    if (!tipoPrendaData.TipoPrendaNombre) {
      return res.status(400).json({
        success: false,
        message: "TipoPrendaNombre es un campo requerido",
      });
    }
    const updatedTipoPrenda = await TipoPrenda.update(id, tipoPrendaData);
    if (!updatedTipoPrenda) {
      return res.status(404).json({
        success: false,
        message: "Tipo de prenda no encontrado",
      });
    }
    res.json({
      success: true,
      data: updatedTipoPrenda,
      message: "Tipo de prenda actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar tipo de prenda",
      error: error.message,
    });
  }
};

// deleteTipoPrenda
exports.deleteTipoPrenda = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TipoPrenda.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Tipo de prenda no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Tipo de prenda eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar tipo de prenda",
      error: error.message,
    });
  }
};

// Obtener todos los tipos de prenda sin paginación
exports.getAllTiposPrendaSinPaginacion = async (req, res) => {
  try {
    const tiposPrenda = await TipoPrenda.getAll();
    res.json({ data: tiposPrenda });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
