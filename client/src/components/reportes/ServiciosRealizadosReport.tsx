import React, { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import api from "../../services/api";
import { formatMiles } from "../../utils/utils";

interface ServicioResumen {
  ProductoId: number;
  ProductoCodigo: string;
  ProductoNombre: string;
  Cantidad: number;
  Total: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const aISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aDDMMYYYY = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Cantidad de servicios realizados (e importe) por producto en un rango de
 * fechas. Por defecto, el mes en curso hasta hoy.
 */
const ServiciosRealizadosReport: React.FC = () => {
  const [desde, setDesde] = useState(() => {
    const hoy = new Date();
    return aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  });
  const [hasta, setHasta] = useState(() => aISO(new Date()));
  const [servicios, setServicios] = useState<ServicioResumen[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totales = useMemo(
    () =>
      (servicios ?? []).reduce(
        (acc, s) => ({
          cantidad: acc.cantidad + s.Cantidad,
          total: acc.total + s.Total,
        }),
        { cantidad: 0, total: 0 }
      ),
    [servicios]
  );

  const generar = async () => {
    if (!desde || !hasta) {
      setError("Seleccione fecha desde y hasta");
      return;
    }
    if (desde > hasta) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/venta/servicios-resumen", {
        params: { desde, hasta },
      });
      setServicios(res.data.data || []);
    } catch {
      setError("Error al cargar los servicios realizados");
      setServicios(null);
    } finally {
      setLoading(false);
    }
  };

  const titulo = `Servicios realizados - ${aDDMMYYYY(desde)} a ${aDDMMYYYY(
    hasta
  )}`;

  const exportarPDF = () => {
    if (!servicios?.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(titulo, 14, 16);
    autoTable(doc, {
      head: [["CÓDIGO", "SERVICIO", "CANTIDAD", "TOTAL (Gs.)"]],
      body: servicios.map((s) => [
        s.ProductoCodigo,
        s.ProductoNombre,
        formatMiles(s.Cantidad),
        formatMiles(s.Total),
      ]),
      foot: [["", "TOTAL", formatMiles(totales.cantidad), formatMiles(totales.total)]],
      startY: 22,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    doc.save(`servicios_realizados_${desde}_${hasta}.pdf`);
  };

  const exportarExcel = () => {
    if (!servicios?.length) return;
    const filas = servicios.map((s) => [
      s.ProductoCodigo,
      s.ProductoNombre,
      s.Cantidad,
      s.Total,
    ]);
    const hoja = XLSX.utils.aoa_to_sheet([
      [titulo],
      [],
      ["Código", "Servicio", "Cantidad", "Total (Gs.)"],
      ...filas,
      ["", "TOTAL", totales.cantidad, totales.total],
    ]);
    hoja["!cols"] = [{ wch: 14 }, { wch: 48 }, { wch: 12 }, { wch: 16 }];
    // Formato de miles en la columna de importes (fila 4 en adelante)
    for (let fila = 3; fila <= filas.length + 3; fila++) {
      const celda = hoja[XLSX.utils.encode_cell({ r: fila, c: 3 })];
      if (celda) celda.z = "#,##0";
    }
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Servicios");
    XLSX.writeFile(libro, `servicios_realizados_${desde}_${hasta}.xlsx`, {
      compression: true,
    });
  };

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Servicios realizados</h2>
      <p className="text-gray-600 text-sm mb-4">
        Cantidad de cada servicio vendido en el período y su importe. Las
        ventas anuladas no se cuentan.
      </p>
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition disabled:opacity-50"
          onClick={generar}
          disabled={loading}
        >
          {loading ? "Cargando…" : "Generar reporte"}
        </button>
        {!!servicios?.length && (
          <>
            <button
              className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg shadow transition"
              onClick={exportarPDF}
            >
              Exportar a PDF
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition"
              onClick={exportarExcel}
            >
              Exportar a Excel
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {servicios && servicios.length === 0 && (
        <p className="text-gray-500">No hay servicios vendidos en el período.</p>
      )}

      {!!servicios?.length && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100">
              <tr className="border-b border-slate-300">
                <th className="text-left py-2 px-2 font-semibold text-slate-800">
                  Código
                </th>
                <th className="text-left py-2 px-2 font-semibold text-slate-800">
                  Servicio
                </th>
                <th className="text-right py-2 px-2 font-semibold text-slate-800">
                  Cantidad
                </th>
                <th className="text-right py-2 px-2 font-semibold text-slate-800">
                  Total (Gs.)
                </th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => (
                <tr key={s.ProductoId} className="border-b border-slate-200">
                  <td className="py-2 px-2 whitespace-nowrap">
                    {s.ProductoCodigo}
                  </td>
                  <td className="py-2 px-2">{s.ProductoNombre}</td>
                  <td className="py-2 px-2 text-right font-mono">
                    {formatMiles(s.Cantidad)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {formatMiles(s.Total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="py-2 px-2" colSpan={2}>
                  TOTAL
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {formatMiles(totales.cantidad)}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {formatMiles(totales.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
};

export default ServiciosRealizadosReport;
