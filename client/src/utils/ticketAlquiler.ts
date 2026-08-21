import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { EMPRESA } from "../config/empresa";

export interface TicketPrenda {
  nombre: string;
  cantidad: number;
  precio: number;
  ajuste?: string;
}

// Desglose de pagos del momento de la venta (solo disponible en el ticket original)
export interface TicketPagos {
  efectivo?: number;
  transferencia?: number;
  tarjetaDebito?: number; // monto base, se imprime con 3% adicional
  tarjetaCredito?: number; // monto base, se imprime con 5% adicional
  cuentaCliente?: number;
  voucher?: number;
}

export interface TicketAlquilerData {
  alquilerId?: number;
  cliente: { nombre: string; apellido?: string; ruc?: string };
  fechaAlquiler?: string;
  fechaEntrega?: string;
  fechaDevolucion?: string;
  prendas: TicketPrenda[];
  total: number;
  entregado: number;
  pagos?: TicketPagos;
  esReimpresion?: boolean;
}

// Filas de alquilerprendas tal como llegan de la API (una fila por unidad)
export interface PrendaAlquilerApi {
  ProductoNombre?: string;
  AlquilerPrendasPrecio?: number;
  AlquilerPrendasObservacion?: string;
}

// Agrupa filas idénticas (mismo producto, precio y ajuste) para la columna Cant
export function agruparPrendasTicket(
  prendas: PrendaAlquilerApi[]
): TicketPrenda[] {
  const grupos = new Map<string, TicketPrenda>();
  for (const p of prendas) {
    const nombre = p.ProductoNombre || "Producto";
    const precio = p.AlquilerPrendasPrecio || 0;
    const ajuste = (p.AlquilerPrendasObservacion || "").trim();
    const key = `${nombre}|${precio}|${ajuste}`;
    const existente = grupos.get(key);
    if (existente) {
      existente.cantidad += 1;
    } else {
      grupos.set(key, { nombre, cantidad: 1, precio, ajuste });
    }
  }
  return Array.from(grupos.values());
}

// Acepta "YYYY-MM-DD" o ISO con hora; evita corrimientos de zona horaria
const formatearFecha = (fecha?: string) => {
  if (!fecha) return "";
  const m = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-PY");
};

