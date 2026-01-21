const RegistroDiarioCaja = require("../models/registrodiariocaja.model");
const CajaGasto = require("../models/cajagasto.model");
const db = require("../config/db");

// Obtener todos los registros con paginación
exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "RegistroDiarioCajaFecha";
  const sortOrder = req.query.sortOrder || "DESC";
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await RegistroDiarioCaja.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json(result);
  } catch (error) {
    console.error("Error al obtener registros:", error);
    res.status(500).json({ message: error.message });
  }
};

// Buscar registros
exports.search = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "RegistroDiarioCajaFecha";
    const sortOrder = req.query.sortOrder || "DESC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await RegistroDiarioCaja.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json(result);
  } catch (error) {
    console.error("Error en búsqueda de registros:", error);
    res.status(500).json({ error: "Error al buscar registros" });
  }
};

// Obtener un registro por ID
exports.getById = async (req, res) => {
  try {
    const registro = await RegistroDiarioCaja.getById(req.params.id);
    if (!registro) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }
    res.json(registro);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo registro
exports.create = async (req, res) => {
  try {
    const registro = await RegistroDiarioCaja.create({
      ...req.body,
      UsuarioId: req.user.id, // Asumiendo que tienes el usuario en req.user
    });
    res.status(201).json({
      message: "Registro creado exitosamente",
      data: registro,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un registro
exports.update = async (req, res) => {
  try {
    const registro = await RegistroDiarioCaja.update(req.params.id, req.body);
    if (!registro) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }
    res.json({
      message: "Registro actualizado exitosamente",
      data: registro,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un registro
exports.delete = async (req, res) => {
  try {
    // Obtener el registro antes de eliminarlo para tener los datos necesarios
    const registro = await RegistroDiarioCaja.getById(req.params.id);
    if (!registro) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    const {
      CajaId,
      TipoGastoId,
      TipoGastoGrupoId,
      RegistroDiarioCajaMonto,
      RegistroDiarioCajaCambio,
      RegistroDiarioCajaFecha,
      UsuarioId,
    } = registro;

    // Determinar si es ingreso (TipoGastoId === 2) o egreso (TipoGastoId === 1)
    // Al eliminar, invertimos la operación:
    // - Si era egreso (restó), ahora sumamos
    // - Si era ingreso (sumó), ahora restamos
    const esIngreso = TipoGastoId === 2;
    const monto = Number(RegistroDiarioCajaMonto) || 0;
    const cambio = Number(RegistroDiarioCajaCambio) || 0;

    // Conjunto de IDs de cajas a actualizar
    const cajasIdsParaActualizar = new Set();

    // Agregar la caja del registro
    if (CajaId) {
      cajasIdsParaActualizar.add(Number(CajaId));
    }

    // Obtener todas las cajas que tienen el mismo TipoGastoId y TipoGastoGrupoId en cajagasto
    if (TipoGastoId && TipoGastoGrupoId) {
      const cajasConGasto = await CajaGasto.getByTipoGastoAndGrupo(
        TipoGastoId,
        TipoGastoGrupoId
      );
      cajasConGasto.forEach((cajaGasto) => {
        if (cajaGasto.CajaId) {
          cajasIdsParaActualizar.add(Number(cajaGasto.CajaId));
        }
      });
    }

    // Actualizar el monto de todas las cajas afectadas
    if (cajasIdsParaActualizar.size > 0) {
      const actualizaciones = Array.from(cajasIdsParaActualizar).map(
        async (cajaIdParaActualizar) => {
          // Obtener el monto actual y el tipo de la caja
          const cajaActual = await new Promise((resolve, reject) => {
            db.query(
              "SELECT CajaMonto, CajaTipoId FROM Caja WHERE CajaId = ?",
              [cajaIdParaActualizar],
              (err, results) => {
                if (err) return reject(err);
                resolve(results.length > 0 ? results[0] : null);
              }
            );
          });

          if (cajaActual) {
            const cajaMontoActual = Number(cajaActual.CajaMonto) || 0;
            const cajaTipoId = Number(cajaActual.CajaTipoId);

            // Determinar qué valor usar según CajaTipoId
            // Si CajaTipoId === 3: usar RegistroDiarioCajaMonto / RegistroDiarioCajaCambio (cantidad)
            // Si CajaTipoId !== 3: usar RegistroDiarioCajaMonto (monto)
            let valorAUsar;
            if (cajaTipoId === 3 && cambio > 0) {
              valorAUsar = monto / cambio;
            } else {
              valorAUsar = monto;
            }

            let nuevoMonto;

            // Para CajaTipoId === 3 (cajas de divisa)
            // Si fue compra (egreso): restar
            // Si fue venta (ingreso): sumar
            if (cajaTipoId === 3) {
              if (esIngreso) {
                // Si fue venta (ingreso), al eliminar sumamos (revertir la venta)
                nuevoMonto = cajaMontoActual + valorAUsar;
              } else {
                // Si fue compra (egreso), al eliminar restamos (revertir la compra)
                nuevoMonto = cajaMontoActual - valorAUsar;
              }
            } else {
              // Para otras cajas (guaraníes), la lógica normal
              if (esIngreso) {
                // Si era ingreso, al eliminar restamos el valor
                nuevoMonto = cajaMontoActual - valorAUsar;
              } else {
                // Si era egreso, al eliminar sumamos el valor
                nuevoMonto = cajaMontoActual + valorAUsar;
              }
            }

            // Actualizar el monto de la caja
            await new Promise((resolve, reject) => {
              db.query(
                "UPDATE Caja SET CajaMonto = ? WHERE CajaId = ?",
                [nuevoMonto, cajaIdParaActualizar],
                (err) => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            });
          }
        }
      );

      await Promise.all(actualizaciones);
    }

    // Eliminar el registro
    const success = await RegistroDiarioCaja.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    res.json({ message: "Registro eliminado exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el registro porque tiene movimientos asociados.",
      });
    }
    console.error("Error al eliminar registro:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.aperturaCierreCaja = async (req, res) => {
  try {
    const { apertura, CajaId, Monto } = req.body;
    const UsuarioId = req.user?.id || req.body.UsuarioId;
    if (
      !CajaId ||
      typeof apertura === "undefined" ||
      typeof Monto === "undefined" ||
      !UsuarioId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Faltan datos requeridos" });
    }
    let Sigue = "N";
    let error = "";
    // Buscar última apertura y cierre
    const aperturaReg = await RegistroDiarioCaja.getUltimaApertura(CajaId);
    const cierreReg = await RegistroDiarioCaja.getUltimoCierre(CajaId);
    const RegistroDiarioCajaIdApertura = aperturaReg
      ? aperturaReg.RegistroDiarioCajaId
      : 0;
    const RegistroDiarioCajaIdCierre = cierreReg
      ? cierreReg.RegistroDiarioCajaId
      : 0;
    if (apertura == 0) {
      if (RegistroDiarioCajaIdApertura === 0) {
        Sigue = "S";
      } else if (RegistroDiarioCajaIdCierre > RegistroDiarioCajaIdApertura) {
        Sigue = "S";
      } else {
        Sigue = "N";
        error = "CAJA ABIERTA - DEBE REALIZAR EL CIERRE";
      }
    } else {
      if (RegistroDiarioCajaIdCierre < RegistroDiarioCajaIdApertura) {
        Sigue = "S";
      } else {
        Sigue = "N";
        error = "CAJA CERRADA - DEBE REALIZAR LA APERTURA";
      }
    }
    if (Sigue === "N") {
      return res.status(400).json({ success: false, message: error });
    }
    // Obtener descripción de caja
    const [caja] = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Caja WHERE CajaId = ?",
        [CajaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
    const CajaDescripcion = caja ? caja.CajaDescripcion : "";
    // APERTURA
    if (apertura == 0) {
      // Crear registro de apertura
      await RegistroDiarioCaja.create({
        CajaId,
        RegistroDiarioCajaFecha: new Date(),
        TipoGastoId: 2,
        TipoGastoGrupoId: 2,
        RegistroDiarioCajaDetalle: "APERTURA " + CajaDescripcion,
        RegistroDiarioCajaMonto: Monto,
        UsuarioId,
      });
      // Sumar monto a la caja
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE Caja SET CajaMonto = CajaMonto + ? WHERE CajaId = ?",
          [Monto, CajaId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      return res.json({
        success: true,
        message: "Apertura realizada correctamente",
      });
    } else {
      // CIERRE
      // Poner monto de caja en 0
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE Caja SET CajaMonto = 0 WHERE CajaId = ?",
          [CajaId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      // Crear registro de cierre
      await RegistroDiarioCaja.create({
        CajaId,
        RegistroDiarioCajaFecha: new Date(),
        TipoGastoId: 1,
        TipoGastoGrupoId: 2,
        RegistroDiarioCajaDetalle: "CIERRE " + CajaDescripcion,
        RegistroDiarioCajaMonto: Monto,
        UsuarioId,
      });
      return res.json({
        success: true,
        message: "Cierre realizado correctamente",
      });
    }
  } catch (error) {
    console.error("Error en apertura/cierre de caja:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
};

// Nuevo endpoint para saber si el usuario tiene caja aperturada
exports.estadoAperturaPorUsuario = async (req, res) => {
  try {
    const usuarioId = req.query.usuarioId;
    if (!usuarioId) {
      return res.status(400).json({ message: "Falta el parámetro usuarioId" });
    }
    const estado = await RegistroDiarioCaja.getEstadoAperturaPorUsuario(
      usuarioId
    );
    res.json(estado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reporte de pase de cajas
exports.reportePaseCajas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        message: "Faltan los parámetros fechaInicio y fechaFin",
      });
    }

    const registros = await RegistroDiarioCaja.getReportePaseCajas(
      fechaInicio,
      fechaFin
    );

    // Agrupar por caja y separar ingresos y egresos
    const reportePorCaja = {};

    registros.forEach((registro) => {
      const cajaId = registro.CajaId;
      const cajaKey = `caja_${cajaId}`;

      if (!reportePorCaja[cajaKey]) {
        reportePorCaja[cajaKey] = {
          CajaId: cajaId,
          CajaDescripcion: registro.CajaDescripcion || "",
          ingresos: [],
          egresos: [],
          totalIngresos: 0,
          totalEgresos: 0,
          saldo: 0,
        };
      }

      const monto = Number(registro.RegistroDiarioCajaMonto) || 0;

      // TipoGastoId === 2 es ingreso, TipoGastoId === 1 es egreso
      if (registro.TipoGastoId === 2) {
        reportePorCaja[cajaKey].ingresos.push(registro);
        reportePorCaja[cajaKey].totalIngresos += monto;
      } else if (registro.TipoGastoId === 1) {
        reportePorCaja[cajaKey].egresos.push(registro);
        reportePorCaja[cajaKey].totalEgresos += monto;
      }
    });

    // Calcular saldo para cada caja
    Object.keys(reportePorCaja).forEach((key) => {
      reportePorCaja[key].saldo =
        reportePorCaja[key].totalIngresos - reportePorCaja[key].totalEgresos;
    });

    // Convertir a array
    const reporte = Object.values(reportePorCaja);

    res.json({
      fechaInicio,
      fechaFin,
      data: reporte,
    });
  } catch (error) {
    console.error("Error al generar reporte de pase de cajas:", error);
    res.status(500).json({ message: error.message });
  }
};

// Reporte de movimientos de todas las cajas (CajaTipoId=1)
exports.reporteMovimientosCajas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        message: "Faltan los parámetros fechaInicio y fechaFin",
      });
    }

    const registros = await RegistroDiarioCaja.getReporteMovimientosCajas(
      fechaInicio,
      fechaFin
    );

    res.json({
      fechaInicio,
      fechaFin,
      data: registros,
    });
  } catch (error) {
    console.error("Error al generar reporte de movimientos de cajas:", error);
    res.status(500).json({ message: error.message });
  }
};
