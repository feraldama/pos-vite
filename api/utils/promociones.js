/**
 * Reglas de las promociones configurables (tabla promocion).
 *
 *   CU (cumpleaños): el cliente tiene el beneficio dentro de la ventana
 *      [cumpleaños - PromocionDiasAntes, cumpleaños + PromocionDiasDespues],
 *      una sola vez por ventana.
 *   FR (frecuencia): cada PromocionCantidad servicios pagos de los productos
 *      con rol C, el siguiente tiene el beneficio. El conteo arranca de nuevo
 *      después de cada uso. Con PromocionVigenciaDias > 0 solo cuentan los
 *      servicios de esos últimos días.
 *
 * Beneficio: R = el producto va a Gs. 0; D = PromocionDescuento % sobre el
 * precio de lista. Se aplica a una unidad de un producto con rol B (si la
 * promoción no tiene productos B, a cualquier producto).
 *
 * Todas las funciones reciben `q(sql, params)`, que devuelve { rows }: sirve
 * tanto client.q dentro de una transacción como una consulta suelta al pool.
 */
const { pool, translateQuery } = require("../config/db");

/** El cliente genérico de mostrador: no acumula ni recibe promociones. */
const CLIENTE_SIN_NOMBRE = 1;

const qPool = (sql, params = []) => pool.query(translateQuery(sql), params);

// --- Fechas como texto AAAA-MM-DD, calculadas en UTC para no correrse ------
const aFecha = (s) => new Date(`${s}T00:00:00Z`);
const aTexto = (d) => d.toISOString().slice(0, 10);
const sumarDias = (s, n) => {
  const d = aFecha(s);
  d.setUTCDate(d.getUTCDate() + n);
  return aTexto(d);
};
const esBisiesto = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Fecha de hoy en la zona del servidor (TZ=America/Asuncion en la VPS). */
function hoyLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Si `fecha` cae en la ventana de cumpleaños, devuelve su inicio; si no, null.
 * Se prueban los cumpleaños del año anterior, el actual y el siguiente para
 * cubrir ventanas que cruzan el cambio de año. Un 29/02 se festeja el 28/02
 * en los años que no son bisiestos.
 */
