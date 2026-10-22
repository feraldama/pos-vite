/**
 * Pagos por transferencia: lo que el negocio paga por transferencia bancaria.
 * No pasan por la caja. Cada usuario ve y edita sus propios pagos; un
 * administrador ve y edita los de todos.
 */
const { pool, translateQuery } = require("../config/db");
const PerfilMenu = require("../models/perfilmenu.model");
const { esClaveForanea } = require("../utils/db-errors");

const q = (sql, params = []) => pool.query(translateQuery(sql), params);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const GRUPO_CIERRE = 2;
const MAX_COMPROBANTE = 5 * 1024 * 1024;
const TIPOS_COMPROBANTE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function error(mensaje, status = 400) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

function responderError(res, err, contexto) {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(`Error en ${contexto}:`, err.message);
  return res.status(500).json({ success: false, message: `Error al ${contexto}` });
}

const esAdmin = (req) => req.user?.isAdmin === "S";
const texto = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Valida y normaliza el cuerpo de alta/edición. */
function leerPago(body) {
  const p = {
    fecha: body.PagoFecha,
    monto: Number(body.PagoMonto),
    beneficiario: texto(body.PagoBeneficiario),
    concepto: texto(body.PagoConcepto),
    grupo: Number(body.TipoGastoGrupoId),
    cuenta: texto(body.PagoCuentaOrigen),
    operacion: texto(body.PagoNumeroOperacion),
  };
  if (!FECHA.test(p.fecha || "")) throw error("Indicá la fecha del pago");
  if (!Number.isInteger(p.monto) || p.monto <= 0) {
    throw error("El monto tiene que ser un número entero mayor a 0");
  }
  if (!p.beneficiario) throw error("Indicá a quién se le pagó");
  if (p.beneficiario.length > 100) throw error("El beneficiario no puede superar 100 caracteres");
  if (p.concepto.length < 5) {
    throw error("Detallá en qué se gastó (al menos 5 caracteres)");
  }
  if (p.concepto.length > 250) throw error("El concepto no puede superar 250 caracteres");
  if (!Number.isInteger(p.grupo) || p.grupo <= 0 || p.grupo === GRUPO_CIERRE) {
    throw error("Elegí la categoría del pago");
  }
  if (p.cuenta.length > 60) throw error("La cuenta no puede superar 60 caracteres");
  if (p.operacion.length > 60) throw error("El N° de operación no puede superar 60 caracteres");
  return p;
}

/**
 * Comprobante adjunto: undefined = no se toca, null = se quita,
 * { nombre, tipo, base64 } = se reemplaza.
 */
function leerComprobante(c) {
  if (c === undefined) return undefined;
  if (c === null) return null;
  const tipo = String(c.tipo || "");
  if (!TIPOS_COMPROBANTE.includes(tipo)) {
    throw error("El comprobante tiene que ser una imagen (JPG, PNG, WEBP) o un PDF");
  }
  const datos = Buffer.from(String(c.base64 || ""), "base64");
  if (!datos.length) throw error("El comprobante está vacío");
  if (datos.length > MAX_COMPROBANTE) throw error("El comprobante no puede superar 5 MB");
  return { datos, tipo, nombre: texto(c.nombre).slice(0, 150) };
}

const COLUMNAS = `
  p.PagoTransferenciaId, TO_CHAR(p.PagoFecha, 'YYYY-MM-DD') AS PagoFecha, p.PagoMonto,
  p.PagoBeneficiario, p.PagoConcepto, p.TipoGastoGrupoId,
  g.TipoGastoGrupoDescripcion, p.PagoCuentaOrigen, p.PagoNumeroOperacion,
  p.PagoComprobanteNombre, (p.PagoComprobante IS NOT NULL) AS TieneComprobante,
  p.UsuarioId, TO_CHAR(p.PagoFechaCarga AT TIME ZONE 'America/Asuncion', 'YYYY-MM-DD HH24:MI') AS PagoFechaCarga`;

const DESDE_JOIN = `
  FROM pagotransferencia p
  LEFT JOIN tipogastogrupo g
    ON g.TipoGastoId = p.TipoGastoId AND g.TipoGastoGrupoId = p.TipoGastoGrupoId`;

const conMonto = (rows) => rows.map((r) => ({ ...r, PagoMonto: Number(r.PagoMonto) }));

function leerRango(query) {
  const { desde, hasta } = query;
  if (!FECHA.test(desde || "") || !FECHA.test(hasta || "")) {
    throw error("Las fechas desde y hasta son requeridas (AAAA-MM-DD)");
  }
  if (desde > hasta) throw error("La fecha desde no puede ser posterior a la fecha hasta");
  return { desde, hasta };
}

/** El pago, si existe y el usuario puede verlo (es suyo o es administrador). */
async function pagoVisible(req, id) {
  const r = await q(
    `SELECT PagoTransferenciaId, UsuarioId FROM pagotransferencia WHERE PagoTransferenciaId = ?`,
    [id]
  );
  const pago = r.rows[0];
  if (!pago || (!esAdmin(req) && pago.UsuarioId !== req.user?.id)) {
    throw error("Pago no encontrado", 404);
  }
  return pago;
}

