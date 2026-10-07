import api from "./api";

/** CU = cumpleaños, FR = cada N servicios */
export type PromocionTipo = "CU" | "FR";
/** D = descuento %, R = regalo (sin cargo) */
export type PromocionBeneficio = "D" | "R";

export interface Promocion {
  PromocionId?: number;
  PromocionNombre: string;
  PromocionTipo: PromocionTipo;
  PromocionBeneficio: PromocionBeneficio;
  PromocionDescuento: number;
  PromocionCantidad: number;
  PromocionVigenciaDias: number;
  PromocionDiasAntes: number;
  PromocionDiasDespues: number;
  PromocionActiva: number;
  PromocionMensaje: string;
  /** Productos que cuentan para llegar a N (solo FR) */
  productosCuentan: number[];
  /** Productos que se pueden ofrecer como beneficio. Vacío = cualquiera. */
  productosBeneficio: number[];
  usos?: number;
}

export interface ProductoBeneficio {
  ProductoId: number;
  ProductoNombre: string;
  precioLista: number;
  /** Precio con el beneficio aplicado */
  precio: number;
}

export interface EstadoPromocion {
  PromocionId: number;
  PromocionNombre: string;
  PromocionTipo: PromocionTipo;
  PromocionBeneficio: PromocionBeneficio;
  PromocionDescuento: number;
  PromocionMensaje: string;
  disponible: boolean;
  motivo?: string;
  enVentana?: boolean;
  progreso?: number;
  requerido?: number;
  /** Vacío = el beneficio vale para cualquier producto */
  productosBeneficio: ProductoBeneficio[];
}

export interface CumpleanosRow {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteTelefono: string;
  ClienteVehiculo: string;
  ClienteFechaNacimiento: string;
  dia: number;
}

export interface UsoPromocionRow {
  Fecha: string;
  VentaId: number;
  PromocionNombre: string;
  PromocionTipo: PromocionTipo;
  PromocionBeneficio: PromocionBeneficio;
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteTelefono: string;
  ProductoNombre: string;
  Cobrado: number;
  Descuento: number;
}

export const getPromociones = async (): Promise<Promocion[]> => {
  const { data } = await api.get("/promociones");
  return data.data || [];
};

export const createPromocion = async (promo: Promocion) => {
  const { data } = await api.post("/promociones", promo);
  return data;
};

export const updatePromocion = async (id: number, promo: Promocion) => {
  const { data } = await api.put(`/promociones/${id}`, promo);
  return data;
};

export const deletePromocion = async (id: number) => {
  const { data } = await api.delete(`/promociones/${id}`);
  return data;
};

export const getEstadoPromocionesCliente = async (
  clienteId: number,
  fecha: string
): Promise<EstadoPromocion[]> => {
  const { data } = await api.get(`/promociones/cliente/${clienteId}`, {
    params: { fecha },
  });
  return data.data || [];
};

export const getCumpleanos = async (mes: number): Promise<CumpleanosRow[]> => {
  const { data } = await api.get("/promociones/reportes/cumpleanos", {
    params: { mes },
  });
  return data.data || [];
};

export const getUsosPromociones = async (
  desde: string,
  hasta: string
): Promise<UsoPromocionRow[]> => {
  const { data } = await api.get("/promociones/reportes/usos", {
    params: { desde, hasta },
  });
  return data.data || [];
};

/** Texto corto que describe la promoción ("Cada 4 servicios: el siguiente gratis"). */
export function describirPromocion(p: {
  PromocionTipo: PromocionTipo;
  PromocionBeneficio: PromocionBeneficio;
  PromocionDescuento: number;
  PromocionCantidad?: number;
  PromocionDiasAntes?: number;
  PromocionDiasDespues?: number;
}) {
  const beneficio =
    p.PromocionBeneficio === "R"
      ? "sin cargo"
      : `${Number(p.PromocionDescuento)}% de descuento`;
  if (p.PromocionTipo === "FR") {
    return `Cada ${p.PromocionCantidad} servicios, el siguiente ${beneficio}`;
  }
  const antes = p.PromocionDiasAntes || 0;
  const despues = p.PromocionDiasDespues || 0;
  const ventana =
    antes === 0 && despues === 0
      ? "el día del cumpleaños"
      : `desde ${antes} día(s) antes hasta ${despues} día(s) después del cumpleaños`;
  return `Cumpleaños: ${beneficio}, ${ventana}`;
}

/** Mensaje de error de la API, o el genérico. */
export function mensajeApi(error: unknown, generico: string) {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || generico;
}