export function generarTicketAlquiler(data: TicketAlquilerData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 297],
  });

  const fechaActual = new Date();
  const dia = String(fechaActual.getDate()).padStart(2, "0");
  const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
  const año = fechaActual.getFullYear().toString().slice(-2);
  const horas = String(fechaActual.getHours()).padStart(2, "0");
  const minutos = String(fechaActual.getMinutes()).padStart(2, "0");
  const segundos = String(fechaActual.getSeconds()).padStart(2, "0");

  const fechaFormateada = `${dia}/${mes}/${año}`;
  const horaFormateada = `${horas}:${minutos}:${segundos}`;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  doc.text(EMPRESA.nombre, 0, 15);
  doc.text(EMPRESA.rubro.toUpperCase(), 0, 20);
  if (EMPRESA.direccion) doc.text(EMPRESA.direccion, 0, 25);
  doc.text(`Teléfono: ${EMPRESA.telefono}`, 0, 30);
  doc.text(`Fecha: ${fechaFormateada} - Hora: ${horaFormateada}`, 0, 35);

  let y = 40;
  if (data.alquilerId) {
    doc.setFont("helvetica", "bold");
    doc.text(
      `Alquiler #${data.alquilerId}${data.esReimpresion ? " - REIMPRESIÓN" : ""}`,
      0,
      y
    );
    doc.setFont("helvetica", "normal");
    y += 5;
  }
  doc.text(data.cliente.ruc ? `RUC: ${data.cliente.ruc}` : "RUC: SIN RUC", 0, y);
  y += 5;
  doc.text(
    `Cliente: ${[data.cliente.nombre, data.cliente.apellido]
      .filter(Boolean)
      .join(" ")}`,
    0,
    y
  );
  y += 5;
  doc.text(`Fecha Alquiler: ${formatearFecha(data.fechaAlquiler)}`, 0, y);
  y += 5;
  doc.text(`Fecha Entrega: ${formatearFecha(data.fechaEntrega)}`, 0, y);
  y += 5;
  doc.text(`Fecha Devolución: ${formatearFecha(data.fechaDevolucion)}`, 0, y);
  y += 3;

  doc.setLineWidth(0.2);
  doc.line(0, y, 75, y);

  const tableData = data.prendas.map((p) => [
    p.nombre,
    p.cantidad,
    `Gs. ${p.precio.toLocaleString("es-ES")}`,
    `Gs. ${(p.precio * p.cantidad).toLocaleString("es-ES")}`,
  ]);

  autoTable(doc, {
    head: [["Desc.", "Cant", "Precio", "Total"]],
    body: tableData,
    startY: y + 2,
    theme: "plain",
    styles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 9 },
      2: { cellWidth: 14 },
      3: { cellWidth: 20 },
    },
    margin: { left: 0 },
  });

  const lastAutoTable = (
    doc as unknown as { lastAutoTable: { finalY: number } }
  ).lastAutoTable;

  let yPosition = lastAutoTable.finalY + 5;

  // Ajustes/detalles a realizar antes de la entrega
  const itemsConAjuste = data.prendas.filter((p) => (p.ajuste || "").trim());
  if (itemsConAjuste.length > 0) {
    doc.setLineWidth(0.2);
    doc.line(0, yPosition, 75, yPosition);
    yPosition += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("AJUSTES ANTES DE LA ENTREGA:", 0, yPosition);
    yPosition += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    itemsConAjuste.forEach((p) => {
      const lineas = doc.splitTextToSize(
        `- ${p.nombre}: ${(p.ajuste || "").trim()}`,
        73
      );
      doc.text(lineas, 0, yPosition);
      yPosition += lineas.length * 3.5;
    });
    yPosition += 2;
  }

  // Línea separadora
  doc.setLineWidth(0.2);
  doc.line(0, yPosition, 75, yPosition);
  yPosition += 5;

  // Desglose de pagos (solo cuando se dispone del detalle, en la venta original)
  doc.setFontSize(7);
  const pagos = data.pagos;
  if (pagos) {
    if (pagos.efectivo && pagos.efectivo > 0) {
      doc.text(
        `Efectivo: Gs. ${pagos.efectivo.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }
    if (pagos.transferencia && pagos.transferencia > 0) {
      doc.text(
        `Transferencia: Gs. ${pagos.transferencia.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }
    if (pagos.tarjetaDebito && pagos.tarjetaDebito > 0) {
      const debitoConAdicional = pagos.tarjetaDebito * 1.03;
      doc.text(
        `Tarjeta Débito (3% adicional): Gs. ${Math.round(
          debitoConAdicional
        ).toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }
    if (pagos.tarjetaCredito && pagos.tarjetaCredito > 0) {
      const creditoConAdicional = pagos.tarjetaCredito * 1.05;
      doc.text(
        `Tarjeta Crédito (5% adicional): Gs. ${Math.round(
          creditoConAdicional
        ).toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }
    if (pagos.cuentaCliente && pagos.cuentaCliente > 0) {
      doc.text(
        `Cuenta de cliente: Gs. ${pagos.cuentaCliente.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }
    if (pagos.voucher && pagos.voucher > 0) {
      doc.text(
        `Voucher: Gs. ${pagos.voucher.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }

    // Línea separadora
    yPosition += 2;
    doc.line(0, yPosition, 75, yPosition);
    yPosition += 5;
  }

  const voucher = pagos?.voucher || 0;
  const totalConDescuento = data.total - voucher;
  const saldoFalta = totalConDescuento - data.entregado;

  doc.setFontSize(8);
  doc.text(
    `Total Entregado: Gs. ${Math.round(data.entregado).toLocaleString(
      "es-ES"
    )}`,
    0,
    yPosition
  );
  yPosition += 5;

  if (saldoFalta > 0) {
    doc.text(
      `Saldo que falta: Gs. ${Math.round(saldoFalta).toLocaleString("es-ES")}`,
      0,
      yPosition
    );
    yPosition += 5;
  } else if (saldoFalta < 0 && pagos) {
    doc.text(
      `Vuelto: Gs. ${Math.round(Math.abs(saldoFalta)).toLocaleString(
        "es-ES"
      )}`,
      0,
      yPosition
    );
    yPosition += 5;
  }

  // Línea separadora
  doc.line(0, yPosition, 75, yPosition);
  yPosition += 5;

  // Total a Pagar (con descuento si hay voucher)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  if (voucher > 0) {
    doc.text(
      `Subtotal: Gs. ${data.total.toLocaleString("es-ES")}`,
      0,
      yPosition
    );
    yPosition += 4;
    doc.text(
      `Descuento (Voucher): Gs. ${voucher.toLocaleString("es-ES")}`,
      0,
      yPosition
    );
    yPosition += 4;
  }
  doc.text(
    `Total a Pagar: Gs. ${totalConDescuento.toLocaleString("es-ES")}`,
    0,
    yPosition
  );
  yPosition += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("--GRACIAS POR SU PREFERENCIA--", 0, yPosition);

  const sufijo = data.alquilerId ? `_${data.alquilerId}` : "";
  doc.save(
    `ticket_alquiler${sufijo}_${dia}${mes}${año}_${horas}${minutos}${segundos}.pdf`
  );
}
