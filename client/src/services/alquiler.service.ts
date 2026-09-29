import api from "./api";
import type { AxiosError } from "axios";

export const getAlquileres = async (
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
    const response = await api.get("/alquiler", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener alquileres" }
    );
  }
};

export const getAlquilerById = async (id: string | number) => {
  try {
    const response = await api.get(`/alquiler/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener alquiler" };
  }
};

export const createAlquiler = async (alquilerData: Record<string, unknown>) => {
  try {
    const response = await api.post("/alquiler", alquilerData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear alquiler" };
  }
};

// Cambia solo el estado (no reenvía montos que pudieron cambiar mientras tanto)
export const updateEstadoAlquiler = async (
  id: string | number,
  estado: string
) => {
  try {
    const response = await api.patch(`/alquiler/${id}/estado`, {
      AlquilerEstado: estado,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar el estado del alquiler",
      }
    );
  }
};

export const updateAlquiler = async (
  id: string | number,
  alquilerData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/alquiler/${id}`, alquilerData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar alquiler" }
    );
  }
};

export const deleteAlquiler = async (id: string | number) => {
  try {
    const response = await api.delete(`/alquiler/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al eliminar alquiler" }
    );
  }
};

export const searchAlquileres = async (
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
    const response = await api.get("/alquiler/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al buscar alquileres" }
    );
  }
};

export const getAlquileresPendientesPorCliente = async (
  clienteId: number,
  localId?: number
) => {
  try {
    const params = localId ? { localId } : {};
    const response = await api.get(`/alquiler/pendientes/${clienteId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener alquileres pendientes",
      }
    );
  }
};

export const procesarPagoAlquileres = async (pagoData: {
  clienteId: number;
  montoPago: number;
  tipoPago: string;
  fecha: string;
  cajaId: string | number;
  usuarioId: string | number;
}) => {
  try {
    const response = await api.post("/alquiler/procesar-pago", pagoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al procesar el pago",
      }
    );
  }
};

// Próximos N días desde hoy, o un rango de fechas (YYYY-MM-DD)
export type FiltroFechasAlquiler =
  | { dias: number }
  | { desde: string; hasta: string };

export const getAlquileresProximosEntrega = async (
  filtro: FiltroFechasAlquiler = { dias: 7 }
) => {
  try {
    const response = await api.get("/alquiler/proximos-entrega", {
      params: filtro,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener alquileres próximos a entrega",
      }
    );
  }
};

export const getAlquileresProximosDevolucion = async (
  filtro: FiltroFechasAlquiler = { dias: 7 }
) => {
  try {
    const response = await api.get("/alquiler/proximos-devolucion", {
      params: filtro,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener alquileres próximos a devolución",
      }
    );
  }
};
