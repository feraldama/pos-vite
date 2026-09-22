/**
 * Reconocimiento de errores del motor de base de datos.
 *
 * Los controladores detectaban las violaciones de clave foránea buscando el
 * texto "a foreign key constraint fails", que es de MySQL. Al pasar a
 * PostgreSQL esa comprobación dejó de coincidir nunca: en vez del mensaje
 * amable ("no se puede eliminar porque tiene movimientos asociados") el usuario
 * recibía un 500 con el error crudo del motor.
 *
 * Acá se mira el código SQLSTATE, que es estándar, y como respaldo el texto en
 * español y en inglés.
 */

// Códigos SQLSTATE (los comparte PostgreSQL con el estándar)
const CLAVE_FORANEA = "23503";
const CLAVE_DUPLICADA = "23505";
const NO_NULO = "23502";

function texto(error) {
  return (error && error.message) || "";
}

/** La fila está referenciada por otra tabla, o referencia algo que no existe. */
function esClaveForanea(error) {
  if (!error) return false;
  if (error.code === CLAVE_FORANEA) return true;
  // MySQL, por si alguna instalación sigue apuntando allá
  return /foreign key constraint fails|llave for[aá]nea/i.test(texto(error));
}

/** Ya existe una fila con esa clave. */
function esClaveDuplicada(error) {
  if (!error) return false;
  if (error.code === CLAVE_DUPLICADA) return true;
  return /duplicate entry|llave duplicada/i.test(texto(error));
}

/** Falta un valor obligatorio. */
function esNoNulo(error) {
  if (!error) return false;
  if (error.code === NO_NULO) return true;
  return /cannot be null|valor nulo/i.test(texto(error));
}

module.exports = { esClaveForanea, esClaveDuplicada, esNoNulo };
