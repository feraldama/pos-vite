const Reporte = require("../models/reporte.model");

// Obtener estadísticas de todos los jugadores
exports.getEstadisticasJugadores = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "totalPartidos",
      sortOrder = "DESC",
    } = req.query;

    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;

    // Validar parámetros de ordenamiento
    const allowedSortFields = [
      "ClienteId",
      "ClienteNombre",
      "ClienteApellido",
      "totalPartidos",
      "partidosGanados",
      "partidosPerdidos",
      "porcentajeVictorias",
    ];

    const allowedSortOrders = ["ASC", "DESC"];
    const validSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "totalPartidos";
    const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    const result = await Reporte.getEstadisticasJugadores(
      limitNum,
      offset,
      validSortBy,
      validSortOrder
    );

    res.json({
      success: true,
      data: result.estadisticas,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
      message: "Estadísticas de jugadores obtenidas exitosamente",
    });
  } catch (error) {
    console.error("Error en getEstadisticasJugadores:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Buscar estadísticas de jugadores
exports.searchEstadisticasJugadores = async (req, res) => {
  try {
    const {
      term = "",
      page = 1,
      limit = 10,
      sortBy = "totalPartidos",
      sortOrder = "DESC",
    } = req.query;

    if (!term.trim()) {
      return res.status(400).json({
        success: false,
        message: "El término de búsqueda es requerido",
      });
    }

    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;

    // Validar parámetros de ordenamiento
    const allowedSortFields = [
      "ClienteId",
      "ClienteNombre",
      "ClienteApellido",
      "totalPartidos",
      "partidosGanados",
      "partidosPerdidos",
      "porcentajeVictorias",
    ];

    const allowedSortOrders = ["ASC", "DESC"];
    const validSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "totalPartidos";
    const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    const result = await Reporte.searchEstadisticasJugadores(
      term.trim(),
      limitNum,
      offset,
      validSortBy,
      validSortOrder
    );

    res.json({
      success: true,
      data: result.estadisticas,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
      searchTerm: term.trim(),
      message: `Búsqueda completada. ${result.total} jugador(es) encontrado(s)`,
    });
  } catch (error) {
    console.error("Error en searchEstadisticasJugadores:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Obtener estadísticas de un jugador específico
exports.getEstadisticasJugador = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de jugador inválido",
      });
    }

    const estadisticas = await Reporte.getEstadisticasJugador(parseInt(id));

    if (!estadisticas) {
      return res.status(404).json({
        success: false,
        message: "Jugador no encontrado o sin partidos registrados",
      });
    }

    res.json({
      success: true,
      data: estadisticas,
      message: "Estadísticas del jugador obtenidas exitosamente",
    });
  } catch (error) {
    console.error("Error en getEstadisticasJugador:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Obtener resumen general de estadísticas
exports.getResumenGeneral = async (req, res) => {
  try {
    const resumen = await Reporte.getResumenGeneral();

    res.json({
      success: true,
      data: resumen,
      message: "Resumen general obtenido exitosamente",
    });
  } catch (error) {
    console.error("Error en getResumenGeneral:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Obtener top jugadores por diferentes criterios
exports.getTopJugadores = async (req, res) => {
  try {
    const { criterio = "totalPartidos", limit = 10 } = req.query;

    const limitNum = parseInt(limit);

    // Validar criterio
    const allowedCriterios = [
      "totalPartidos",
      "partidosGanados",
      "porcentajeVictorias",
    ];

    const validCriterio = allowedCriterios.includes(criterio)
      ? criterio
      : "totalPartidos";

    const result = await Reporte.getEstadisticasJugadores(
      limitNum,
      0,
      validCriterio,
      "DESC"
    );

    res.json({
      success: true,
      data: result.estadisticas,
      criterio: validCriterio,
      message: `Top ${limitNum} jugadores por ${validCriterio}`,
    });
  } catch (error) {
    console.error("Error en getTopJugadores:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};
