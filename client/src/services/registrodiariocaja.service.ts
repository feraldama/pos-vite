import api from "./api";
import type { AxiosError } from "axios";

export const aperturaCierreCaja = async (data: {
  apertura: 0 | 1;
  CajaId: string | number;
  Monto: number;
  UsuarioId?: string | number;
}) => {
  try {
    const response = await api.post(
      "/registrodiariocaja/apertura-cierre",
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error en apertura/cierre de caja",
      }
    );
  }
};

export const getEstadoAperturaPorUsuario = async (
  usuarioId: string | number
) => {
  try {
    const response = await api.get(`/registrodiariocaja/estado-apertura`, {
      params: { usuarioId },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al consultar estado de apertura de caja",
      }
    );
  }
};

export interface MovimientoCierre {
  RegistroDiarioCajaId: number;
  Fecha: string;
  TipoGastoId: number;
  TipoGastoGrupoId: number;
  RegistroDiarioCajaDetalle: string;
  RegistroDiarioCajaMonto: number;
}

export interface CierreCaja {
  CierreId: number;
  AperturaId: number | null;
  Fecha: string;
  AperturaFecha: string | null;
  UsuarioId: string;
  UsuarioNombre: string;
  CajaId: number;
  CajaDescripcion: string;
  Apertura: number | null;
  Cierre: number;
  IngresosEfectivo: number;
  IngresosPOS: number;
  IngresosTransfer: number;
  Egresos: number;
  EfectivoEsperado: number | null;
  // Negativa = faltante, positiva = sobrante. null si no tiene apertura
  Diferencia: number | null;
  Movimientos: MovimientoCierre[];
}

// Reporte detallado de cierres (solo administrador)
export const getCierresCaja = async (filtros: {
  desde: string;
  hasta: string;
  usuarioId?: string;
  cajaId?: string;
}): Promise<CierreCaja[]> => {
  const params: Record<string, string> = {
    desde: filtros.desde,
    hasta: filtros.hasta,
  };
  if (filtros.usuarioId) params.usuarioId = filtros.usuarioId;
  if (filtros.cajaId) params.cajaId = filtros.cajaId;
  try {
    const response = await api.get("/registrodiariocaja/cierres", { params });
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener los cierres de caja",
      }
    );
  }
};
