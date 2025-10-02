const Sucursal = require("../models/sucursal.model");

exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "SucursalId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Sucursal.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: result.sucursales,
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
    const sucursal = await Sucursal.getById(req.params.id);
    if (!sucursal) {
      return res.status(404).json({ message: "Sucursal no encontrada" });
    }
    res.json(sucursal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = ["SucursalNombre"];
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

    const sucursal = await Sucursal.create(req.body);
    res.status(201).json({
      success: true,
      message: "Sucursal creada exitosamente",
      data: sucursal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al crear sucursal",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const sucursalData = req.body;

    if (!sucursalData.SucursalNombre) {
      return res.status(400).json({
        success: false,
        message: "SucursalNombre es un campo requerido",
      });
    }

    const sucursal = await Sucursal.update(id, sucursalData);
    if (!sucursal) {
      return res.status(404).json({
        success: false,
        message: "Sucursal no encontrada",
      });
    }
    res.json({
      success: true,
      message: "Sucursal actualizada exitosamente",
      data: sucursal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al actualizar sucursal",
      error: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Sucursal.delete(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Sucursal no encontrada",
      });
    }
    res.json({
      success: true,
      message: "Sucursal eliminada exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar sucursal",
      error: error.message,
    });
  }
};

exports.searchSucursales = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "SucursalId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await Sucursal.searchSucursales(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.sucursales,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar sucursales" });
  }
};
