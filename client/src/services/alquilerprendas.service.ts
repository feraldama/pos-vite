import api from "./api";
import type { AxiosError } from "axios";

export const getAlquilerPrendas = async (
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
    const response = await api.get("/alquilerprendas", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener prendas de alquiler",
      }
    );
  }
};

export const getAlquilerPrendasByAlquilerId = async (
  alquilerId: string | number
) => {
  try {
    const response = await api.get(`/alquilerprendas/alquiler/${alquilerId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener prendas del alquiler",
      }
    );
  }
};

export const getAlquilerPrendasById = async (
  alquilerId: string | number,
  alquilerPrendasId: string | number
) => {
  try {
    const response = await api.get(
      `/alquilerprendas/${alquilerId}/${alquilerPrendasId}`
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener prenda de alquiler",
      }
    );
  }
};

export const createAlquilerPrendas = async (
  alquilerPrendasData: Record<string, unknown>
) => {
  try {
    const response = await api.post("/alquilerprendas", alquilerPrendasData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al crear prenda de alquiler",
      }
    );
  }
};

export const updateAlquilerPrendas = async (
  alquilerId: string | number,
  alquilerPrendasId: string | number,
  alquilerPrendasData: Record<string, unknown>
) => {
  try {
    const response = await api.put(
      `/alquilerprendas/${alquilerId}/${alquilerPrendasId}`,
      alquilerPrendasData
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar prenda de alquiler",
      }
    );
  }
};

export const deleteAlquilerPrendas = async (
  alquilerId: string | number,
  alquilerPrendasId: string | number
) => {
  try {
    const response = await api.delete(
      `/alquilerprendas/${alquilerId}/${alquilerPrendasId}`
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al eliminar prenda de alquiler",
      }
    );
  }
};

export const searchAlquilerPrendas = async (
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
    const response = await api.get("/alquilerprendas/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al buscar prendas de alquiler",
      }
    );
  }
};
