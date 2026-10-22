import React, { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatMiles } from "../../utils/utils";
import { mensajeApi } from "../../services/promociones.service";
import {
  getReportePagosTransferencia,
  type PagoTransferencia,
} from "../../services/pagosTransferencia.service";

interface TotalBeneficiario {
  beneficiario: string;
  cantidad: number;
  total: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const aISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aDDMMYYYY = (iso: string) => iso.split("-").reverse().join("/");
const cuentaYOperacion = (p: PagoTransferencia) =>
  [p.PagoCuentaOrigen, p.PagoNumeroOperacion && `N° ${p.PagoNumeroOperacion}`]
    .filter(Boolean)
    .join(" - ");

/**
 * Pagos por transferencia de todos los usuarios en un rango de fechas:
 * el detalle y el total pagado a cada beneficiario.
 */
const PagosTransferenciaReport: React.FC = () => {
  const [desde, setDesde] = useState(() => {
    const hoy = new Date();
    return aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  });
  const [hasta, setHasta] = useState(() => aISO(new Date()));
  const [pagos, setPagos] = useState<PagoTransferencia[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => (pagos ?? []).reduce((acc, p) => acc + p.PagoMonto, 0),
    [pagos]
  );

  // Se agrupa sin distinguir mayúsculas para que "ANDE" y "Ande" sumen juntos
  const porBeneficiario = useMemo<TotalBeneficiario[]>(() => {
    const grupos = new Map<string, TotalBeneficiario>();
    for (const p of pagos ?? []) {
      const clave = p.PagoBeneficiario.toLocaleUpperCase("es");
      const g = grupos.get(clave) ?? { beneficiario: p.PagoBeneficiario, cantidad: 0, total: 0 };
      g.cantidad += 1;
      g.total += p.PagoMonto;
      grupos.set(clave, g);
    }
    return [...grupos.values()].sort((a, b) => b.total - a.total);
  }, [pagos]);

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
      setPagos(await getReportePagosTransferencia(desde, hasta));
    } catch (e) {
      setError(mensajeApi(e, "Error al cargar los pagos por transferencia"));
      setPagos(null);
    } finally {
      setLoading(false);
    }
  };

  const titulo = `Pagos por transferencia - ${aDDMMYYYY(desde)} a ${aDDMMYYYY(hasta)}`;

  const exportarPDF = () => {
    if (!pagos?.length) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(titulo, 14, 16);
    autoTable(doc, {
      head: [["FECHA", "BENEFICIARIO", "CONCEPTO", "CATEGORÍA", "CUENTA / N° OP.", "COMPROB.", "CARGÓ", "MONTO (Gs.)"]],
      body: pagos.map((p) => [
        aDDMMYYYY(p.PagoFecha),
        p.PagoBeneficiario,
        p.PagoConcepto,
        p.TipoGastoGrupoDescripcion || "-",
        cuentaYOperacion(p) || "-",
        p.TieneComprobante ? "Sí" : "No",
        p.UsuarioId,
        formatMiles(p.PagoMonto),
      ]),
      foot: [["", "", "", "", "", "", "TOTAL", formatMiles(total)]],
      startY: 22,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      columnStyles: { 2: { cellWidth: 70 }, 7: { halign: "right" } },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    const finTabla = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30;
    doc.setFontSize(12);
    doc.text("Total por beneficiario", 14, finTabla + 12);
    autoTable(doc, {
      head: [["BENEFICIARIO", "PAGOS", "TOTAL (Gs.)"]],
      body: porBeneficiario.map((b) => [b.beneficiario, formatMiles(b.cantidad), formatMiles(b.total)]),
      foot: [["TOTAL", formatMiles(pagos.length), formatMiles(total)]],
      startY: finTabla + 16,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      styles: { fontSize: 9 },
      tableWidth: 160,
      margin: { left: 14, right: 14 },
    });
    doc.save(`pagos_transferencia_${desde}_${hasta}.pdf`);
  };

  const exportarExcel = () => {
    if (!pagos?.length) return;
    const miles = (hoja: XLSX.WorkSheet, col: number, desdeFila: number, hastaFila: number) => {
      for (let fila = desdeFila; fila <= hastaFila; fila++) {
        const celda = hoja[XLSX.utils.encode_cell({ r: fila, c: col })];
        if (celda) celda.z = "#,##0";
      }
    };

    const detalle = XLSX.utils.aoa_to_sheet([
      [titulo],
      [],
      ["Fecha", "Beneficiario", "Concepto", "Categoría", "Cuenta", "N° operación", "Comprobante", "Cargó", "Monto (Gs.)"],
      ...pagos.map((p) => [
        aDDMMYYYY(p.PagoFecha),
        p.PagoBeneficiario,
        p.PagoConcepto,
        p.TipoGastoGrupoDescripcion || "",
        p.PagoCuentaOrigen,
        p.PagoNumeroOperacion,
        p.TieneComprobante ? "Sí" : "No",
        p.UsuarioId,
        p.PagoMonto,
      ]),
      ["", "", "", "", "", "", "", "TOTAL", total],
    ]);
    detalle["!cols"] = [
      { wch: 12 }, { wch: 28 }, { wch: 50 }, { wch: 16 }, { wch: 20 },
      { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
    ];
    miles(detalle, 8, 3, pagos.length + 3);

    const resumen = XLSX.utils.aoa_to_sheet([
      [titulo],
      [],
      ["Beneficiario", "Pagos", "Total (Gs.)"],
      ...porBeneficiario.map((b) => [b.beneficiario, b.cantidad, b.total]),
      ["TOTAL", pagos.length, total],
    ]);
    resumen["!cols"] = [{ wch: 36 }, { wch: 10 }, { wch: 16 }];
    miles(resumen, 2, 3, porBeneficiario.length + 3);

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, detalle, "Detalle");
    XLSX.utils.book_append_sheet(libro, resumen, "Por beneficiario");
    XLSX.writeFile(libro, `pagos_transferencia_${desde}_${hasta}.xlsx`, {
      compression: true,
    });
  };

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Pagos por transferencia</h2>
      <p className="text-gray-600 text-sm mb-4">
        Todos los pagos por transferencia cargados en el período, con el
        detalle de cada uno y el total pagado a cada beneficiario. No incluye
        los egresos de caja.
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
        {!!pagos?.length && (
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

      {pagos && pagos.length === 0 && (
        <p className="text-gray-500">No hay pagos por transferencia en el período.</p>
      )}

      {!!pagos?.length && (
        <div className="flex flex-col gap-8">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100">
                <tr className="border-b border-slate-300 text-slate-800">
                  <th className="text-left py-2 px-2 font-semibold">Fecha</th>
                  <th className="text-left py-2 px-2 font-semibold">Beneficiario</th>
                  <th className="text-left py-2 px-2 font-semibold">Concepto</th>
                  <th className="text-left py-2 px-2 font-semibold">Categoría</th>
                  <th className="text-left py-2 px-2 font-semibold">Cuenta / N° op.</th>
                  <th className="text-left py-2 px-2 font-semibold">Comprob.</th>
                  <th className="text-left py-2 px-2 font-semibold">Cargó</th>
                  <th className="text-right py-2 px-2 font-semibold">Monto (Gs.)</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.PagoTransferenciaId} className="border-b border-slate-200 align-top">
                    <td className="py-2 px-2 whitespace-nowrap">{aDDMMYYYY(p.PagoFecha)}</td>
                    <td className="py-2 px-2">{p.PagoBeneficiario}</td>
                    <td className="py-2 px-2">{p.PagoConcepto}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {p.TipoGastoGrupoDescripcion || "-"}
                    </td>
                    <td className="py-2 px-2">{cuentaYOperacion(p) || "-"}</td>
                    <td className="py-2 px-2">
                      {p.TieneComprobante ? "Sí" : <span className="text-amber-700 font-medium">No</span>}
                    </td>
                    <td className="py-2 px-2">{p.UsuarioId}</td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                      {formatMiles(p.PagoMonto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 px-2" colSpan={7}>
                    TOTAL ({pagos.length} pagos)
                  </td>
                  <td className="py-2 px-2 text-right font-mono">{formatMiles(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="overflow-x-auto -mx-2 max-w-2xl">
            <h3 className="font-semibold mb-2 px-2">Total por beneficiario</h3>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100">
                <tr className="border-b border-slate-300 text-slate-800">
                  <th className="text-left py-2 px-2 font-semibold">Beneficiario</th>
                  <th className="text-right py-2 px-2 font-semibold">Pagos</th>
                  <th className="text-right py-2 px-2 font-semibold">Total (Gs.)</th>
                </tr>
              </thead>
              <tbody>
                {porBeneficiario.map((b) => (
                  <tr key={b.beneficiario} className="border-b border-slate-200">
                    <td className="py-2 px-2">{b.beneficiario}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatMiles(b.cantidad)}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatMiles(b.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 px-2">TOTAL</td>
                  <td className="py-2 px-2 text-right font-mono">{formatMiles(pagos.length)}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatMiles(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default PagosTransferenciaReport;
