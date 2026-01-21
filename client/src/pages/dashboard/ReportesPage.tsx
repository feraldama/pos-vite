import React, { useState } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMiles } from "../../utils/utils";
import {
  getReportePaseCajas,
  getReporteMovimientosCajas,
} from "../../services/registros.service";

interface RegistroCaja {
  RegistroDiarioCajaId: number;
  CajaId: number;
  RegistroDiarioCajaFecha: string;
  RegistroDiarioCajaMonto: number;
  RegistroDiarioCajaDetalle: string;
  TipoGastoId: number;
  TipoGastoGrupoId: number;
  UsuarioId: string;
  CajaDescripcion: string;
  TipoGastoDescripcion: string;
  TipoGastoGrupoDescripcion: string;
}

interface ReporteCaja {
  CajaId: number;
  CajaDescripcion: string;
  ingresos: RegistroCaja[];
  egresos: RegistroCaja[];
  totalIngresos: number;
  totalEgresos: number;
  saldo: number;
}

const ReportesPage: React.FC = () => {
  const puedeLeer = usePermiso("REPORTES", "leer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [fechaInicioMovimientos, setFechaInicioMovimientos] = useState(today);
  const [fechaFinMovimientos, setFechaFinMovimientos] = useState(today);

  if (!puedeLeer) return <div>No tienes permiso para ver los reportes</div>;

  const formatearFecha = (fecha: string): string => {
    if (!fecha) return "";
    const [year, month, day] = fecha.split("-");
    return `${day}/${month}/${year}`;
  };

  const generarPdfPaseCajas = (reportePaseCajas: ReporteCaja[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Pase de Cajas", 14, 18);
    doc.setFontSize(12);
    doc.text(
      `Período: ${formatearFecha(fechaInicio)} al ${formatearFecha(fechaFin)}`,
      14,
      26
    );

    let y = 35;

    reportePaseCajas.forEach((caja, index) => {
      // Si no cabe en la página, agregar nueva página
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Título de la caja
      doc.setFontSize(14);
      doc.text(`Caja: ${caja.CajaDescripcion} (ID: ${caja.CajaId})`, 14, y);
      y += 8;

      // Ingresos
      doc.setFontSize(12);
      doc.text("INGRESOS", 14, y);
      y += 6;

      if (caja.ingresos.length > 0) {
        const ingresosRows = caja.ingresos.map((ingreso) => [
          ingreso.RegistroDiarioCajaId.toString(),
          new Date(ingreso.RegistroDiarioCajaFecha).toLocaleDateString("es-ES"),
          ingreso.UsuarioId || "",
          ingreso.RegistroDiarioCajaDetalle || "",
          formatMiles(ingreso.RegistroDiarioCajaMonto),
        ]);

        autoTable(doc, {
          head: [["ID", "Fecha", "Usuario", "Detalle", "Monto"]],
          body: ingresosRows,
          startY: y,
          theme: "grid",
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        y =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 5;
      } else {
        doc.setFontSize(10);
        doc.text("No hay ingresos", 14, y);
        y += 6;
      }

      // Total ingresos
      doc.setFontSize(10);
      doc.text(`Total Ingresos: Gs. ${formatMiles(caja.totalIngresos)}`, 14, y);
      y += 8;

      // Egresos
      doc.setFontSize(12);
      doc.text("EGRESOS", 14, y);
      y += 6;

      if (caja.egresos.length > 0) {
        const egresosRows = caja.egresos.map((egreso) => [
          egreso.RegistroDiarioCajaId.toString(),
          new Date(egreso.RegistroDiarioCajaFecha).toLocaleDateString("es-ES"),
          egreso.UsuarioId || "",
          egreso.RegistroDiarioCajaDetalle || "",
          formatMiles(egreso.RegistroDiarioCajaMonto),
        ]);

        autoTable(doc, {
          head: [["ID", "Fecha", "Usuario", "Detalle", "Monto"]],
          body: egresosRows,
          startY: y,
          theme: "grid",
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        y =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 5;
      } else {
        doc.setFontSize(10);
        doc.text("No hay egresos", 14, y);
        y += 6;
      }

      // Total egresos
      doc.setFontSize(10);
      doc.text(`Total Egresos: Gs. ${formatMiles(caja.totalEgresos)}`, 14, y);
      y += 6;

      // Saldo
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Saldo: Gs. ${formatMiles(caja.saldo)}`, 14, y);
      doc.setFont("helvetica", "normal");
      y += 12;

      // Separador entre cajas
      if (index < reportePaseCajas.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(14, y, 196, y);
        y += 8;
      }
    });

    // Abrir el PDF en una nueva pestaña
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  };

  const handleGenerarReportePaseCajas = async () => {
    if (!fechaInicio || !fechaFin) {
      setError("Debes seleccionar fecha de inicio y fecha de fin");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getReportePaseCajas(fechaInicio, fechaFin);
      const data = (response.data || []) as ReporteCaja[];

      if (!data.length) {
        setError("No hay datos para el período seleccionado");
        return;
      }

      generarPdfPaseCajas(data);
    } catch (err) {
      setError("Error al generar el reporte de pase de cajas");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generarPdfMovimientosCajas = (movimientos: RegistroCaja[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Movimientos de Cajas", 14, 18);
    doc.setFontSize(12);
    doc.text(
      `Período: ${formatearFecha(fechaInicioMovimientos)} al ${formatearFecha(
        fechaFinMovimientos
      )}`,
      14,
      26
    );

    let y = 35;

    if (movimientos.length > 0) {
      // Agrupar movimientos por caja
      const movimientosPorCaja: Record<
        number,
        {
          CajaId: number;
          CajaDescripcion: string;
          ingresos: RegistroCaja[];
          egresos: RegistroCaja[];
          totalIngresos: number;
          totalEgresos: number;
        }
      > = {};

      movimientos.forEach((movimiento) => {
        const cajaId = movimiento.CajaId;
        if (!movimientosPorCaja[cajaId]) {
          movimientosPorCaja[cajaId] = {
            CajaId: cajaId,
            CajaDescripcion:
              movimiento.CajaDescripcion || `Caja ${cajaId}`,
            ingresos: [],
            egresos: [],
            totalIngresos: 0,
            totalEgresos: 0,
          };
        }

        const monto = Number(movimiento.RegistroDiarioCajaMonto) || 0;

        // TipoGastoId === 2 es ingreso, TipoGastoId === 1 es egreso
        if (movimiento.TipoGastoId === 2) {
          movimientosPorCaja[cajaId].ingresos.push(movimiento);
          movimientosPorCaja[cajaId].totalIngresos += monto;
        } else if (movimiento.TipoGastoId === 1) {
          movimientosPorCaja[cajaId].egresos.push(movimiento);
          movimientosPorCaja[cajaId].totalEgresos += monto;
        }
      });

      // Ordenar cajas por CajaId
      const cajasOrdenadas = Object.values(movimientosPorCaja).sort(
        (a, b) => a.CajaId - b.CajaId
      );

      cajasOrdenadas.forEach((caja, index) => {
        // Si no cabe en la página, agregar nueva página
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        // Título de la caja
        doc.setFontSize(14);
        doc.text(
          `Caja: ${caja.CajaDescripcion} (ID: ${caja.CajaId})`,
          14,
          y
        );
        y += 8;

        // Ingresos
        doc.setFontSize(12);
        doc.text("INGRESOS", 14, y);
        y += 6;

        if (caja.ingresos.length > 0) {
          // Ordenar ingresos por RegistroDiarioCajaId ascendente
          const ingresosOrdenados = [...caja.ingresos].sort(
            (a, b) => a.RegistroDiarioCajaId - b.RegistroDiarioCajaId
          );

          const ingresosRows = ingresosOrdenados.map((ingreso) => [
            ingreso.RegistroDiarioCajaId.toString(),
            new Date(ingreso.RegistroDiarioCajaFecha).toLocaleDateString(
              "es-ES"
            ),
            ingreso.UsuarioId || "",
            ingreso.RegistroDiarioCajaDetalle || "",
            formatMiles(ingreso.RegistroDiarioCajaMonto),
          ]);

          autoTable(doc, {
            head: [["ID", "Fecha", "Usuario", "Detalle", "Monto"]],
            body: ingresosRows,
            startY: y,
            theme: "grid",
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
          });

          y =
            (doc as unknown as { lastAutoTable: { finalY: number } })
              .lastAutoTable.finalY + 5;
        } else {
          doc.setFontSize(10);
          doc.text("No hay ingresos", 14, y);
          y += 6;
        }

        // Total ingresos
        doc.setFontSize(10);
        doc.text(
          `Total Ingresos: Gs. ${formatMiles(caja.totalIngresos)}`,
          14,
          y
        );
        y += 8;

        // Egresos
        doc.setFontSize(12);
        doc.text("EGRESOS", 14, y);
        y += 6;

        if (caja.egresos.length > 0) {
          // Ordenar egresos por RegistroDiarioCajaId ascendente
          const egresosOrdenados = [...caja.egresos].sort(
            (a, b) => a.RegistroDiarioCajaId - b.RegistroDiarioCajaId
          );

          const egresosRows = egresosOrdenados.map((egreso) => [
            egreso.RegistroDiarioCajaId.toString(),
            new Date(egreso.RegistroDiarioCajaFecha).toLocaleDateString(
              "es-ES"
            ),
            egreso.UsuarioId || "",
            egreso.RegistroDiarioCajaDetalle || "",
            formatMiles(egreso.RegistroDiarioCajaMonto),
          ]);

          autoTable(doc, {
            head: [["ID", "Fecha", "Usuario", "Detalle", "Monto"]],
            body: egresosRows,
            startY: y,
            theme: "grid",
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
          });

          y =
            (doc as unknown as { lastAutoTable: { finalY: number } })
              .lastAutoTable.finalY + 5;
        } else {
          doc.setFontSize(10);
          doc.text("No hay egresos", 14, y);
          y += 6;
        }

        // Total egresos
        doc.setFontSize(10);
        doc.text(
          `Total Egresos: Gs. ${formatMiles(caja.totalEgresos)}`,
          14,
          y
        );
        y += 6;

        // Saldo
        const saldo = caja.totalIngresos - caja.totalEgresos;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Saldo: Gs. ${formatMiles(saldo)}`, 14, y);
        doc.setFont("helvetica", "normal");
        y += 12;

        // Separador entre cajas
        if (index < cajasOrdenadas.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.line(14, y, 196, y);
          y += 8;
        }
      });
    } else {
      doc.setFontSize(10);
      doc.text("No hay movimientos para el período seleccionado", 14, y);
    }

    // Abrir el PDF en una nueva pestaña
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  };

  const handleGenerarReporteMovimientosCajas = async () => {
    if (!fechaInicioMovimientos || !fechaFinMovimientos) {
      setError("Debes seleccionar fecha de inicio y fecha de fin");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getReporteMovimientosCajas(
        fechaInicioMovimientos,
        fechaFinMovimientos
      );
      const data = (response.data || []) as RegistroCaja[];

      if (!data.length) {
        setError("No hay datos para el período seleccionado");
        return;
      }

      generarPdfMovimientosCajas(data);
    } catch (err) {
      setError("Error al generar el reporte de movimientos de cajas");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-4xl font-bold mb-8 text-center">Reportes</h1>
      <div className="flex flex-col items-center gap-6">
        {/* Reporte de Pase de Cajas */}
        <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Reporte de Pase de Cajas</h2>
          <p className="text-sm text-gray-600 mb-4">
            Genera y abre automáticamente un PDF con los movimientos de cada caja
            (ingresos y egresos) en el período seleccionado.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4 mb-2">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow transition"
              onClick={handleGenerarReportePaseCajas}
              disabled={loading || !fechaInicio || !fechaFin}
            >
              Generar PDF
            </button>
          </div>

          {loading && <div className="mt-2">Generando PDF...</div>}
          {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>

        {/* Reporte de Movimientos de Cajas */}
        <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">
            Reporte de Movimientos de Cajas
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Genera y abre automáticamente un PDF con todos los movimientos de
            las cajas (CajaTipoId=1) ordenados por ID en el período seleccionado.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicioMovimientos}
                onChange={(e) => setFechaInicioMovimientos(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFinMovimientos}
                onChange={(e) => setFechaFinMovimientos(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4 mb-2">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow transition"
              onClick={handleGenerarReporteMovimientosCajas}
              disabled={
                loading || !fechaInicioMovimientos || !fechaFinMovimientos
              }
            >
              Generar PDF
            </button>
          </div>

          {loading && <div className="mt-2">Generando PDF...</div>}
          {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default ReportesPage;
