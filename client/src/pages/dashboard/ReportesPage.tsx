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
  VentaCreditoPagoId: number;
  VentaCreditoPagoFecha: string;
  VentaCreditoPagoMonto: number;
}

interface Venta {
  VentaId: number;
  VentaFecha: string;
  VentaTipo: string;
  Total: number;
  VentaEntrega: number;
  SaldoPendiente: number;
  Pagos: Pago[];
  AlmacenNombre: string;
  UsuarioNombre: string;
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
  ventas: Venta[];
}

interface ProductoAlmacenStock {
  AlmacenNombre: string;
  ProductoAlmacenStock: number;
  ProductoAlmacenStockUnitario: number;
}

interface ProductoStockReporte {
  ProductoId: number;
  ProductoCodigo: string;
  ProductoNombre: string;
  ProductoStock: number;
  ProductoStockUnitario: number;
  productoAlmacen: ProductoAlmacenStock[];
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
          .finalY + 12; // Más espacio
      totalGeneral = deudas.reduce((acc, d) => acc + Number(d.Saldo), 0);
      doc.setFontSize(14);
      doc.text(`TOTAL GENERAL: Gs. ${formatMiles(totalGeneral)}`, 14, y);
      doc.save("creditos_pendientes.pdf");
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
      const res = await api.get("/venta/reporte", {
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
      doc.text("Reporte de Ventas por Cliente", 14, y);
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

      // Tabla de ventas
      const ventasRows: string[][] = [];
      let totalVentas = 0;
      let totalSaldoPendiente = 0;

      reporte.ventas.forEach((venta) => {
        const tipoVenta =
          venta.VentaTipo === "CO"
            ? "Contado"
            : venta.VentaTipo === "CR"
            ? "Crédito"
            : venta.VentaTipo === "PO"
            ? "POS"
            : venta.VentaTipo === "TR"
            ? "Transfer"
            : venta.VentaTipo;

        const fechaVenta = new Date(venta.VentaFecha)
          .toLocaleDateString("es-PY")
          .split("/")
          .join("/");

        ventasRows.push([
          venta.VentaId.toString(),
          fechaVenta,
          tipoVenta,
          formatMiles(venta.Total),
          venta.VentaTipo === "CR" ? formatMiles(venta.SaldoPendiente) : "-",
        ]);

        totalVentas += Number(venta.Total);
        if (venta.VentaTipo === "CR") {
          totalSaldoPendiente += Number(venta.SaldoPendiente);
        }

        // Si es crédito y tiene pagos, agregar información de pagos
        if (venta.VentaTipo === "CR" && venta.Pagos && venta.Pagos.length > 0) {
          venta.Pagos.forEach((pago) => {
            const fechaPago = new Date(pago.VentaCreditoPagoFecha)
              .toLocaleDateString("es-PY")
              .split("/")
              .join("/");
            ventasRows.push([
              "",
              `  Pago ${pago.VentaCreditoPagoId}`,
              fechaPago,
              formatMiles(pago.VentaCreditoPagoMonto),
              "",
            ]);
          });
        }
      });

      autoTable(doc, {
        head: [["ID", "FECHA", "TIPO", "TOTAL", "SALDO PEND."]],
        body: ventasRows,
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 40 },
        },
      });

      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      // Totales
      doc.setFontSize(12);
      doc.text(`Total Ventas: Gs. ${formatMiles(totalVentas)}`, 14, y);
      y += 6;
      if (totalSaldoPendiente > 0) {
        doc.text(
          `Total Saldo Pendiente: Gs. ${formatMiles(totalSaldoPendiente)}`,
          14,
          y
        );
      }

      const nombreArchivo = `reporte_ventas_${reporte.cliente.ClienteId}_${fechaDesde}_${fechaHasta}.pdf`;
      doc.save(nombreArchivo);
      // Abrir el PDF automáticamente después de descargarlo
      doc.output("dataurlnewwindow");
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Error al generar el reporte de ventas"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarReporteStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/productos/reporte-stock");
      const data = res.data?.data;
      const productos: ProductoStockReporte[] = Array.isArray(data?.productos)
        ? data.productos
        : [];

      const productosOrdenados = [...productos].sort(
        (a, b) =>
          String(a.ProductoNombre ?? "").localeCompare(
            String(b.ProductoNombre ?? "")
          )
      );

      const doc = new jsPDF({ orientation: "landscape" });
      let y = 20;

      doc.setFontSize(18);
      doc.text("Reporte de stock total y por almacén", 14, y);
      y += 10;

      const tableRows: string[][] = [];
      productosOrdenados.forEach((p: ProductoStockReporte) => {
        tableRows.push([
          String(p.ProductoCodigo ?? ""),
          String(p.ProductoNombre ?? ""),
          String(p.ProductoStock ?? 0),
          String(p.ProductoStockUnitario ?? 0),
        ]);
        (p.productoAlmacen || []).forEach((pa: ProductoAlmacenStock) => {
          tableRows.push([
            "",
            `  - ${pa.AlmacenNombre ?? ""}`,
            String(pa.ProductoAlmacenStock ?? 0),
            String(pa.ProductoAlmacenStockUnitario ?? 0),
          ]);
        });
      });

      autoTable(doc, {
        head: [["Código", "Producto", "Stock (cajas)", "Stock unitario"]],
        body: tableRows.length > 0 ? tableRows : [["Sin datos", "", "", ""]],
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
        },
      });

      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      doc.setFontSize(10);
      doc.text(
        `Total productos: ${
          productosOrdenados.length
        } — Generado: ${new Date().toLocaleString("es-PY")}`,
        14,
        y
      );

      const nombreArchivo = `reporte_stock_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      doc.save(nombreArchivo);

      // Abrir en nueva pestaña con blob URL (evita límite de data URL y muestra el PDF correctamente)
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Error al generar el reporte de stock"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Reportes</h1>
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        {/* Reporte de Stock total y por almacén */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Stock total y por almacén
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Lista todos los productos con su stock total (cajas y unitario) y el
            desglose por cada almacén.
          </p>
          <button
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarReporteStock}
            disabled={loading}
          >
            GENERAR REPORTE DE STOCK
          </button>
        </div>

        {/* Reporte de Créditos Pendientes */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Créditos Pendientes a Cobrar
          </h2>
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarPDF}
            disabled={loading}
          >
            GENERAR REPORTE
          </button>
        </div>

        {/* Reporte de Ventas por Cliente */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Reporte de Ventas por Cliente
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
