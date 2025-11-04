const PagoTrans = require("../models/pagotrans.model");

// Obtener todos los pagos con paginación
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "PagoTransFecha";
    const sortOrder = req.query.sortOrder || "DESC";

    const result = await PagoTrans.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json(result);
  } catch (error) {
    console.error("Error al obtener pagos de transporte:", error);
    res.status(500).json({ message: error.message });
  }
};

// Buscar pagos
exports.search = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "PagoTransFecha";
    const sortOrder = req.query.sortOrder || "DESC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await PagoTrans.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json(result);
  } catch (error) {
    console.error("Error en búsqueda de pagos de transporte:", error);
    res.status(500).json({ error: "Error al buscar pagos de transporte" });
  }
};

// Obtener un pago por ID
exports.getById = async (req, res) => {
  try {
    const pagoTrans = await PagoTrans.getById(req.params.id);
    if (!pagoTrans) {
      return res
        .status(404)
        .json({ message: "Pago de transporte no encontrado" });
    }
    res.json(pagoTrans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo pago
exports.create = async (req, res) => {
  try {
    const pagoTrans = await PagoTrans.create({
      ...req.body,
      PagoTransUsuarioId: req.user.id, // Asumiendo que tienes el usuario en req.user
    });
    res.status(201).json({
      message: "Pago de transporte creado exitosamente",
      data: pagoTrans,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un pago
exports.update = async (req, res) => {
  try {
    const pagoTrans = await PagoTrans.update(req.params.id, req.body);
    if (!pagoTrans) {
      return res
        .status(404)
        .json({ message: "Pago de transporte no encontrado" });
    }
    res.json({
      message: "Pago de transporte actualizado exitosamente",
      data: pagoTrans,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un pago
exports.delete = async (req, res) => {
  try {
    const success = await PagoTrans.delete(req.params.id);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Pago de transporte no encontrado" });
    }
    res.json({ message: "Pago de transporte eliminado exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el pago porque tiene movimientos asociados.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};
