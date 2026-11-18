// Búsqueda de clientes compartida por el dashboard (alquileres próximos) y la
// pantalla de Clientes.
//
// - Por nombre, apellido, cédula/RUC o teléfono.
// - Cada palabra tiene que aparecer, en cualquier orden: "morales luis".
// - Sin distinguir mayúsculas ni tildes: "alarcon" encuentra "ALARCÓN"
//   (la ñ se respeta).
// - Los números se comparan sin puntos, guiones ni espacios: "4.725.413"
//   encuentra el RUC "4725413-0" y "0982 497 769" el teléfono "0982497769".
//
// Devuelve { sql, params } para usar en un WHERE con db.query (estilo MySQL,
// con ? como placeholder). `alias` es el de la tabla clientes en la consulta.

const CON_TILDE = "ÁÉÍÓÚÜáéíóúü";
const SIN_TILDE = "AEIOUUaeiouu";

// Teléfonos desde 4 dígitos: con menos ("09") coincidirían casi todos
const MIN_DIGITOS_TELEFONO = 4;
const MAX_PALABRAS = 5;

const quitarTildes = (texto) =>
  texto.replace(/[ÁÉÍÓÚÜáéíóúü]/g, (c) => SIN_TILDE[CON_TILDE.indexOf(c)]);

function palabrasDeBusqueda(busqueda) {
  const texto = String(busqueda ?? "").trim();
  if (!texto) return [];
  // Solo números (con espacios, puntos o guiones): es una cédula o un
  // teléfono escrito por partes -> un único número
  if (/^[\d\s.-]+$/.test(texto)) {
    const digitos = texto.replace(/\D/g, "");
    return digitos ? [digitos] : [];
  }
  return texto.split(/\s+/).filter(Boolean).slice(0, MAX_PALABRAS);
}

function condicionBusquedaCliente(busqueda, alias = "c") {
  const col = (nombre) => `${alias}.${nombre}`;
  const soloDigitos = (nombre) => `regexp_replace(${col(nombre)}, '[^0-9]', '', 'g')`;
  const sql = [];
  const params = [];

  for (const palabra of palabrasDeBusqueda(busqueda)) {
    const digitos = palabra.replace(/\D/g, "");
    const opciones = [
      `translate(CONCAT(${col("ClienteNombre")}, ' ', ${col("ClienteApellido")}, ' ', ${col(
        "ClienteRUC"
      )}), '${CON_TILDE}', '${SIN_TILDE}') LIKE ?`,
    ];
    params.push(`%${quitarTildes(palabra)}%`);
    if (digitos) {
      opciones.push(`${soloDigitos("ClienteRUC")} LIKE ?`);
      params.push(`%${digitos}%`);
    }
    if (digitos.length >= MIN_DIGITOS_TELEFONO) {
      opciones.push(`${soloDigitos("ClienteTelefono")} LIKE ?`);
      params.push(`%${digitos}%`);
    }
    sql.push(`(${opciones.join(" OR ")})`);
  }

  return { sql: sql.length ? sql.join(" AND ") : "TRUE", params };
}

module.exports = {
  condicionBusquedaCliente,
  palabrasDeBusqueda,
  quitarTildes,
  MIN_DIGITOS_TELEFONO,
};
