import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { formatMiles } from "../../utils/utils";
import {
  getUsosPromociones,
  type UsoPromocionRow,
} from "../../services/promociones.service";

const pad = (n: number) => String(n).padStart(2, "0");
const aISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aDDMMYYYY = (iso: string) => iso.split("-").reverse().join("/");

/** Beneficios entregados (regalos y descuentos) en un rango de fechas. */
const PromocionesUsadasReport: React.FC = () => {
  const [desde, setDesde] = useState(() => {
    const hoy = new Date();
    return aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  });
  const [hasta, setHasta] = useState(() => aISO(new Date()));
  const [filas, setFilas] = useState<UsoPromocionRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDescuento = useMemo(
    () => (filas ?? []).reduce((a, f) => a + f.Descuento, 0),
    [filas]
  );

  const generar = async () => {
    if (desde > hasta) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setFilas(await getUsosPromociones(desde, hasta));
    } catch {
      setError("Error al cargar las promociones usadas");
      setFilas(null);
    } finally {
      setLoading(false);
    }
  };

  const cliente = (f: UsoPromocionRow) =>
    `${f.ClienteNombre || ""} ${f.ClienteApellido || ""}`.trim();

  const exportarExcel = () => {
    if (!filas?.length) return;
    const hoja = XLSX.utils.aoa_to_sheet([
      [`Promociones usadas - ${aDDMMYYYY(desde)} a ${aDDMMYYYY(hasta)}`],
      [],
      ["Fecha", "Venta", "Cliente", "Teléfono", "Promoción", "Producto", "Cobrado (Gs.)", "Descuento (Gs.)"],
      ...filas.map((f) => [
        aDDMMYYYY(f.Fecha),
        f.VentaId,
        cliente(f),
        f.ClienteTelefono || "",
        f.PromocionNombre,
        f.ProductoNombre,
        f.Cobrado,
        f.Descuento,
      ]),
      ["", "", "", "", "", "TOTAL", "", totalDescuento],
    ]);
    hoja["!cols"] = [
      { wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 14 },
      { wch: 26 }, { wch: 36 }, { wch: 14 }, { wch: 16 },
    ];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Promociones");
    XLSX.writeFile(libro, `promociones_usadas_${desde}_${hasta}.xlsx`);
  };

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">🎁 Promociones usadas</h2>
      <p className="text-gray-600 text-sm mb-4">
        Cada regalo o descuento entregado en el período, y cuánto se dejó de
        cobrar. Las ventas anuladas no aparecen.
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
        {!!filas?.length && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition"
            onClick={exportarExcel}
          >
            Exportar a Excel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}
      {filas && filas.length === 0 && (
        <p className="text-gray-500">No se usaron promociones en el período.</p>
      )}

      {!!filas?.length && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full border-collapse text-sm min-w-[760px]">
            <thead className="bg-slate-100">
              <tr className="border-b border-slate-300">
                <th className="text-left py-2 px-2 font-semibold">Fecha</th>
                <th className="text-left py-2 px-2 font-semibold">Venta</th>
                <th className="text-left py-2 px-2 font-semibold">Cliente</th>
                <th className="text-left py-2 px-2 font-semibold">Promoción</th>
                <th className="text-left py-2 px-2 font-semibold">Producto</th>
                <th className="text-right py-2 px-2 font-semibold">Cobrado</th>
                <th className="text-right py-2 px-2 font-semibold">Descuento</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={`${f.VentaId}-${f.PromocionNombre}`} className="border-b border-slate-200">
                  <td className="py-2 px-2 whitespace-nowrap">{aDDMMYYYY(f.Fecha)}</td>
                  <td className="py-2 px-2">{f.VentaId}</td>
                  <td className="py-2 px-2">{cliente(f)}</td>
                  <td className="py-2 px-2">
                    {f.PromocionTipo === "CU" ? "🎂" : "🔁"} {f.PromocionNombre}
                  </td>
                  <td className="py-2 px-2">{f.ProductoNombre}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatMiles(f.Cobrado)}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatMiles(f.Descuento)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="py-2 px-2" colSpan={6}>
                  TOTAL ({filas.length} {filas.length === 1 ? "beneficio" : "beneficios"})
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {formatMiles(totalDescuento)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
};

export default PromocionesUsadasReport;
