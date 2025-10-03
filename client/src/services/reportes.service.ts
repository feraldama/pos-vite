import api from "./api";
import type { AxiosError } from "axios";

// Interfaces para los tipos de datos
export interface EstadisticaJugador {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  totalPartidos: number;
  partidosGanados: number;
  partidosPerdidos: number;
  porcentajeVictorias: number;
  primerPartido?: string;
  ultimoPartido?: string;
}

export interface ResumenGeneral {
  totalPartidos: number;
  totalJugadores: number;
  partidosFinalizados: number;
  partidosPendientes: number;
  promedioJugadoresPorPartido: number | string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReporteResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationInfo;
  searchTerm?: string;
  criterio?: string;
  message: string;
}

// Obtener estadísticas de todos los jugadores
export const getEstadisticasJugadores = async (
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) => {
  const params: { [key: string]: string | number | undefined } = {
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;

  try {
    const response = await api.get("/reportes/jugadores", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener estadísticas de jugadores",
      }
    );
  }
};

// Buscar estadísticas de jugadores
export const searchEstadisticasJugadores = async (
  searchTerm: string,
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) => {
  const params: { [key: string]: string | number | undefined } = {
    term: searchTerm,
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;

  try {
    const response = await api.get("/reportes/jugadores/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar jugadores" };
  }
};

// Obtener estadísticas de un jugador específico
export const getEstadisticasJugador = async (id: string | number) => {
  try {
    const response = await api.get(`/reportes/jugadores/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener estadísticas del jugador",
      }
    );
  }
};

// Obtener resumen general
export const getResumenGeneral = async () => {
  try {
    const response = await api.get("/reportes/resumen");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener resumen general",
      }
    );
  }
};

// Obtener top jugadores
export const getTopJugadores = async (
  criterio = "totalPartidos",
  limit = 10
) => {
  const params: { [key: string]: string | number } = {
    criterio,
    limit,
  };

  try {
    const response = await api.get("/reportes/top", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener top jugadores" }
    );
  }
};
