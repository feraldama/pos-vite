import api from "./api";
import type { AxiosError } from "axios";

// Traer todos los partidos sin paginación
export const getPartidos = async (params = {}) => {
  const res = await api.get("/partidos/all", { params });
  return res.data;
};

// Traer partidos paginados
export const getPartidosPaginated = async (
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
    const response = await api.get("/partidos", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener partidos" };
  }
};

export const getPartidosAll = async () => {
  const res = await api.get("/partidos/all");
  return res.data;
};

export const getPartidoById = async (id: string | number) => {
  try {
    const response = await api.get(`/partidos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener partido" };
  }
};

export const createPartido = async (partidoData: {
  PartidoFecha: string;
  PartidoHoraInicio: string;
  PartidoHoraFin?: string;
  PartidoCategoria: string;
  PartidoEstado: boolean;
  CanchaId: string | number;
}) => {
  try {
    const response = await api.post("/partidos", partidoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear partido" };
  }
};

export const updatePartido = async (
  id: string | number,
  partidoData: {
    PartidoFecha: string;
    PartidoHoraInicio: string;
    PartidoHoraFin?: string;
    PartidoCategoria: string;
    PartidoEstado: boolean;
    CanchaId: string | number;
  }
) => {
  try {
    const response = await api.put(`/partidos/${id}`, partidoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar partido" }
    );
  }
};

export const deletePartido = async (id: string | number) => {
  try {
    const response = await api.delete(`/partidos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar partido" };
  }
};

export const searchPartidos = async (
  searchTerm: string,
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) => {
  const params: { [key: string]: string | number | undefined } = {
    q: searchTerm,
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  try {
    const response = await api.get("/partidos/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar partidos" };
  }
};

// Establecer ganador del partido
export const setWinner = async (
  PartidoId: number,
  equipoGanador: "1" | "2"
) => {
  try {
    const response = await api.post("/partidos/set-winner", {
      PartidoId,
      equipoGanador,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al establecer ganador" }
    );
  }
};
