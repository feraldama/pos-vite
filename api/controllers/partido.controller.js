const Partido = require("../models/partido.model");
const PartidoJugador = require("../models/partidojugador.model");

// getAllPartidos
exports.getAllPartidos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "PartidoId";
    const sortOrder = req.query.sortOrder || "ASC";
    const { partidos, total } = await Partido.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: partidos,
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

// searchPartidos
exports.searchPartidos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "PartidoId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { partidos, total } = await Partido.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: partidos,
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

// getPartidoById
exports.getPartidoById = async (req, res) => {
  try {
    let partido = await Partido.getById(req.params.id);
    if (!partido) {
      return res.status(404).json({ message: "Partido no encontrado" });
    }
    res.json(partido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createPartido
exports.createPartido = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = [
      "PartidoFecha",
      "PartidoHoraInicio",
      "PartidoCategoria",
      "CanchaId",
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

    // Validar PartidoEstado (puede ser boolean o string)
    if (
      req.body.PartidoEstado === undefined ||
      req.body.PartidoEstado === null
    ) {
      return res.status(400).json({
        success: false,
        message: "El campo PartidoEstado es requerido",
      });
    }

    // Validar que existan jugadores
    if (
      !req.body.jugadores ||
      !Array.isArray(req.body.jugadores) ||
      req.body.jugadores.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Debe incluir al menos un jugador",
      });
    }

    // Convertir horas a formato TIMESTAMP
    const partidoData = { ...req.body };
    const { PartidoFecha, PartidoHoraInicio, PartidoHoraFin } = partidoData;

    // Crear timestamps combinando fecha y hora
    partidoData.PartidoHoraInicio = `${PartidoFecha} ${PartidoHoraInicio}:00`;
    if (PartidoHoraFin) {
      partidoData.PartidoHoraFin = `${PartidoFecha} ${PartidoHoraFin}:00`;
    }

    // Crear partido
    const nuevoPartido = await Partido.create(partidoData);

    // Crear partidojugadores
    const jugadoresCreados = [];
    for (let i = 0; i < req.body.jugadores.length; i++) {
      const jugador = req.body.jugadores[i];
      const jugadorData = {
        PartidoId: nuevoPartido.PartidoId,
        ClienteId: jugador.ClienteId,
        PartidoJugadorPareja: jugador.PartidoJugadorPareja,
        PartidoJugadorResultado: jugador.PartidoJugadorResultado || "",
        PartidoJugadorObs: jugador.PartidoJugadorObs || "",
      };

      const nuevoJugador = await PartidoJugador.create(jugadorData);
      // Asignar ID secuencial empezando desde 1
      nuevoJugador.PartidoJugadorId = i + 1;
      jugadoresCreados.push(nuevoJugador);
    }

    // Preparar respuesta con jugadores incluidos
    const respuesta = {
      ...nuevoPartido,
      jugadores: jugadoresCreados,
    };

    res.status(201).json({
      success: true,
      data: respuesta,
      message: "Partido creado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear partido",
      error: error.message,
    });
  }
};

// updatePartido
exports.updatePartido = async (req, res) => {
  try {
    const { id } = req.params;
    const partidoData = { ...req.body };

    if (!partidoData.PartidoFecha) {
      return res.status(400).json({
        success: false,
        message: "PartidoFecha es un campo requerido",
      });
    }

    // Convertir horas a formato TIMESTAMP si están presentes
    const { PartidoFecha, PartidoHoraInicio, PartidoHoraFin } = partidoData;
    if (PartidoHoraInicio) {
      partidoData.PartidoHoraInicio = `${PartidoFecha} ${PartidoHoraInicio}:00`;
    }
    if (PartidoHoraFin) {
      partidoData.PartidoHoraFin = `${PartidoFecha} ${PartidoHoraFin}:00`;
    }

    // Remover jugadores del objeto partidoData para evitar conflictos
    const { jugadores, ...partidoDataSinJugadores } = partidoData;

    const updatedPartido = await Partido.update(id, partidoDataSinJugadores);
    if (!updatedPartido) {
      return res.status(404).json({
        success: false,
        message: "Partido no encontrado",
      });
    }

    // Si se proporcionaron jugadores, actualizar la tabla partidojugador
    if (jugadores && Array.isArray(jugadores)) {
      // Eliminar jugadores existentes
      await PartidoJugador.deleteByPartidoId(id);

      // Crear nuevos jugadores
      const jugadoresCreados = [];
      for (let i = 0; i < jugadores.length; i++) {
        const jugador = jugadores[i];
        const jugadorData = {
          PartidoId: parseInt(id),
          ClienteId: jugador.ClienteId,
          PartidoJugadorPareja: jugador.PartidoJugadorPareja,
          PartidoJugadorResultado: jugador.PartidoJugadorResultado || "",
          PartidoJugadorObs: jugador.PartidoJugadorObs || "",
        };

        const nuevoJugador = await PartidoJugador.create(jugadorData);
        // Asignar ID secuencial empezando desde 1
        nuevoJugador.PartidoJugadorId = i + 1;
        jugadoresCreados.push(nuevoJugador);
      }

      // Incluir jugadores en la respuesta
      updatedPartido.jugadores = jugadoresCreados;
    }

    res.json({
      success: true,
      data: updatedPartido,
      message: "Partido actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar partido",
      error: error.message,
    });
  }
};

// deletePartido
exports.deletePartido = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero eliminar los partidojugadores asociados
    await PartidoJugador.deleteByPartidoId(id);

    // Luego eliminar el partido
    const deleted = await Partido.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Partido no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Partido eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar partido",
      error: error.message,
    });
  }
};

// Obtener todos los partidos sin paginación
exports.getAllPartidosSinPaginacion = async (req, res) => {
  try {
    const partidos = await Partido.getAll();
    res.json({ data: partidos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
