import api from "./api";
import type { AxiosError } from "axios";

export interface JugadorRanking {
  id: string | number;
  nombre: string;
  categoria: number;
  sexo: string;
  puntos: number;
  partidosJugados: number;
  subTorneos?: number;
}

// Obtener ranking global
export const getRankingGlobal = async (
  categoria: string = "8",
  sexo: string = "M"
): Promise<JugadorRanking[]> => {
  try {
    const response = await api.get("/ranking/global", {
      params: { categoria, sexo },
    });
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ranking global",
      }
    );
  }
};

// Obtener ranking por competencia
export const getRankingCompetencia = async (
  competenciaId: string | number,
  categoria: string = "8",
  sexo: string = "M"
): Promise<JugadorRanking[]> => {
  try {
    const response = await api.get("/ranking/competencia", {
      params: { competenciaId, categoria, sexo },
    });
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ranking de competencia",
      }
    );
  }
};
