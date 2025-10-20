import api from "./api";
import type { AxiosError } from "axios";

// Traer todas las competencias sin paginación
export const getCompetencias = async (params = {}) => {
  const res = await api.get("/competencias", { params });
  return res.data;
};

// Traer competencias paginadas
export const getCompetenciasPaginated = async (
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
    const response = await api.get("/competencias", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener competencias" }
    );
  }
};

export const getCompetenciasAll = async () => {
  const res = await api.get("/competencias");
  return res.data;
};

export const getCompetenciaById = async (id: string | number) => {
  try {
    const response = await api.get(`/competencias/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener competencia" }
    );
  }
};

export const createCompetencia = async (competenciaData: {
  CompetenciaNombre: string;
  CompetenciaFechaInicio: string;
  CompetenciaFechaFin: string;
}) => {
  try {
    const response = await api.post("/competencias", competenciaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al crear competencia" }
    );
  }
};

export const updateCompetencia = async (
  id: string | number,
  competenciaData: {
    CompetenciaNombre: string;
    CompetenciaFechaInicio: string;
    CompetenciaFechaFin: string;
  }
) => {
  try {
    const response = await api.put(`/competencias/${id}`, competenciaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar competencia",
      }
    );
  }
};

export const deleteCompetencia = async (id: string | number) => {
  try {
    const response = await api.delete(`/competencias/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al eliminar competencia" }
    );
  }
};

export const searchCompetencias = async (
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
    const response = await api.get("/competencias/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al buscar competencias" }
    );
  }
};
