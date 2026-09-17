import * as XLSX from "xlsx";

export interface ProductoExport {
  ProductoId?: number;
  ProductoCodigo?: string;
  ProductoNombre?: string;
  ProductoPrecioVenta?: number;
  ProductoPrecioVentaMayorista?: number;
  ProductoPrecioUnitario?: number;
  ProductoPrecioPromedio?: number;
  ProductoStock?: number;
  ProductoStockUnitario?: number;
  ProductoCantidadCaja?: number;
  ProductoIVA?: number;
  ProductoStockMinimo?: number;
  LocalId?: number;
  LocalNombre?: string;
  [key: string]: unknown;
}

// Columnas de la planilla: encabezado, campo y ancho en caracteres
const COLUMNAS: {
  header: string;
  key: keyof ProductoExport;
  width: number;
  numero?: boolean;
  moneda?: boolean;
}[] = [
  { header: "ID", key: "ProductoId", width: 8, numero: true },
  { header: "Código", key: "ProductoCodigo", width: 16 },
  { header: "Nombre", key: "ProductoNombre", width: 45 },
  {
    header: "Precio Minorista",
    key: "ProductoPrecioVenta",
    width: 18,
    numero: true,
    moneda: true,
  },
  {
    header: "Precio Mayorista",
    key: "ProductoPrecioVentaMayorista",
    width: 18,
    numero: true,
    moneda: true,
  },
  {
    header: "Precio Unitario",
    key: "ProductoPrecioUnitario",
    width: 18,
    numero: true,
    moneda: true,
  },
  {
    header: "Precio Promedio",
    key: "ProductoPrecioPromedio",
    width: 18,
    numero: true,
    moneda: true,
  },
  { header: "Stock", key: "ProductoStock", width: 12, numero: true },
  {
    header: "Stock Unitario",
    key: "ProductoStockUnitario",
    width: 15,
    numero: true,
  },
  {
    header: "Cantidad por Caja",
    key: "ProductoCantidadCaja",
    width: 18,
    numero: true,
  },
  { header: "IVA", key: "ProductoIVA", width: 8, numero: true },
  {
    header: "Stock Mínimo",
    key: "ProductoStockMinimo",
    width: 14,
    numero: true,
  },
  { header: "Local", key: "LocalNombre", width: 25 },
];

// Formato de número para las columnas de precio (separador de miles, sin decimales)
const FORMATO_MONEDA = "#,##0";

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const nombreArchivo = () => {
  const ahora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(
    ahora.getDate()
  )}`;
  const hora = `${pad(ahora.getHours())}${pad(ahora.getMinutes())}`;
  return `productos_${fecha}_${hora}.xlsx`;
};

export function exportProductosToExcel(productos: ProductoExport[]) {
  const filas = productos.map((p) =>
    COLUMNAS.map((col) => {
      const valor = p[col.key];
      if (col.numero) return aNumero(valor);
      return valor == null ? "" : String(valor);
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([
    COLUMNAS.map((c) => c.header),
    ...filas,
  ]);

  worksheet["!cols"] = COLUMNAS.map((c) => ({ wch: c.width }));
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: filas.length, c: COLUMNAS.length - 1 },
    }),
  };

  // Aplicar formato de miles a las columnas de precio
  COLUMNAS.forEach((col, indiceCol) => {
    if (!col.moneda) return;
    for (let fila = 1; fila <= filas.length; fila++) {
      const celda = worksheet[XLSX.utils.encode_cell({ r: fila, c: indiceCol })];
      if (celda) celda.z = FORMATO_MONEDA;
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
  XLSX.writeFile(workbook, nombreArchivo(), { compression: true });
}
