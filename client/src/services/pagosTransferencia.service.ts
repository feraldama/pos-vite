import api from "./api";

export interface PagoTransferencia {
  PagoTransferenciaId: number;
  PagoFecha: string;
  PagoMonto: number;
  PagoBeneficiario: string;
  PagoConcepto: string;
  TipoGastoGrupoId: number;
  TipoGastoGrupoDescripcion: string | null;
  PagoCuentaOrigen: string;
  PagoNumeroOperacion: string;
  PagoComprobanteNombre: string;
  TieneComprobante: boolean;
  UsuarioId: string;
  PagoFechaCarga: string;
}

/** Archivo nuevo para adjuntar. */
export interface ComprobanteNuevo {
  nombre: string;
  tipo: string;
  base64: string;
}

export interface PagoTransferenciaInput {
  PagoFecha: string;
  PagoMonto: number;
  PagoBeneficiario: string;
  PagoConcepto: string;
  TipoGastoGrupoId: number;
  PagoCuentaOrigen: string;
  PagoNumeroOperacion: string;
  /** undefined = no se toca, null = se quita */
  comprobante?: ComprobanteNuevo | null;
}

export interface SugerenciasPago {
  beneficiarios: string[];
  cuentas: string[];
}

export const getPagosTransferencia = async (
  desde: string,
  hasta: string
): Promise<PagoTransferencia[]> => {
  const { data } = await api.get("/pagos-transferencia", {
    params: { desde, hasta },
  });
  return data.data || [];
};

export const getReportePagosTransferencia = async (
  desde: string,
  hasta: string
): Promise<PagoTransferencia[]> => {
  const { data } = await api.get("/pagos-transferencia/reporte", {
    params: { desde, hasta },
  });
  return data.data || [];
};

export const getSugerenciasPago = async (): Promise<SugerenciasPago> => {
  const { data } = await api.get("/pagos-transferencia/sugerencias");
  return data.data || { beneficiarios: [], cuentas: [] };
};

export const createPagoTransferencia = async (pago: PagoTransferenciaInput) => {
  const { data } = await api.post("/pagos-transferencia", pago);
  return data;
};

export const updatePagoTransferencia = async (
  id: number,
  pago: PagoTransferenciaInput
) => {
  const { data } = await api.put(`/pagos-transferencia/${id}`, pago);
  return data;
};

export const deletePagoTransferencia = async (id: number) => {
  const { data } = await api.delete(`/pagos-transferencia/${id}`);
  return data;
};

/** Abre el comprobante en una pestaña nueva (la API pide el token, no sirve un link). */
export const verComprobante = async (id: number) => {
  // La pestaña se abre antes del await para que el navegador no la bloquee
  const ventana = window.open("", "_blank");
  try {
    const { data } = await api.get(`/pagos-transferencia/${id}/comprobante`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    ventana?.close();
    throw e;
  }
};

export const TIPOS_COMPROBANTE = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_COMPROBANTE_MB = 5;

/** Lee un archivo elegido por el usuario y lo valida antes de mandarlo. */
export function leerComprobante(archivo: File): Promise<ComprobanteNuevo> {
  return new Promise((resolve, reject) => {
    if (!TIPOS_COMPROBANTE.includes(archivo.type)) {
      reject(new Error("El comprobante tiene que ser una imagen (JPG, PNG, WEBP) o un PDF"));
      return;
    }
    if (archivo.size > MAX_COMPROBANTE_MB * 1024 * 1024) {
      reject(new Error(`El comprobante no puede superar ${MAX_COMPROBANTE_MB} MB`));
      return;
    }
    const lector = new FileReader();
    lector.onload = () =>
      resolve({
        nombre: archivo.name,
        tipo: archivo.type,
        base64: String(lector.result).split(",")[1] || "",
      });
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.readAsDataURL(archivo);
  });
}
