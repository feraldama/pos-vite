const JSICobro = require("../models/jsicobro.model");

// Obtener todos los cobros con paginación
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "JSICobroFecha";
    const sortOrder = req.query.sortOrder || "DESC";

    const result = await JSICobro.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json(result);
  } catch (error) {
    console.error("Error al obtener cobros de JSI:", error);
    res.status(500).json({ message: error.message });
  }
};

// Buscar cobros
exports.search = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "JSICobroFecha";
    const sortOrder = req.query.sortOrder || "DESC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await JSICobro.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json(result);
  } catch (error) {
    console.error("Error en búsqueda de cobros de JSI:", error);
    res.status(500).json({ error: "Error al buscar cobros de JSI" });
  }
};

// Obtener un cobro por ID
exports.getById = async (req, res) => {
  try {
    const jsicobro = await JSICobro.getById(req.params.id);
    if (!jsicobro) {
      return res.status(404).json({ message: "Cobro de JSI no encontrado" });
    }
    res.json(jsicobro);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo cobro
exports.create = async (req, res) => {
  try {
    const jsicobro = await JSICobro.create({
      ...req.body,
      JSICobroUsuarioId: req.user.id, // Asumiendo que tienes el usuario en req.user
    });
    res.status(201).json({
      message: "Cobro de JSI creado exitosamente",
      data: jsicobro,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un cobro
exports.update = async (req, res) => {
  try {
    const jsicobro = await JSICobro.update(req.params.id, req.body);
    if (!jsicobro) {
      return res.status(404).json({ message: "Cobro de JSI no encontrado" });
    }
    res.json({
      message: "Cobro de JSI actualizado exitosamente",
      data: jsicobro,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un cobro
exports.delete = async (req, res) => {
  try {
    const success = await JSICobro.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Cobro de JSI no encontrado" });
    }

    res.json({ message: "Cobro de JSI eliminado exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el cobro porque tiene movimientos asociados.",
      });
    }
    console.error("Error al eliminar cobro de JSI:", error);
    res.status(500).json({ message: error.message });
  }
};
