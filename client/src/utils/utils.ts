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

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
  }).format(value);
};
