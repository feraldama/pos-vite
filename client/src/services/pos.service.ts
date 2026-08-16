import api from "./api";

// Servicios POS: reemplazan a los webservices SOAP de GeneXus

export interface PosVentaItem {
  productoId: number;
  cantidad: number;
  precio: number;
  precioTotal: number;
  unidad?: string;
}

export interface PosVentaPayload {
  fecha: string; // YYYY-MM-DD
  clienteId: number;
  almacenId: number;
  cajaId: number;
  usuarioId: string;
  ventaTipo?: string;
  pagoTipo?: string;
  total: number;
  entrega?: number;
  pagos: {
    efectivo?: number;
    pos?: number;
    transferencia?: number;
  };
  items: PosVentaItem[];
}

export interface PosCompraItem {
  productoId: number;
  cantidad: number;
  precio: number;
  unidad?: string;
  almacenId: number;
  bonificacion?: number;
}

export interface PosCompraPayload {
  fecha: string; // YYYY-MM-DD
  proveedorId: number;
  factura?: number;
  tipo?: string; // CO | CR
  entrega?: number;
  total: number;
  usuarioId: string;
  cajaId?: number;
  items: PosCompraItem[];
}

export const confirmarVenta = async (payload: PosVentaPayload) => {
  const { data } = await api.post("/pos/venta", payload);
  return data;
};

export const confirmarDevolucion = async (payload: PosVentaPayload) => {
  const { data } = await api.post("/pos/devolucion", payload);
  return data;
};

export const confirmarCompra = async (payload: PosCompraPayload) => {
  const { data } = await api.post("/pos/compra", payload);
  return data;
};

export const actualizarInventario = async (payload: {
  productoId: number;
  almacenId: number;
  caja: number;
  unidad?: number;
  tipo: string; // F = fijar, S = sumar
}) => {
  const { data } = await api.post("/pos/inventario", payload);
  return data;
};

export const borrarRegistroDiario = async (
  id: number,
  regla: 1 | 2 // 1 = venta, 2 = compra
) => {
  const { data } = await api.post("/pos/borrar-registro-diario", { id, regla });
  return data;
};
