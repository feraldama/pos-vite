import api from "./api";
import type { AxiosError } from "axios";

export const aperturaCierreCaja = async (data: {
  apertura: 0 | 1;
  CajaId: string | number;
  Monto: number;
  UsuarioId?: string | number;
}) => {
  try {
    const response = await api.post(
      "/registrodiariocaja/apertura-cierre",
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error en apertura/cierre de caja",
      }
    );
  }
};
