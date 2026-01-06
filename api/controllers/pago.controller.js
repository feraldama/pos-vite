const Pago = require("../models/pago.model");
const Suscripcion = require("../models/suscripcion.model");
const Plan = require("../models/plan.model");

exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "PagoId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Pago.getAllPaginated(limit, offset, sortBy, sortOrder);
    res.json({
      data: result.pagos,
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
    const pago = await Pago.getById(req.params.id);
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    res.json(pago);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    let suscripcionId = req.body.SuscripcionId;

    // Si se envía ClienteId y PlanId pero no SuscripcionId, crear la suscripción automáticamente
    if (!suscripcionId && req.body.ClienteId && req.body.PlanId) {
      // Obtener el plan para calcular la duración
      const plan = await Plan.getById(req.body.PlanId);
      if (!plan) {
        return res.status(400).json({
          message: "Plan no encontrado",
        });
      }

      // Calcular fechas: fecha_inicio = hoy, fecha_fin = hoy + duración
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaInicio = hoy.toISOString().split("T")[0];

      const fechaFin = new Date(hoy);
      fechaFin.setDate(fechaFin.getDate() + (plan.PlanDuracion || 30));
      const fechaFinStr = fechaFin.toISOString().split("T")[0];

      // Crear la suscripción (el estado se calcula automáticamente en el frontend)
      const nuevaSuscripcion = await Suscripcion.create({
        ClienteId: req.body.ClienteId,
        PlanId: req.body.PlanId,
        SuscripcionFechaInicio: fechaInicio,
        SuscripcionFechaFin: fechaFinStr,
      });

      suscripcionId = nuevaSuscripcion.SuscripcionId;
    }

    // Validar que tenemos un SuscripcionId
    if (!suscripcionId) {
      return res.status(400).json({
        message:
          "Se requiere SuscripcionId o ClienteId y PlanId para crear el pago",
      });
    }

    // Crear el pago con el SuscripcionId (ya sea el enviado o el creado)
    const pagoData = {
      ...req.body,
      SuscripcionId: suscripcionId,
    };

    const pago = await Pago.create(pagoData);
    res.status(201).json({
      message: "Pago creado exitosamente",
      data: pago,
      suscripcionCreada:
        !req.body.SuscripcionId && req.body.ClienteId && req.body.PlanId,
    });
  } catch (error) {
    console.error("Error al crear pago:", error);
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const pago = await Pago.update(req.params.id, req.body);
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    res.json({ message: "Pago actualizado exitosamente", data: pago });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await Pago.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    res.json({ message: "Pago eliminado exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el pago porque tiene registros asociados.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.searchPagos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "PagoId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await Pago.searchPagos(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.pagos,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar pagos" });
  }
};
