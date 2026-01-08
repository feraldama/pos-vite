import api from "./api";
import type { AxiosError } from "axios";

export const getTiposPrenda = async (
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
    const response = await api.get("/tipoprenda", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener tipos de prenda",
      }
    );
  }
};

export const getAllTiposPrenda = async () => {
  try {
    const response = await api.get("/tipoprenda/all");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener todos los tipos de prenda",
      }
    );
  }
};

export const getTipoPrendaById = async (id: string | number) => {
  try {
    const response = await api.get(`/tipoprenda/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener tipo de prenda",
      }
    );
  }
};

export const createTipoPrenda = async (
  tipoPrendaData: Record<string, unknown>
) => {
  try {
    const response = await api.post("/tipoprenda", tipoPrendaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al crear tipo de prenda" }
    );
  }
};

export const updateTipoPrenda = async (
  id: string | number,
  tipoPrendaData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/tipoprenda/${id}`, tipoPrendaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar tipo de prenda",
      }
    );
  }
};

export const deleteTipoPrenda = async (id: string | number) => {
  try {
    const response = await api.delete(`/tipoprenda/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al eliminar tipo de prenda",
      }
    );
  }
};

export const searchTiposPrenda = async (
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
    const response = await api.get("/tipoprenda/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al buscar tipos de prenda",
      }
    );
  }
};
