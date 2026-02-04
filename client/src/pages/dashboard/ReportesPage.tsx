import React, { useMemo, useState } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../services/api";
import { formatMiles } from "../../utils/utils";
import {
  getRegistrosDiariosCajaPorRango,
  type RegistroDiarioCajaRow,
} from "../../services/registros.service";

interface DeudaCliente {
  ClienteId: number;
  Cliente: string;
  TotalVentas: number;
  TotalEntregado: number;
  Saldo: number;
}

/**
 * Misma lógica que AperturaCierreCajaPage (generarResumenCierrePDF):
 * totales entre apertura y cierre para UN mismo CajaId y UsuarioId.
 * registrosCajaUsuario = solo registros de esa caja y usuario.
 */
function calcularTotalesCiclo(
  registrosCajaUsuario: RegistroDiarioCajaRow[],
  idApertura: number,
  idCierre: number
) {
  const filtrados = registrosCajaUsuario.filter(
    (r) =>
      r.RegistroDiarioCajaId >= idApertura && r.RegistroDiarioCajaId <= idCierre
  );
  const aperturaReg = filtrados.find(
    (r) => r.TipoGastoId === 2 && r.TipoGastoGrupoId === 2
  );
  const cierreReg = filtrados.find(
    (r) => r.TipoGastoId === 1 && r.TipoGastoGrupoId === 2
  );
  const apertura = aperturaReg?.RegistroDiarioCajaMonto ?? 0;
  const cierre = cierreReg?.RegistroDiarioCajaMonto ?? 0;

  let egresos = 0;
  let ingresos = 0;
  let ingresosPOS = 0;
  let ingresosVoucher = 0;
  let ingresosTransfer = 0;
  for (const reg of filtrados) {
    if (
      reg.TipoGastoId === 2 &&
      reg.TipoGastoGrupoId !== 2 &&
      reg.TipoGastoGrupoId !== 4 &&
      reg.TipoGastoGrupoId !== 5 &&
      reg.TipoGastoGrupoId !== 6
    ) {
      ingresos += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 1 && reg.TipoGastoGrupoId !== 2) {
      egresos += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 4) {
      ingresosPOS += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 5) {
      ingresosVoucher += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 6) {
      ingresosTransfer += reg.RegistroDiarioCajaMonto;
    }
  }
  const totalIngresos =
    ingresos + ingresosPOS + ingresosVoucher + ingresosTransfer;
  const diferencia = totalIngresos - egresos;
  const sobranteFaltante = ingresos + apertura - (cierre + egresos);

  return {
    apertura,
    cierre,
    egresos,
    ingresos,
    ingresosPOS,
    ingresosVoucher,
    ingresosTransfer,
    totalIngresos,
    diferencia,
    sobranteFaltante,
  };
}

export interface ResumenCierre {
  fechaCierre: string;
  fechaCierreDate: Date;
  cajaId: number;
  cajaDescripcion: string;
  usuarioId: string;
  apertura: number;
  cierre: number;
  egresos: number;
  ingresos: number;
  ingresosPOS: number;
  ingresosVoucher: number;
  ingresosTransfer: number;
  totalIngresos: number;
  diferencia: number;
  sobranteFaltante: number;
  /** true si es un ciclo sin cierre en el rango (solo apertura + movimientos) */
  parcial?: boolean;
}