function inicioVentanaCumple(nacimiento, fecha, diasAntes, diasDespues) {
  if (!nacimiento) return null;
  const [, mes, dia] = nacimiento.split("-").map(Number);
  const anio = Number(fecha.slice(0, 4));
  for (const y of [anio - 1, anio, anio + 1]) {
    const d = mes === 2 && dia === 29 && !esBisiesto(y) ? 28 : dia;
    const cumple = `${y}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const desde = sumarDias(cumple, -diasAntes);
    const hasta = sumarDias(cumple, diasDespues);
    if (fecha >= desde && fecha <= hasta) return desde;
  }
  return null;
}

/** Promociones activas con sus productos (C y B). */
async function promocionesActivas(q = qPool) {
  const promos = (
    await q(`SELECT * FROM promocion WHERE PromocionActiva = 1 ORDER BY PromocionId`)
  ).rows;
  if (!promos.length) return [];
  const productos = (
    await q(
      `SELECT pp.PromocionId, pp.PromocionProductoRol, p.ProductoId, p.ProductoNombre,
              p.ProductoPrecioVenta, p.ProductoPrecioVentaMayorista
         FROM promocionproducto pp
         JOIN producto p ON p.ProductoId = pp.ProductoId`
    )
  ).rows;
  return promos.map((pr) => ({
    ...pr,
    PromocionDescuento: Number(pr.PromocionDescuento),
    cuentan: productos.filter((x) => x.PromocionId === pr.PromocionId && x.PromocionProductoRol === "C"),
    beneficio: productos.filter((x) => x.PromocionId === pr.PromocionId && x.PromocionProductoRol === "B"),
  }));
}

async function datosCliente(q, clienteId) {
  const r = await q(
    `SELECT ClienteId, ClienteTipo, TO_CHAR(ClienteFechaNacimiento, 'YYYY-MM-DD') AS Nacimiento
       FROM clientes WHERE ClienteId = ?`,
    [clienteId]
  );
  return r.rows[0] || null;
}

/** Servicios que cuentan para una promoción FR desde su último uso. */
async function serviciosAcumulados(q, promo, clienteId, fecha) {
  const ultimo = await q(
    `SELECT COALESCE(MAX(VentaId), 0) AS ultima FROM ventapromocion WHERE ClienteId = ? AND PromocionId = ?`,
    [clienteId, promo.PromocionId]
  );
  const desde =
    promo.PromocionVigenciaDias > 0 ? sumarDias(fecha, -promo.PromocionVigenciaDias) : "1900-01-01";
  // Las líneas que fueron beneficio de cualquier promoción no cuentan.
  const r = await q(
    `SELECT COALESCE(SUM(vp.VentaProductoCantidad), 0) AS acumulados
       FROM ventaproducto vp
       JOIN venta v ON v.VentaId = vp.VentaId
       LEFT JOIN ventapromocion x
              ON x.VentaId = vp.VentaId AND x.VentaProductoId = vp.VentaProductoId
      WHERE v.ClienteId = ?
        AND v.VentaId > ?
        AND v.VentaFecha >= ?
        AND x.VentaId IS NULL
        AND vp.ProductoId IN (
              SELECT ProductoId FROM promocionproducto
               WHERE PromocionId = ? AND PromocionProductoRol = 'C')`,
    [clienteId, Number(ultimo.rows[0].ultima), desde, promo.PromocionId]
  );
  return Number(r.rows[0].acumulados);
}

/**
 * Evalúa una promoción para un cliente en una fecha.
 * Devuelve { disponible, progreso, requerido, motivo }.
 */
async function evaluar(q, promo, cliente, fecha) {
  if (!cliente || cliente.ClienteId === CLIENTE_SIN_NOMBRE) {
    return { disponible: false, motivo: "Seleccioná un cliente registrado" };
  }
  if (promo.PromocionTipo === "CU") {
    if (!cliente.Nacimiento) {
      return { disponible: false, motivo: "El cliente no tiene fecha de nacimiento cargada" };
    }
    const inicio = inicioVentanaCumple(
      cliente.Nacimiento,
      fecha,
      promo.PromocionDiasAntes,
      promo.PromocionDiasDespues
    );
    if (!inicio) return { disponible: false, motivo: "Fuera de la fecha de cumpleaños" };
    const usada = await q(
      `SELECT 1 FROM ventapromocion
        WHERE ClienteId = ? AND PromocionId = ? AND VentaPromocionFecha >= ?`,
      [cliente.ClienteId, promo.PromocionId, inicio]
    );
    if (usada.rows.length) return { disponible: false, motivo: "Ya usó el beneficio de este cumpleaños" };
    return { disponible: true, enVentana: true };
  }

  // FR
  const requerido = promo.PromocionCantidad;
  if (requerido <= 0 || !promo.cuentan.length) {
    return { disponible: false, motivo: "La promoción no está bien configurada" };
  }
  const acumulados = await serviciosAcumulados(q, promo, cliente.ClienteId, fecha);
  return {
    disponible: acumulados >= requerido,
    progreso: Math.min(acumulados, requerido),
    requerido,
  };
}

/** Precio de lista de un producto para el tipo de cliente. */
const precioLista = (producto, clienteTipo) =>
  Number(clienteTipo === "MA" ? producto.ProductoPrecioVentaMayorista : producto.ProductoPrecioVenta) || 0;

/** Precio con el beneficio aplicado (sin decimales, como el resto de la app). */
const precioConBeneficio = (promo, lista) =>
  promo.PromocionBeneficio === "R" ? 0 : Math.round(lista * (1 - promo.PromocionDescuento / 100));

/**
 * Estado de todas las promociones activas para un cliente (pantalla de venta).
 */
async function estadoCliente(clienteId, fecha = hoyLocal(), q = qPool) {
  const cliente = await datosCliente(q, clienteId);
  if (!cliente) return [];
  const promos = await promocionesActivas(q);
  const resultado = [];
  for (const promo of promos) {
    const estado = await evaluar(q, promo, cliente, fecha);
    resultado.push({
      PromocionId: promo.PromocionId,
      PromocionNombre: promo.PromocionNombre,
      PromocionTipo: promo.PromocionTipo,
      PromocionBeneficio: promo.PromocionBeneficio,
      PromocionDescuento: promo.PromocionDescuento,
      PromocionMensaje: promo.PromocionMensaje,
      ...estado,
      // Vacío = cualquier producto
      productosBeneficio: promo.beneficio.map((p) => ({
        ProductoId: p.ProductoId,
        ProductoNombre: p.ProductoNombre,
        precioLista: precioLista(p, cliente.ClienteTipo),
        precio: precioConBeneficio(promo, precioLista(p, cliente.ClienteTipo)),
      })),
    });
  }
  return resultado;
}

function error(mensaje, status = 400) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

/**
 * Valida las líneas con promocionId de una venta, dentro de la transacción.
 * Devuelve, por índice de ítem, lo que hay que grabar en ventapromocion.
 * Lanza un error 400 si algo no corresponde.
 */
async function validarPromocionesVenta(q, { clienteId, fecha, items }) {
  const conPromo = items
    .map((it, indice) => ({ it, indice }))
    .filter(({ it }) => it.promocionId);
  if (!conPromo.length) return [];

  // Bloquea al cliente: dos ventas simultáneas no pueden usar el mismo beneficio.
  await q(`SELECT ClienteId FROM clientes WHERE ClienteId = ? FOR UPDATE`, [clienteId]);
  const cliente = await datosCliente(q, clienteId);
  const promos = await promocionesActivas(q);
  const usadas = new Set();
  const aGrabar = [];

  for (const { it, indice } of conPromo) {
    const promo = promos.find((p) => p.PromocionId === Number(it.promocionId));
    if (!promo) throw error("La promoción no existe o no está activa");
    if (usadas.has(promo.PromocionId)) {
      throw error(`La promoción "${promo.PromocionNombre}" se puede aplicar una sola vez por venta`);
    }
    usadas.add(promo.PromocionId);
    if (Number(it.cantidad) !== 1) {
      throw error(`El beneficio de "${promo.PromocionNombre}" es para una unidad`);
    }
    if (promo.beneficio.length && !promo.beneficio.some((p) => p.ProductoId === Number(it.productoId))) {
      throw error(`Ese producto no está incluido en "${promo.PromocionNombre}"`);
    }

    const estado = await evaluar(q, promo, cliente, fecha);
    if (!estado.disponible) {
      throw error(`"${promo.PromocionNombre}": ${estado.motivo || "el cliente todavía no llega al beneficio"}`);
    }

    const prod = await q(
      `SELECT ProductoPrecioVenta, ProductoPrecioVentaMayorista FROM producto WHERE ProductoId = ?`,
      [it.productoId]
    );
    if (!prod.rows.length) throw error(`El producto ${it.productoId} no existe`);
    const lista = precioLista(prod.rows[0], cliente.ClienteTipo);
    const esperado = precioConBeneficio(promo, lista);
    if (Math.round(Number(it.precio)) !== esperado || Math.round(Number(it.precioTotal)) !== esperado) {
      throw error(
        `El precio con "${promo.PromocionNombre}" debe ser Gs. ${esperado}. Volvé a aplicar la promoción.`
      );
    }
    aGrabar.push({ indice, promocionId: promo.PromocionId, descuento: lista - esperado });
  }
  return aGrabar;
}

module.exports = {
  CLIENTE_SIN_NOMBRE,
  hoyLocal,
  inicioVentanaCumple,
  promocionesActivas,
  estadoCliente,
  validarPromocionesVenta,
};
