const Caja = require("../models/caja.model");

exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "CajaId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Caja.getAllPaginated(limit, offset, sortBy, sortOrder);
    res.json({
      data: result.cajas,
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
    const caja = await Caja.getById(req.params.id);
    if (!caja) {
      return res.status(404).json({ message: "Caja no encontrada" });
    }
    res.json(caja);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const caja = await Caja.create(req.body);
    res.status(201).json({ message: "Caja creada exitosamente", data: caja });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const caja = await Caja.update(req.params.id, req.body);
    if (!caja) {
      return res.status(404).json({ message: "Caja no encontrada" });
    }
    res.json({ message: "Caja actualizada exitosamente", data: caja });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await Caja.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Caja no encontrada" });
    }
    res.json({ message: "Caja eliminada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchCajas = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "CajaId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await Caja.searchCajas(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.cajas,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar cajas" });
  }
};
