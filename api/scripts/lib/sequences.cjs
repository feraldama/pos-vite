/**
 * Tablas con clave autogenerada y utilidades para reposicionar sus secuencias.
 *
 * Cuando se insertan filas con el id explícito (una migración, una semilla de
 * pruebas, una restauración), PostgreSQL NO avanza la secuencia de identidad.
 * El siguiente INSERT sin id arranca en 1 y choca con la clave primaria.
 *
 * Vive acá para que la migración y la preparación de la base de pruebas usen
 * exactamente el mismo listado y no se desincronicen.
 */

const IDENTIDADES = {
  almacen: "AlmacenId",
  caja: "CajaId",
  clientes: "ClienteId",
  combo: "ComboId",
  compra: "CompraId",
  facturacredito: "FacturaCreditoId",
  local: "LocalId",
  perfil: "PerfilId",
  producto: "ProductoId",
  proveedor: "ProveedorId",
  registrodiariocaja: "RegistroDiarioCajaId",
  tipogasto: "TipoGastoId",
  traslado: "TrasladoId",
  venta: "VentaId",
  ventacredito: "VentaCreditoId",
};

/**
 * Deja cada secuencia justo por encima del MAX(id) de su tabla.
 * Si la tabla está vacía, la secuencia queda lista para entregar 1.
 * `ejecutor` es cualquier cosa con .query(sql): un Pool o un Client.
 */
async function resincronizarSecuencias(ejecutor) {
  for (const [tabla, columna] of Object.entries(IDENTIDADES)) {
    await ejecutor.query(
      `SELECT setval(
         pg_get_serial_sequence('"${tabla}"', '${columna}'),
         GREATEST(COALESCE((SELECT MAX("${columna}") FROM "${tabla}"), 0), 1),
         (SELECT COUNT(*) FROM "${tabla}") > 0
       )`
    );
  }
}

/**
 * Devuelve las secuencias que chocarían en el próximo INSERT.
 * Útil como verificación después de migrar o restaurar.
 */
async function secuenciasDesincronizadas(ejecutor) {
  const rotas = [];
  for (const [tabla, columna] of Object.entries(IDENTIDADES)) {
    const { rows } = await ejecutor.query(
      `SELECT pg_get_serial_sequence('"${tabla}"', '${columna}') AS secuencia,
              COALESCE((SELECT MAX("${columna}") FROM "${tabla}"), 0) AS maximo`
    );
    const { secuencia, maximo } = rows[0];
    if (!secuencia) continue;
    const est = await ejecutor.query(`SELECT last_value, is_called FROM ${secuencia}`);
    const { last_value, is_called } = est.rows[0];
    const proximo = is_called ? Number(last_value) + 1 : Number(last_value);
    const max = Number(maximo);
    if (max > 0 && proximo <= max) {
      rotas.push({ tabla, columna, maximo: max, proximo });
    }
  }
  return rotas;
}

module.exports = { IDENTIDADES, resincronizarSecuencias, secuenciasDesincronizadas };
