import React, { useState, useEffect } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../services/api";
import { formatMiles } from "../../utils/utils";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";

interface DeudaCliente {
  ClienteId: number;
  Cliente: string;
  TotalVentas: number;
  TotalEntregado: number;
  Saldo: number;
}

interface Cliente {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteRUC: string;
}

interface Pago {
  RegistroDiarioCajaId: number;
  RegistroDiarioCajaFecha: string;
  RegistroDiarioCajaMonto: number;
  RegistroDiarioCajaDetalle: string;
}

interface Alquiler {
  AlquilerId: number;
  AlquilerFechaAlquiler: string;
  AlquilerTotal: number;
  AlquilerEntrega: number;
  SaldoPendiente: number;
  Pagos: Pago[];
}

interface ReporteData {
  cliente: {
    ClienteId: number;
    ClienteNombre: string;
    ClienteApellido: string;
    ClienteRUC: string;
  };
  fechaDesde: string;
  fechaHasta: string;
  alquileres: Alquiler[];
}

const ReportesPage: React.FC = () => {
  const puedeLeer = usePermiso("REPORTES", "leer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return primerDiaMes.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split("T")[0];
  });

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const response = await getAllClientesSinPaginacion();
        const todosLosClientes = response.data || [];
        const clientesOrdenados = todosLosClientes.sort(
          (a: Cliente, b: Cliente) =>
            a.ClienteNombre.localeCompare(b.ClienteNombre)
        );
        setClientes(clientesOrdenados);
      } catch (error) {
        console.error("Error al cargar clientes:", error);
      }
    };
    cargarClientes();
  }, []);

  if (!puedeLeer) return <div>No tienes permiso para ver los reportes</div>;

  // Función para formatear fecha de aaaa-mm-dd a dd-mm-aaaa
  const formatearFecha = (fecha: string): string => {
    const [año, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${año}`;
  };

  const handleGenerarPDF = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/alquiler/pendientes");
      const deudas: DeudaCliente[] = res.data.data || [];
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Alquileres Pendientes a Cobrar", 14, 18);
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
          .finalY + 12; // Más espacio
      totalGeneral = deudas.reduce((acc, d) => acc + Number(d.Saldo), 0);
      doc.setFontSize(14);
      doc.text(`TOTAL GENERAL: Gs. ${formatMiles(totalGeneral)}`, 14, y);
      doc.save("alquileres_pendientes.pdf");
      // Abrir el PDF automáticamente después de descargarlo
      doc.output("dataurlnewwindow");
    } catch {
      setError("Error al generar el PDF de deudas pendientes");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarReporteVentas = async () => {
    if (!clienteSeleccionado) {
      setError("Debes seleccionar un cliente");
      return;
    }

    if (!fechaDesde || !fechaHasta) {
      setError("Debes seleccionar ambas fechas");
      return;
    }

    if (new Date(fechaDesde) > new Date(fechaHasta)) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/alquiler/reporte", {
        params: {
          clienteId: clienteSeleccionado,
          fechaDesde,
          fechaHasta,
        },
      });

      const reporte: ReporteData = res.data.data;

      const doc = new jsPDF();
      let y = 20;

      // Título
      doc.setFontSize(18);
      doc.text("Reporte de Alquileres por Cliente", 14, y);
      y += 10;

      // Información del cliente
      doc.setFontSize(12);
      doc.text(
        `Cliente: ${reporte.cliente.ClienteNombre} ${reporte.cliente.ClienteApellido}`,
        14,
        y
      );
      y += 6;
      if (reporte.cliente.ClienteRUC) {
        doc.text(`RUC: ${reporte.cliente.ClienteRUC}`, 14, y);
        y += 6;
      }
      doc.text(
        `Período: ${formatearFecha(fechaDesde)} al ${formatearFecha(
          fechaHasta
        )}`,
        14,
        y
      );
      y += 10;

      // Tabla de alquileres
      const alquileresRows: string[][] = [];
      let totalAlquileres = 0;
      let totalSaldoPendiente = 0;

      reporte.alquileres.forEach((alquiler) => {
        const fechaAlquiler = new Date(alquiler.AlquilerFechaAlquiler)
          .toLocaleDateString("es-PY")
          .split("/")
          .join("/");

        alquileresRows.push([
          alquiler.AlquilerId.toString(),
          fechaAlquiler,
          formatMiles(alquiler.AlquilerTotal),
          formatMiles(alquiler.AlquilerEntrega),
          formatMiles(alquiler.SaldoPendiente),
        ]);

        totalAlquileres += Number(alquiler.AlquilerTotal);
        totalSaldoPendiente += Number(alquiler.SaldoPendiente);

        // Si tiene pagos, agregar información de pagos
        if (alquiler.Pagos && alquiler.Pagos.length > 0) {
          alquiler.Pagos.forEach((pago) => {
            const fechaPago = new Date(pago.RegistroDiarioCajaFecha)
              .toLocaleDateString("es-PY")
              .split("/")
              .join("/");
            alquileresRows.push([
              "",
              `  Pago ${pago.RegistroDiarioCajaId}`,
              fechaPago,
              formatMiles(pago.RegistroDiarioCajaMonto),
              "",
            ]);
          });
        }
      });

      autoTable(doc, {
        head: [["ID", "FECHA", "TOTAL", "ENTREGA", "SALDO PEND."]],
        body: alquileresRows,
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 40 },
          3: { cellWidth: 40 },
          4: { cellWidth: 40 },
        },
      });

      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      // Totales
      doc.setFontSize(12);
      doc.text(`Total Alquileres: Gs. ${formatMiles(totalAlquileres)}`, 14, y);
      y += 6;
      if (totalSaldoPendiente > 0) {
        doc.text(
          `Total Saldo Pendiente: Gs. ${formatMiles(totalSaldoPendiente)}`,
          14,
          y
        );
      }

      const nombreArchivo = `reporte_alquileres_${reporte.cliente.ClienteId}_${fechaDesde}_${fechaHasta}.pdf`;
      doc.save(nombreArchivo);
      // Abrir el PDF automáticamente después de descargarlo
      doc.output("dataurlnewwindow");
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          "Error al generar el reporte de alquileres"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Reportes</h1>
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        {/* Reporte de Alquileres Pendientes */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Alquileres Pendientes a Cobrar
          </h2>
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarPDF}
            disabled={loading}
          >
            GENERAR REPORTE
          </button>
        </div>

        {/* Reporte de Alquileres por Cliente */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Reporte de Alquileres por Cliente
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={clienteSeleccionado}
                onChange={(e) => setClienteSeleccionado(e.target.value)}
                disabled={loading}
              >
                <option value="">Seleccione un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.ClienteId} value={cliente.ClienteId}>
                    {cliente.ClienteNombre} {cliente.ClienteApellido}
                    {cliente.ClienteRUC ? ` - ${cliente.ClienteRUC}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
              onClick={handleGenerarReporteVentas}
              disabled={loading}
            >
              GENERAR REPORTE
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-600">Generando PDF...</div>
        )}
        {error && (
          <div className="text-red-600 bg-red-50 p-4 rounded-lg w-full">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportesPage;
