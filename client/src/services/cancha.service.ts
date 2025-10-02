import api from "./api";
import type { AxiosError } from "axios";

// Traer todas las canchas sin paginación
export const getCanchas = async (params = {}) => {
  const res = await api.get("/canchas", { params });
  return res.data;
};

// Traer canchas paginadas
export const getCanchasPaginated = async (
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
    const response = await api.get("/canchas", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener canchas" };
  }
};

export const getCanchasAll = async () => {
  const res = await api.get("/canchas");
  return res.data;
};

export const getCanchaById = async (id: string | number) => {
  try {
    const response = await api.get(`/canchas/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener cancha" };
  }
};

export const createCancha = async (canchaData: {
  CanchaNombre: string;
  CanchaEstado: boolean;
  SucursalId: string | number;
}) => {
  try {
    const response = await api.post("/canchas", canchaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear cancha" };
  }
};

export const updateCancha = async (
  id: string | number,
  canchaData: {
    CanchaNombre: string;
    CanchaEstado: boolean;
    SucursalId: string | number;
  }
) => {
  try {
    const response = await api.put(`/canchas/${id}`, canchaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar cancha" }
    );
  }
};

export const deleteCancha = async (id: string | number) => {
  try {
    const response = await api.delete(`/canchas/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar cancha" };
  }
};

export const searchCanchas = async (
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
    const response = await api.get("/canchas/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar canchas" };
  }
};
