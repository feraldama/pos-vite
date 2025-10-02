const PartidoJugador = require("../models/partidojugador.model");

// getAllPartidoJugadores
exports.getAllPartidoJugadores = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "PartidoJugadorId";
    const sortOrder = req.query.sortOrder || "ASC";
    const { partidoJugadores, total } = await PartidoJugador.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: partidoJugadores,
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

// searchPartidoJugadores
exports.searchPartidoJugadores = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "PartidoJugadorId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { partidoJugadores, total } = await PartidoJugador.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: partidoJugadores,
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

// getPartidoJugadorById
exports.getPartidoJugadorById = async (req, res) => {
  try {
    let partidoJugador = await PartidoJugador.getById(req.params.id);
    if (!partidoJugador) {
      return res.status(404).json({ message: "Partido jugador no encontrado" });
    }
    res.json(partidoJugador);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// getPartidoJugadoresByPartidoId
exports.getPartidoJugadoresByPartidoId = async (req, res) => {
  try {
    const { partidoId } = req.params;
    const partidoJugadores = await PartidoJugador.getByPartidoId(partidoId);
    res.json({ data: partidoJugadores });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createPartidoJugador
exports.createPartidoJugador = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = ["PartidoId", "ClienteId"];
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
    // Crear partido jugador
    const nuevoPartidoJugador = await PartidoJugador.create(req.body);
    res.status(201).json({
      success: true,
      data: nuevoPartidoJugador,
      message: "Partido jugador creado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear partido jugador",
      error: error.message,
    });
  }
};

// updatePartidoJugador
exports.updatePartidoJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const partidoJugadorData = req.body;
    if (!partidoJugadorData.PartidoId) {
      return res.status(400).json({
        success: false,
        message: "PartidoId es un campo requerido",
      });
    }
    const updatedPartidoJugador = await PartidoJugador.update(
      id,
      partidoJugadorData
    );
    if (!updatedPartidoJugador) {
      return res.status(404).json({
        success: false,
        message: "Partido jugador no encontrado",
      });
    }
    res.json({
      success: true,
      data: updatedPartidoJugador,
      message: "Partido jugador actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar partido jugador",
      error: error.message,
    });
  }
};

// deletePartidoJugador
exports.deletePartidoJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PartidoJugador.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Partido jugador no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Partido jugador eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar partido jugador",
      error: error.message,
    });
  }
};

// Obtener todos los partido jugadores sin paginación
exports.getAllPartidoJugadoresSinPaginacion = async (req, res) => {
  try {
    const partidoJugadores = await PartidoJugador.getAll();
    res.json({ data: partidoJugadores });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