/** GET /api/pagos-transferencia?desde=&hasta= — los propios, o todos si es admin */
exports.getAll = async (req, res) => {
  try {
    const { desde, hasta } = leerRango(req.query);
    const params = [desde, hasta];
    let filtro = "";
    if (!esAdmin(req)) {
      filtro = "AND p.UsuarioId = ?";
      params.push(req.user?.id);
    }
    const r = await q(
      `SELECT ${COLUMNAS} ${DESDE_JOIN}
        WHERE p.PagoFecha BETWEEN ? AND ? ${filtro}
        ORDER BY p.PagoFecha DESC, p.PagoTransferenciaId DESC`,
      params
    );
    res.json({ success: true, data: conMonto(r.rows) });
  } catch (err) {
    responderError(res, err, "obtener los pagos");
  }
};

/** GET /api/pagos-transferencia/sugerencias — beneficiarios y cuentas ya usados */
exports.sugerencias = async (req, res) => {
  try {
    const benef = await q(
      `SELECT DISTINCT PagoBeneficiario AS valor FROM pagotransferencia ORDER BY 1`
    );
    const cuentas = await q(
      `SELECT DISTINCT PagoCuentaOrigen AS valor FROM pagotransferencia
        WHERE PagoCuentaOrigen <> '' ORDER BY 1`
    );
    res.json({
      success: true,
      data: {
        beneficiarios: benef.rows.map((r) => r.valor),
        cuentas: cuentas.rows.map((r) => r.valor),
      },
    });
  } catch (err) {
    responderError(res, err, "obtener las sugerencias");
  }
};

/** GET /api/pagos-transferencia/:id/comprobante — el archivo adjunto */
exports.comprobante = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pagoVisible(req, id);
    const r = await q(
      `SELECT PagoComprobante, PagoComprobanteTipo, PagoComprobanteNombre
         FROM pagotransferencia WHERE PagoTransferenciaId = ?`,
      [id]
    );
    const fila = r.rows[0];
    if (!fila?.PagoComprobante) throw error("El pago no tiene comprobante", 404);
    res.set("Content-Type", fila.PagoComprobanteTipo || "application/octet-stream");
    res.set(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fila.PagoComprobanteNombre || `comprobante-${id}`)}"`
    );
    res.send(fila.PagoComprobante);
  } catch (err) {
    responderError(res, err, "obtener el comprobante");
  }
};

exports.create = async (req, res) => {
  try {
    const p = leerPago(req.body);
    const c = leerComprobante(req.body.comprobante);
    const r = await q(
      `INSERT INTO pagotransferencia
         (PagoFecha, PagoMonto, PagoBeneficiario, PagoConcepto, TipoGastoId, TipoGastoGrupoId,
          PagoCuentaOrigen, PagoNumeroOperacion, PagoComprobante, PagoComprobanteTipo,
          PagoComprobanteNombre, UsuarioId)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?) RETURNING "PagoTransferenciaId"`,
      [
        p.fecha, p.monto, p.beneficiario, p.concepto, p.grupo, p.cuenta, p.operacion,
        c ? c.datos : null, c ? c.tipo : "", c ? c.nombre : "", req.user?.id,
      ]
    );
    res.status(201).json({
      success: true,
      data: { PagoTransferenciaId: r.rows[0].PagoTransferenciaId },
      message: "Pago registrado",
    });
  } catch (err) {
    if (esClaveForanea(err)) err = error("La categoría o el usuario no existen");
    responderError(res, err, "registrar el pago");
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pagoVisible(req, id);
    const p = leerPago(req.body);
    const c = leerComprobante(req.body.comprobante);
    const campos = [
      "PagoFecha = ?", "PagoMonto = ?", "PagoBeneficiario = ?", "PagoConcepto = ?",
      "TipoGastoGrupoId = ?", "PagoCuentaOrigen = ?", "PagoNumeroOperacion = ?",
    ];
    const valores = [p.fecha, p.monto, p.beneficiario, p.concepto, p.grupo, p.cuenta, p.operacion];
    if (c !== undefined) {
      campos.push("PagoComprobante = ?", "PagoComprobanteTipo = ?", "PagoComprobanteNombre = ?");
      valores.push(c ? c.datos : null, c ? c.tipo : "", c ? c.nombre : "");
    }
    await q(
      `UPDATE pagotransferencia SET ${campos.join(", ")} WHERE PagoTransferenciaId = ?`,
      [...valores, id]
    );
    res.json({ success: true, message: "Pago actualizado" });
  } catch (err) {
    if (esClaveForanea(err)) err = error("La categoría elegida no existe");
    responderError(res, err, "actualizar el pago");
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pagoVisible(req, id);
    await q(`DELETE FROM pagotransferencia WHERE PagoTransferenciaId = ?`, [id]);
    res.json({ success: true, message: "Pago eliminado" });
  } catch (err) {
    responderError(res, err, "eliminar el pago");
  }
};

/** GET /api/pagos-transferencia/reporte?desde=&hasta= — los pagos de todos */
exports.reporte = async (req, res) => {
  try {
    if (!esAdmin(req)) {
      const permisos = await PerfilMenu.getPermisosByUsuarioId(req.user?.id);
      if (!permisos.REPORTES?.leer) throw error("No tenés permiso para ver reportes", 403);
    }
    const { desde, hasta } = leerRango(req.query);
    const r = await q(
      `SELECT ${COLUMNAS} ${DESDE_JOIN}
        WHERE p.PagoFecha BETWEEN ? AND ?
        ORDER BY p.PagoFecha, p.PagoTransferenciaId`,
      [desde, hasta]
    );
    res.json({ success: true, data: conMonto(r.rows) });
  } catch (err) {
    responderError(res, err, "obtener el reporte de pagos");
  }
};
