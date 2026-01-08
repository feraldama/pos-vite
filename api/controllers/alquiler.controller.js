const Alquiler = require("../models/alquiler.model");
const AlquilerPrendas = require("../models/alquilerprendas.model");

// getAllAlquileres
exports.getAllAlquileres = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "AlquilerId";
    const sortOrder = req.query.sortOrder || "ASC";
    const { alquileres, total } = await Alquiler.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: alquileres,
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

// searchAlquileres
exports.searchAlquileres = async (req, res) => {
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
    const { alquileres, total } = await Alquiler.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: alquileres,
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

// getAlquilerById
exports.getAlquilerById = async (req, res) => {
  try {
    const alquiler = await Alquiler.getById(req.params.id);
    if (!alquiler) {
      return res.status(404).json({ message: "Alquiler no encontrado" });
    }
    // Obtener las prendas del alquiler
    const prendas = await AlquilerPrendas.getByAlquilerId(req.params.id);
    res.json({
      ...alquiler,
      prendas: prendas || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createAlquiler
exports.createAlquiler = async (req, res) => {
  try {
    const camposRequeridos = ["ClienteId", "AlquilerFechaAlquiler"];
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
    const nuevoAlquiler = await Alquiler.create(req.body);

    // Si se proporcionan prendas, crearlas
    if (req.body.prendas && Array.isArray(req.body.prendas)) {
      for (const prenda of req.body.prendas) {
        await AlquilerPrendas.create({
          AlquilerId: nuevoAlquiler.AlquilerId,
          AlquilerPrendasId: prenda.AlquilerPrendasId,
          ProductoId: prenda.ProductoId,
          AlquilerPrendasPrecio: prenda.AlquilerPrendasPrecio,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: nuevoAlquiler,
      message: "Alquiler creado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear alquiler",
      error: error.message,
    });
  }
};

// updateAlquiler
exports.updateAlquiler = async (req, res) => {
  try {
    const { id } = req.params;
    const alquilerData = req.body;

    const updatedAlquiler = await Alquiler.update(id, alquilerData);
    if (!updatedAlquiler) {
      return res.status(404).json({
        success: false,
        message: "Alquiler no encontrado",
      });
    }

    // Si se proporcionan prendas, actualizarlas
    if (req.body.prendas && Array.isArray(req.body.prendas)) {
      // Eliminar prendas existentes
      await AlquilerPrendas.deleteByAlquilerId(id);
      // Crear nuevas prendas
      for (const prenda of req.body.prendas) {
        await AlquilerPrendas.create({
          AlquilerId: id,
          AlquilerPrendasId: prenda.AlquilerPrendasId,
          ProductoId: prenda.ProductoId,
          AlquilerPrendasPrecio: prenda.AlquilerPrendasPrecio,
        });
      }
    }

    res.json({
      success: true,
      data: updatedAlquiler,
      message: "Alquiler actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar alquiler",
      error: error.message,
    });
  }
};

// deleteAlquiler
exports.deleteAlquiler = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Alquiler.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Alquiler no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Alquiler eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar alquiler",
      error: error.message,
    });
  }
};
