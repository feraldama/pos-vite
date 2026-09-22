import api from "./api";
import type { AxiosError } from "axios";

// Servicios POS: reemplazan a los webservices SOAP de GeneXus.
//   apventaconfirmarws     -> POST /pos/venta
//   apcreditows            -> POST /pos/credito
//   apborrarregistodiariows-> POST /pos/anular-venta

export interface PosVentaItem {
  productoId: number;
  cantidad: number;
  precio: number;
  precioTotal: number;
  /** "N" normal, "U" unitario */
  unidad?: string;
}

export interface PosVentaPagos {
  efectivo?: number;
  pos?: number;
  transferencia?: number;
  voucher?: number;
  /** Queda como saldo del cliente: no mueve caja. */
  cuentaCliente?: number;
}

export interface PosVentaPayload {
  /** YYYY-MM-DD */
  fecha: string;
  clienteId: number;
  almacenId: number;
  cajaId: number;
  usuarioId: string;
  ventaTipo?: "CO" | "CR";
  pagoTipo?: string;
  /** Los pagos (incluido cuentaCliente) tienen que sumar exactamente este total. */
  total: number;
  pagos: PosVentaPagos;
  items: PosVentaItem[];
}

export interface PosCreditoPayload {
  /** YYYY-MM-DD */
  fecha: string;
  clienteId: number;
  montoRecibido: number;
  cajaId: number;
  usuarioId: string;
  /** "E" efectivo, "T" transferencia */
  ventaPagoTipo?: string;
}

export const confirmarVenta = async (payload: PosVentaPayload) => {
  const { data } = await api.post("/pos/venta", payload);
  return data;
};

export const cobrarCredito = async (payload: PosCreditoPayload) => {
  const { data } = await api.post("/pos/credito", payload);
  return data;
};

/**
 * Anula la venta por completo en una sola operación: repone el stock, devuelve
 * el dinero a la caja y elimina la venta. Es idempotente: si ya fue anulada
 * responde 404 sin volver a tocar el stock.
 */
export const anularVenta = async (ventaId: number) => {
  const { data } = await api.post("/pos/anular-venta", { id: ventaId });
  return data;
};

/**
 * Mensaje para mostrarle al usuario. La API devuelve en `message` un texto
 * accionable ("los pagos suman X y el total es Y", "el usuario no tiene un
 * almacén válido"); si no hay respuesta del servidor, cae a un genérico.
 */
export const mensajeDeError = (error: unknown, generico: string): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message || generico;
};
