import api from "./api";
import type { AxiosError } from "axios";

export const getSucursales = async (
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
    const response = await api.get("/sucursales", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener sucursales" }
    );
  }
};

export const getSucursalById = async (id: string | number) => {
  try {
    const response = await api.get(`/sucursales/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener sucursal" };
  }
};

export const createSucursal = async (sucursalData: Record<string, unknown>) => {
  try {
    const response = await api.post("/sucursales", sucursalData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear sucursal" };
  }
};

export const updateSucursal = async (
  id: string | number,
  sucursalData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/sucursales/${id}`, sucursalData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar sucursal" }
    );
  }
};

export const deleteSucursal = async (id: string | number) => {
  try {
    const response = await api.delete(`/sucursales/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al eliminar sucursal" }
    );
  }
};

export const searchSucursales = async (
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
    const response = await api.get("/sucursales/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al buscar sucursales" }
    );
  }
};
