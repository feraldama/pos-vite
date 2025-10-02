import api from "./api";
import type { AxiosError } from "axios";

// Traer todos los partido jugadores sin paginación
export const getPartidoJugadores = async (params = {}) => {
  const res = await api.get("/partidojugadores/all", { params });
  return res.data;
};

// Traer partido jugadores paginados
export const getPartidoJugadoresPaginated = async (
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
    const response = await api.get("/partidojugadores", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener partido jugadores",
      }
    );
  }
};

export const getPartidoJugadoresAll = async () => {
  const res = await api.get("/partidojugadores/all");
  return res.data;
};

export const getPartidoJugadorById = async (id: string | number) => {
  try {
    const response = await api.get(`/partidojugadores/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener partido jugador",
      }
    );
  }
};

export const getPartidoJugadoresByPartidoId = async (
  partidoId: string | number
) => {
  try {
    const response = await api.get(`/partidojugadores/partido/${partidoId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener jugadores del partido",
      }
    );
  }
};

export const createPartidoJugador = async (
  partidoJugadorData: Record<string, unknown>
) => {
  try {
    const response = await api.post("/partidojugadores", partidoJugadorData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al crear partido jugador" }
    );
  }
};

export const updatePartidoJugador = async (
  id: string | number,
  partidoJugadorData: Record<string, unknown>
) => {
  try {
    const response = await api.put(
      `/partidojugadores/${id}`,
      partidoJugadorData
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar partido jugador",
      }
    );
  }
};

export const deletePartidoJugador = async (id: string | number) => {
  try {
    const response = await api.delete(`/partidojugadores/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al eliminar partido jugador",
      }
    );
  }
};

export const searchPartidoJugadores = async (
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
    const response = await api.get("/partidojugadores/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al buscar partido jugadores",
      }
    );
  }
};
