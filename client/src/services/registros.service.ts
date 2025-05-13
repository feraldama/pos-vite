import api from "./api";
import type { AxiosError } from "axios";

export const getRegistrosDiariosCaja = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(
      `/registrodiariocaja?page=${page}&limit=${limit}`
    );
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
  limit = 10
) => {
  try {
    const response = await api.get(
      `/registrodiariocaja/search?q=${searchTerm}&page=${page}&limit=${limit}`
    );
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
