/**
 * Formateo de números y moneda.
 *
 * Viven aparte de utils.ts a propósito: utils.ts importa jspdf, jspdf-autotable
 * y sweetalert2 para generar el presupuesto en PDF, así que tenerlos juntos
 * hacía que cualquier pantalla que mostrara un monto se descargara ~380 KB de
 * librerías de PDF que no necesita.
 */
export const formatMiles = (value: number | string): string => {
  const parseToNumber = (value: number | string): number => {
    if (typeof value === "string") {
      return parseFloat(value.replace(/\./g, "").replace(",", "."));
    }
    return value;
  };
  const commission = parseToNumber(value);
  const roundedCommission = Math.round(commission);
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(roundedCommission);
};

export const formatMilesWithDecimals = (value: number | string): string => {
  const parseToNumber = (value: number | string): number => {
    if (typeof value === "string") {
      // Si el string ya es un número válido, úsalo directamente
      if (/^\d+\.?\d*$/.test(value) && value.includes(".")) {
        return parseFloat(value);
      }
      // Si tiene formato español con comas como decimales
      return parseFloat(value.replace(/\./g, "").replace(",", "."));
    }
    return value;
  };
  const commission = parseToNumber(value);
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(commission);
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
  }).format(value);
};
