const AlquilerPrendas = require("../models/alquilerprendas.model");

// getAllAlquilerPrendas
exports.getAllAlquilerPrendas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "AlquilerId";
    const sortOrder = req.query.sortOrder || "ASC";
    const { alquilerPrendas, total } = await AlquilerPrendas.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: alquilerPrendas,
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

// searchAlquilerPrendas
exports.searchAlquilerPrendas = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "AlquilerId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { alquilerPrendas, total } = await AlquilerPrendas.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: alquilerPrendas,
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

// getPrendasAlquiladasActuales - prendas que están alquiladas ahora (hoy dentro del rango entrega-devolución)
exports.getPrendasAlquiladasActuales = async (req, res) => {
  try {
    const prendas = await AlquilerPrendas.getPrendasAlquiladasActuales();
    res.json({ success: true, data: prendas });
  } catch (error) {
    console.error("Error al obtener prendas alquiladas actuales:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener prendas alquiladas actuales",
      error: error.message,
    });
  }
};

// getAlquilerPrendasByAlquilerId
exports.getAlquilerPrendasByAlquilerId = async (req, res) => {
  try {
    const { alquilerId } = req.params;
    const prendas = await AlquilerPrendas.getByAlquilerId(alquilerId);
    res.json({ data: prendas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// getAlquilerPrendasById
exports.getAlquilerPrendasById = async (req, res) => {
  try {
    const { alquilerId, alquilerPrendasId } = req.params;
    const prenda = await AlquilerPrendas.getById(alquilerId, alquilerPrendasId);
    if (!prenda) {
      return res
        .status(404)
        .json({ message: "Prenda de alquiler no encontrada" });
    }
    res.json(prenda);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createAlquilerPrendas
exports.createAlquilerPrendas = async (req, res) => {
  try {
    const camposRequeridos = [
      "AlquilerId",
      "ProductoId",
      "AlquilerPrendasPrecio",
    ];
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
    const nuevaPrenda = await AlquilerPrendas.create(req.body);
    res.status(201).json({
      success: true,
      data: nuevaPrenda,
      message: "Prenda de alquiler creada exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear prenda de alquiler",
      error: error.message,
    });
  }
};

// updateAlquilerPrendas
exports.updateAlquilerPrendas = async (req, res) => {
  try {
    const { alquilerId, alquilerPrendasId } = req.params;
    const prendaData = req.body;

    const updatedPrenda = await AlquilerPrendas.update(
      alquilerId,
      alquilerPrendasId,
      prendaData
    );
    if (!updatedPrenda) {
      return res.status(404).json({
        success: false,
        message: "Prenda de alquiler no encontrada",
      });
    }
    res.json({
      success: true,
      data: updatedPrenda,
      message: "Prenda de alquiler actualizada exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar prenda de alquiler",
      error: error.message,
    });
  }
};

// deleteAlquilerPrendas
exports.deleteAlquilerPrendas = async (req, res) => {
  try {
    const { alquilerId, alquilerPrendasId } = req.params;
    const deleted = await AlquilerPrendas.delete(alquilerId, alquilerPrendasId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Prenda de alquiler no encontrada",
      });
    }
    res.json({
      success: true,
      message: "Prenda de alquiler eliminada exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar prenda de alquiler",
      error: error.message,
    });
  }
};
