/**
 * Promociones configurables (cumpleaños y "cada N servicios").
 * Las reglas de elegibilidad están en utils/promociones.js.
 */
const { pool, translateQuery, withTransaction } = require("../config/db");
const { estadoCliente, hoyLocal } = require("../utils/promociones");

const q = (sql, params = []) => pool.query(translateQuery(sql), params);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

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

const entero = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};
const listaIds = (v) =>
  [...new Set((Array.isArray(v) ? v : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];

/** Valida y normaliza el cuerpo de alta/edición. */
function leerPromocion(body) {
  const p = {
    nombre: String(body.PromocionNombre || "").trim(),
    tipo: body.PromocionTipo,
    beneficio: body.PromocionBeneficio,
    descuento: Number(body.PromocionDescuento || 0),
    cantidad: entero(body.PromocionCantidad || 0),
    vigencia: entero(body.PromocionVigenciaDias || 0),
    antes: entero(body.PromocionDiasAntes || 0),
    despues: entero(body.PromocionDiasDespues || 0),
    activa: body.PromocionActiva === 0 || body.PromocionActiva === false ? 0 : 1,
    mensaje: String(body.PromocionMensaje || "").trim().slice(0, 200),
    cuentan: listaIds(body.productosCuentan),
    beneficioIds: listaIds(body.productosBeneficio),
  };
  if (!p.nombre) throw error("El nombre es requerido");
  if (p.nombre.length > 60) throw error("El nombre no puede superar 60 caracteres");
  if (!["CU", "FR"].includes(p.tipo)) throw error("Elegí el tipo de promoción");
  if (!["D", "R"].includes(p.beneficio)) throw error("Elegí si el beneficio es descuento o regalo");
  if (p.beneficio === "D" && !(p.descuento > 0 && p.descuento <= 100)) {
    throw error("El descuento tiene que ser mayor a 0 y hasta 100%");
  }
  if (p.beneficio === "R") p.descuento = 0;
  if ([p.cantidad, p.vigencia, p.antes, p.despues].some(Number.isNaN)) {
    throw error("Las cantidades y los días tienen que ser números enteros, 0 o más");
  }
  if (p.tipo === "FR") {
    if (p.cantidad < 1) throw error("Indicá cuántos servicios hay que juntar");
    if (!p.cuentan.length) throw error("Elegí qué servicios cuentan para la promoción");
    p.antes = 0;
    p.despues = 0;
  } else {
    p.cantidad = 0;
    p.vigencia = 0;
    p.cuentan = [];
  }
  return p;
}

async function guardarProductos(client, id, p) {
  await client.q(`DELETE FROM promocionproducto WHERE PromocionId = ?`, [id]);
  for (const productoId of p.cuentan) {
    await client.q(
      `INSERT INTO promocionproducto (PromocionId, ProductoId, PromocionProductoRol) VALUES (?, ?, 'C')`,
      [id, productoId]
    );
  }
  for (const productoId of p.beneficioIds) {
    await client.q(
      `INSERT INTO promocionproducto (PromocionId, ProductoId, PromocionProductoRol) VALUES (?, ?, 'B')`,
      [id, productoId]
    );
  }
}

const valores = (p) => [
  p.nombre, p.tipo, p.beneficio, p.descuento, p.cantidad, p.vigencia, p.antes, p.despues, p.activa, p.mensaje,
];

exports.getAll = async (req, res) => {
  try {
    const promos = (await q(`SELECT * FROM promocion ORDER BY PromocionActiva DESC, PromocionNombre`)).rows;
    const prods = (await q(`SELECT PromocionId, ProductoId, PromocionProductoRol FROM promocionproducto`)).rows;
    const usos = (
      await q(`SELECT PromocionId, COUNT(*) AS usos FROM ventapromocion GROUP BY PromocionId`)
    ).rows;
    res.json({
      success: true,
      data: promos.map((pr) => ({
        ...pr,
        PromocionDescuento: Number(pr.PromocionDescuento),
        productosCuentan: prods
          .filter((x) => x.PromocionId === pr.PromocionId && x.PromocionProductoRol === "C")
          .map((x) => x.ProductoId),
        productosBeneficio: prods
          .filter((x) => x.PromocionId === pr.PromocionId && x.PromocionProductoRol === "B")
          .map((x) => x.ProductoId),
        usos: Number(usos.find((u) => u.PromocionId === pr.PromocionId)?.usos || 0),
      })),
    });
  } catch (err) {
    responderError(res, err, "obtener las promociones");
  }
};

exports.create = async (req, res) => {
  try {
    const p = leerPromocion(req.body);
    const id = await withTransaction(async (client) => {
      const ins = await client.q(
        `INSERT INTO promocion
           (PromocionNombre, PromocionTipo, PromocionBeneficio, PromocionDescuento, PromocionCantidad,
            PromocionVigenciaDias, PromocionDiasAntes, PromocionDiasDespues, PromocionActiva, PromocionMensaje)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING "PromocionId"`,
        valores(p)
      );
      const nuevoId = ins.rows[0].PromocionId;
      await guardarProductos(client, nuevoId, p);
      return nuevoId;
    });
    res.status(201).json({ success: true, data: { PromocionId: id }, message: "Promoción creada" });
  } catch (err) {
    responderError(res, err, "crear la promoción");
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const p = leerPromocion(req.body);
    await withTransaction(async (client) => {
      const upd = await client.q(
        `UPDATE promocion SET
           PromocionNombre = ?, PromocionTipo = ?, PromocionBeneficio = ?, PromocionDescuento = ?,
           PromocionCantidad = ?, PromocionVigenciaDias = ?, PromocionDiasAntes = ?,
           PromocionDiasDespues = ?, PromocionActiva = ?, PromocionMensaje = ?
         WHERE PromocionId = ?`,
        [...valores(p), id]
      );
      if (!upd.rowCount) throw error("Promoción no encontrada", 404);
      await guardarProductos(client, id, p);
    });
    res.json({ success: true, message: "Promoción actualizada" });
  } catch (err) {
    responderError(res, err, "actualizar la promoción");
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usos = await q(`SELECT COUNT(*) AS n FROM ventapromocion WHERE PromocionId = ?`, [id]);
    if (Number(usos.rows[0].n) > 0) {
      throw error(
        "La promoción ya se usó en ventas y no se puede eliminar. Desactivala para que deje de aplicarse.",
        409
      );
    }
    const del = await q(`DELETE FROM promocion WHERE PromocionId = ?`, [id]);
    if (!del.rowCount) throw error("Promoción no encontrada", 404);
    res.json({ success: true, message: "Promoción eliminada" });
  } catch (err) {
    responderError(res, err, "eliminar la promoción");
  }
};

/** GET /api/promociones/cliente/:clienteId?fecha=AAAA-MM-DD */
exports.estadoCliente = async (req, res) => {
  try {
    const fecha = FECHA.test(req.query.fecha || "") ? req.query.fecha : hoyLocal();
    const data = await estadoCliente(Number(req.params.clienteId), fecha);
    res.json({ success: true, data });
  } catch (err) {
    responderError(res, err, "obtener las promociones del cliente");
  }
};

/** GET /api/promociones/reportes/cumpleanos?mes=1..12 */
exports.reporteCumpleanos = async (req, res) => {
  try {
    const mes = Number(req.query.mes);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw error("Indicá un mes de 1 a 12");
    const r = await q(
      `SELECT ClienteId, ClienteNombre, ClienteApellido, ClienteTelefono, ClienteVehiculo,
              TO_CHAR(ClienteFechaNacimiento, 'YYYY-MM-DD') AS ClienteFechaNacimiento,
              EXTRACT(DAY FROM ClienteFechaNacimiento)::int AS dia
         FROM clientes
        WHERE ClienteFechaNacimiento IS NOT NULL
          AND EXTRACT(MONTH FROM ClienteFechaNacimiento) = ?
        ORDER BY dia, ClienteNombre`,
      [mes]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    responderError(res, err, "obtener los cumpleaños");
  }
};

/** GET /api/promociones/reportes/usos?desde=&hasta= */
exports.reporteUsos = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    if (!FECHA.test(desde || "") || !FECHA.test(hasta || "")) {
      throw error("Las fechas desde y hasta son requeridas (AAAA-MM-DD)");
    }
    if (desde > hasta) throw error("La fecha desde no puede ser posterior a la fecha hasta");
    const r = await q(
      `SELECT TO_CHAR(x.VentaPromocionFecha, 'YYYY-MM-DD') AS Fecha, x.VentaId,
              pr.PromocionNombre, pr.PromocionTipo, pr.PromocionBeneficio,
              c.ClienteId, c.ClienteNombre, c.ClienteApellido, c.ClienteTelefono,
              p.ProductoNombre, vp.VentaProductoPrecioTotal AS Cobrado,
              x.VentaPromocionDescuento AS Descuento
         FROM ventapromocion x
         JOIN promocion pr ON pr.PromocionId = x.PromocionId
         JOIN clientes c ON c.ClienteId = x.ClienteId
         JOIN ventaproducto vp ON vp.VentaId = x.VentaId AND vp.VentaProductoId = x.VentaProductoId
         JOIN producto p ON p.ProductoId = vp.ProductoId
        WHERE x.VentaPromocionFecha BETWEEN ? AND ?
        ORDER BY x.VentaPromocionFecha, x.VentaId`,
      [desde, hasta]
    );
    res.json({
      success: true,
      data: r.rows.map((row) => ({
        ...row,
        Cobrado: Number(row.Cobrado),
        Descuento: Number(row.Descuento),
      })),
    });
  } catch (err) {
    responderError(res, err, "obtener las promociones usadas");
  }
};