/** Fecha del registro en hora local del usuario, como YYYY-MM-DD */
function toLocalDateStr(fechaRegistro: string): string {
  const d = new Date(fechaRegistro);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formato dd/mm/aaaa para mostrar fechas */
function formatDateDDMMYYYY(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha + "T12:00:00") : fecha;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Hoy en YYYY-MM-DD para input type="date" */
function getHoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildResumenesCierre(
  registros: RegistroDiarioCajaRow[],
  fechaDesde: string,
  fechaHasta: string
): ResumenCierre[] {
  if (registros.length === 0) return [];

  const cierres = registros
    .filter((r) => r.TipoGastoId === 1 && r.TipoGastoGrupoId === 2)
    .sort((a, b) => a.RegistroDiarioCajaId - b.RegistroDiarioCajaId);

  const resumenes: ResumenCierre[] = [];

  for (const cierreReg of cierres) {
    const fechaCierreLocal = toLocalDateStr(cierreReg.RegistroDiarioCajaFecha);
    if (fechaCierreLocal < fechaDesde || fechaCierreLocal > fechaHasta)
      continue;
    const registrosCajaUsuario = registros.filter(
      (r) =>
        r.CajaId === cierreReg.CajaId && r.UsuarioId === cierreReg.UsuarioId
    );
    const mismosCajaUsuarioHastaCierre = registrosCajaUsuario.filter(
      (r) => r.RegistroDiarioCajaId <= cierreReg.RegistroDiarioCajaId
    );
    const aperturas = mismosCajaUsuarioHastaCierre
      .filter(
        (r) =>
          r.TipoGastoId === 2 &&
          r.TipoGastoGrupoId === 2 &&
          r.RegistroDiarioCajaId < cierreReg.RegistroDiarioCajaId
      )
      .sort((a, b) => b.RegistroDiarioCajaId - a.RegistroDiarioCajaId);
    const aperturaReg = aperturas[0];
    if (!aperturaReg) continue;
    if (cierreReg.RegistroDiarioCajaId <= aperturaReg.RegistroDiarioCajaId)
      continue;

    const totals = calcularTotalesCiclo(
      registrosCajaUsuario,
      aperturaReg.RegistroDiarioCajaId,
      cierreReg.RegistroDiarioCajaId
    );

    const fechaCierreDate = new Date(cierreReg.RegistroDiarioCajaFecha);
    resumenes.push({
      fechaCierre: formatDateDDMMYYYY(fechaCierreDate),
      fechaCierreDate,
      cajaId: cierreReg.CajaId,
      cajaDescripcion: cierreReg.CajaDescripcion ?? `Caja ${cierreReg.CajaId}`,
      usuarioId: cierreReg.UsuarioId,
      ...totals,
    });
  }

  resumenes.sort(
    (a, b) => a.fechaCierreDate.getTime() - b.fechaCierreDate.getTime()
  );
  return resumenes;
}

const PAGE_SIZE = 25;

const ReportesPage: React.FC = () => {
  const puedeLeer = usePermiso("REPORTES", "leer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fechaDesde, setFechaDesde] = useState(() => getHoyISO());
  const [fechaHasta, setFechaHasta] = useState(() => getHoyISO());
  const [resumenes, setResumenes] = useState<ResumenCierre[]>([]);
  const [paginaCierre, setPaginaCierre] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(resumenes.length / PAGE_SIZE));
  const resumenesPaginados = useMemo(() => {
    const from = (paginaCierre - 1) * PAGE_SIZE;
    return resumenes.slice(from, from + PAGE_SIZE);
  }, [resumenes, paginaCierre]);

  const totalesGenerales = useMemo(() => {
    return resumenes.reduce(
      (acc, r) => ({
        apertura: acc.apertura + r.apertura,
        cierre: acc.cierre + r.cierre,
        egresos: acc.egresos + r.egresos,
        ingresos: acc.ingresos + r.ingresos,
        ingresosPOS: acc.ingresosPOS + r.ingresosPOS,
        ingresosVoucher: acc.ingresosVoucher + r.ingresosVoucher,
        ingresosTransfer: acc.ingresosTransfer + r.ingresosTransfer,
        totalIngresos: acc.totalIngresos + r.totalIngresos,
        diferencia: acc.diferencia + r.diferencia,
      }),
      {
        apertura: 0,
        cierre: 0,
        egresos: 0,
        ingresos: 0,
        ingresosPOS: 0,
        ingresosVoucher: 0,
        ingresosTransfer: 0,
        totalIngresos: 0,
        diferencia: 0,
      }
    );
  }, [resumenes]);

  if (!puedeLeer) return <div>No tienes permiso para ver los reportes</div>;

  const handleGenerarPDF = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/venta/pendientes");
      const deudas: DeudaCliente[] = res.data.data || [];
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Créditos Pendientes a Cobrar", 14, 18);
      let y = 28;
      let totalGeneral = 0;
      const rows = deudas.map((d) => [
        d.ClienteId,
        d.Cliente,
        formatMiles(d.TotalVentas),
        formatMiles(d.TotalEntregado),
        formatMiles(d.Saldo),
      ]);
      autoTable(doc, {
        head: [["CLIENTE ID", "CLIENTE", "TOTAL", "ENTREGA", "SALDO"]],
        body: rows,
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 11 },
        margin: { left: 14, right: 14 },
      });
      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 12;
      totalGeneral = deudas.reduce((acc, d) => acc + Number(d.Saldo), 0);
      doc.setFontSize(14);
      doc.text(`TOTAL GENERAL: Gs. ${formatMiles(totalGeneral)}`, 14, y);
      doc.save("creditos_pendientes.pdf");
    } catch {
      setError("Error al generar el PDF de deudas pendientes");
    } finally {
      setLoading(false);
    }
  };

  const generarReporteCierre = async () => {
    if (!fechaDesde || !fechaHasta) {
      setError("Seleccione fecha desde y hasta");
      return;
    }
    if (new Date(fechaDesde) > new Date(fechaHasta)) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }
    setLoading(true);
    setError(null);
    setResumenes([]);
    setPaginaCierre(1);
    try {
      const { data } = await getRegistrosDiariosCajaPorRango(
        fechaDesde,
        fechaHasta
      );
      const lista = Array.isArray(data) ? data : [];
      const res = buildResumenesCierre(lista, fechaDesde, fechaHasta);
      setResumenes(res);
    } catch (e) {
      setError(
        (e as { message?: string })?.message ??
          "Error al cargar registros por rango de fechas"
      );
    } finally {
      setLoading(false);
    }
  };

  const exportarCierrePDF = () => {
    if (resumenes.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    doc.setFontSize(14);
    doc.text(
      `Reporte de cierre de caja - ${formatDateDDMMYYYY(fechaDesde)} a ${formatDateDDMMYYYY(fechaHasta)}`,
      14,
      14
    );
    const rows = resumenes.map((r) => [
      r.fechaCierre,
      r.cajaDescripcion,
      r.usuarioId,
      formatMiles(r.apertura),
      formatMiles(r.cierre),
      formatMiles(r.egresos),
      formatMiles(r.ingresos),
      formatMiles(r.ingresosPOS),
      formatMiles(r.ingresosVoucher),
      formatMiles(r.ingresosTransfer),
      formatMiles(r.totalIngresos),
      formatMiles(r.diferencia),
      formatMiles(r.sobranteFaltante),
    ]);
    autoTable(doc, {
      head: [
        [
          "Fecha cierre",
          "Caja",
          "Usuario",
          "Apertura",
          "Cierre",
          "Egresos",
          "Ing.Efect.",
          "POS",
          "Voucher",
          "Transfer",
          "Total ing.",
          "Diferencia",
          "S/F",
        ],
      ],
      body: rows,
      startY: 22,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
    let y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 10;
    doc.setFontSize(11);
    doc.text("TOTALES", 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.text("Suma de todos los registros del período", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(
      `Total registros: ${resumenes.length} | Total ingresos: ${formatMiles(
        totalesGenerales.totalIngresos
      )} | Total egresos: ${formatMiles(totalesGenerales.egresos)}`,
      14,
      y
    );
    y += 6;
    doc.setFontSize(9);
    doc.text(
      `Ing. efectivo: ${formatMiles(
        totalesGenerales.ingresos
      )} | POS: ${formatMiles(
        totalesGenerales.ingresosPOS
      )} | Voucher: ${formatMiles(
        totalesGenerales.ingresosVoucher
      )} | Transfer: ${formatMiles(totalesGenerales.ingresosTransfer)}`,
      14,
      y
    );

    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `reporte_cierre_caja_${fechaDesde}_${fechaHasta}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    const openLink = document.createElement("a");
    openLink.href = pdfUrl;
    openLink.target = "_blank";
    document.body.appendChild(openLink);
    openLink.click();
    document.body.removeChild(openLink);
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 2000);
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Reportes</h1>

      <div className="flex flex-col gap-10">
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Créditos pendientes a cobrar
          </h2>
          <div className="flex flex-col items-center gap-4">
            <button
              className="w-full max-w-md bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
              onClick={handleGenerarPDF}
              disabled={loading}
            >
              CRÉDITOS PENDIENTES A COBRAR
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Reporte de cierre de caja por rango de fechas
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Obtenga la misma información del cierre diario para un período (ej.
            julio a octubre 2025). Seleccione el rango y genere el reporte.
          </p>
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition disabled:opacity-50"
              onClick={generarReporteCierre}
              disabled={loading}
            >
              {loading ? "Cargando…" : "Generar reporte"}
            </button>
            {resumenes.length > 0 && (
              <button
                className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg shadow transition"
                onClick={exportarCierrePDF}
              >
                Exportar a PDF
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {resumenes.length > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-2">
                {resumenes.length} cierre(s) en el período. Página{" "}
                {paginaCierre} de {totalPaginas}.
              </p>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full border-collapse text-sm min-w-[900px]">
                  <thead className="sticky top-0 bg-slate-100 z-10">
                    <tr className="border-b border-slate-300">
                      <th className="text-left py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Fecha cierre
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Caja
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Usuario
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Apertura
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Cierre
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Egresos
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Ing. Efectivo
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        POS
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Voucher
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Transfer
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Total ing.
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Diferencia
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Sobrante/Faltante
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenesPaginados.map((r, idx) => (
                      <tr
                        key={`${r.fechaCierre}-${r.cajaId}-${r.usuarioId}-${idx}`}
                        className="border-b border-slate-200 hover:bg-slate-50"
                      >
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {r.fechaCierre}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {r.cajaDescripcion}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {r.usuarioId}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.apertura)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.cierre)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.egresos)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresos)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresosPOS)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresosVoucher)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresosTransfer)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.totalIngresos)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.diferencia)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {r.sobranteFaltante > 0
                            ? `Falt. ${formatMiles(r.sobranteFaltante)}`
                            : r.sobranteFaltante < 0
                            ? `Sobr. ${formatMiles(-r.sobranteFaltante)}`
                            : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"
                    onClick={() => setPaginaCierre((p) => Math.max(1, p - 1))}
                    disabled={paginaCierre <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-slate-600">
                    Página {paginaCierre} de {totalPaginas}
                  </span>
                  <button
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"
                    onClick={() =>
                      setPaginaCierre((p) => Math.min(totalPaginas, p + 1))
                    }
                    disabled={paginaCierre >= totalPaginas}
                  >
                    Siguiente
                  </button>
                </div>
              )}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-1">TOTALES</h3>
                <p className="text-slate-500 text-xs mb-3">
                  Suma de todos los registros del período
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Ingresos efectivo:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGenerales.ingresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">POS:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGenerales.ingresosPOS)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Voucher:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGenerales.ingresosVoucher)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Transfer:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGenerales.ingresosTransfer)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total ingresos:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGenerales.totalIngresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total egresos:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGenerales.egresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Diferencia:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGenerales.diferencia)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReportesPage;
