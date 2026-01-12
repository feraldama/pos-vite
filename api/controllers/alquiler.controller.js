const Alquiler = require("../models/alquiler.model");
const AlquilerPrendas = require("../models/alquilerprendas.model");
const RegistroDiarioCaja = require("../models/registrodiariocaja.model");

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

    // Registrar ingresos en registrodiariocaja si se proporcionan datos de pago
    // Usar try-catch para que si falla el registro en caja, no falle el alquiler
    if (req.body.pagos && req.body.CajaId && req.body.UsuarioId) {
      try {
        const { pagos, CajaId, UsuarioId } = req.body;
        const fechaActual = new Date();
        const registrosPromesas = [];

        // TipoGastoId = 2 para ingresos
        const tipoGastoId = 2;

        // Efectivo -> TipoGastoGrupoId = 1 (VENTA)
        if (pagos.efectivo && pagos.efectivo > 0) {
          registrosPromesas.push(
            RegistroDiarioCaja.create({
              CajaId: CajaId,
              RegistroDiarioCajaFecha: fechaActual,
              TipoGastoId: tipoGastoId,
              TipoGastoGrupoId: 1, // VENTA
              RegistroDiarioCajaDetalle: `Alquiler #${nuevoAlquiler.AlquilerId} - Efectivo`,
              RegistroDiarioCajaMonto: pagos.efectivo,
              UsuarioId: UsuarioId,
            })
          );
        }

        // Transferencia -> TipoGastoGrupoId = 6 (TRANSFER)
        if (pagos.transferencia && pagos.transferencia > 0) {
          registrosPromesas.push(
            RegistroDiarioCaja.create({
              CajaId: CajaId,
              RegistroDiarioCajaFecha: fechaActual,
              TipoGastoId: tipoGastoId,
              TipoGastoGrupoId: 6, // TRANSFER
              RegistroDiarioCajaDetalle: `Alquiler #${nuevoAlquiler.AlquilerId} - Transferencia`,
              RegistroDiarioCajaMonto: pagos.transferencia,
              UsuarioId: UsuarioId,
            })
          );
        }

        // Tarjeta Débito (con 3% adicional) -> TipoGastoGrupoId = 4 (VENTA POS)
        if (pagos.tarjetaDebito && pagos.tarjetaDebito > 0) {
          const montoConAdicional = pagos.tarjetaDebito * 1.03;
          registrosPromesas.push(
            RegistroDiarioCaja.create({
              CajaId: CajaId,
              RegistroDiarioCajaFecha: fechaActual,
              TipoGastoId: tipoGastoId,
              TipoGastoGrupoId: 4, // VENTA POS
              RegistroDiarioCajaDetalle: `Alquiler #${nuevoAlquiler.AlquilerId} - Tarjeta Débito (3% adicional)`,
              RegistroDiarioCajaMonto: Math.round(montoConAdicional),
              UsuarioId: UsuarioId,
            })
          );
        }

        // Tarjeta Crédito (con 5% adicional) -> TipoGastoGrupoId = 4 (VENTA POS)
        if (pagos.tarjetaCredito && pagos.tarjetaCredito > 0) {
          const montoConAdicional = pagos.tarjetaCredito * 1.05;
          registrosPromesas.push(
            RegistroDiarioCaja.create({
              CajaId: CajaId,
              RegistroDiarioCajaFecha: fechaActual,
              TipoGastoId: tipoGastoId,
              TipoGastoGrupoId: 4, // VENTA POS
              RegistroDiarioCajaDetalle: `Alquiler #${nuevoAlquiler.AlquilerId} - Tarjeta Crédito (5% adicional)`,
              RegistroDiarioCajaMonto: Math.round(montoConAdicional),
              UsuarioId: UsuarioId,
            })
          );
        }

        // Voucher (descuento) -> No se registra como ingreso porque es un descuento
        // El voucher reduce el total a pagar pero no genera ingreso real

        // Ejecutar todas las promesas en paralelo
        if (registrosPromesas.length > 0) {
          await Promise.all(registrosPromesas);
        }
      } catch (error) {
        // Si falla el registro en caja, solo loguear el error pero no fallar el alquiler
        console.error("Error al registrar ingresos en caja:", error);
        // El alquiler ya se creó exitosamente, así que continuamos
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
