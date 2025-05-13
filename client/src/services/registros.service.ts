import api from "./api";
import type { AxiosError } from "axios";

export const getRegistrosDiariosCaja = async (
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
    const response = await api.get("/registrodiariocaja", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener registros diarios de caja",
      }
    );
  }
};

export const searchRegistrosDiariosCaja = async (
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
    const response = await api.get(`/registrodiariocaja/search`, { params });
    console.log("log: 🚀 response:", response.data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al buscar registros diarios de caja",
      }
    );
  }
};

export const getRegistroDiarioCajaById = async (id: string | number) => {
  try {
    const response = await api.get(`/registrodiariocaja/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener el registro" }
    );
  }
};

export const createRegistroDiarioCaja = async (
  registroData: Record<string, unknown>
) => {
  try {
    const response = await api.post("/registrodiariocaja", registroData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al crear el registro" }
    );
  }
};

export const updateRegistroDiarioCaja = async (
  id: string | number,
  registroData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/registrodiariocaja/${id}`, registroData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar el registro",
      }
    );
  }
};

export const deleteRegistroDiarioCaja = async (id: string | number) => {
  try {
    const response = await api.delete(`/registrodiariocaja/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al eliminar el registro" }
    );
  }
};
