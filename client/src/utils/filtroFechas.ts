import { useEffect, useState } from "react";
import type { FiltroFechasAlquiler } from "../services/alquiler.service";

// Mismo tope que el backend (MAX_DIAS_RANGO en alquiler.controller)
export const MAX_DIAS_RANGO = 90;

export const FILTRO_POR_DEFECTO: FiltroFechasAlquiler = { dias: 7 };

// Fecha local -> "YYYY-MM-DD"
export const aFechaISO = (d: Date) => {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

export const hoyISO = () => aFechaISO(new Date());

export const sumarDiasISO = (fecha: string, dias: number) => {
  const [y, m, d] = fecha.split("-").map(Number);
  return aFechaISO(new Date(y, m - 1, d + dias));
};

const diasEntre = (desde: string, hasta: string) =>
  Math.round(
    (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) /
      86400000
  );

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Devuelve el mensaje de error del rango, o null si es válido
export const validarRango = (desde: string, hasta: string) => {
  if (!FECHA_ISO.test(desde) || !FECHA_ISO.test(hasta)) {
    return "Completá ambas fechas";
  }
  // Mientras se tipea el año, el input puede entregar "0002-..."
  if (Number(desde.slice(0, 4)) < 2000 || Number(hasta.slice(0, 4)) < 2000) {
    return "Fecha inválida";
  }
  if (desde > hasta) return "La fecha desde no puede ser mayor que la fecha hasta";
  if (diasEntre(desde, hasta) > MAX_DIAS_RANGO) {
    return `El rango no puede superar los ${MAX_DIAS_RANGO} días`;
  }
  return null;
};

const formatearCorta = (fecha: string) => {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
};

export const describirFiltro = (filtro: FiltroFechasAlquiler) =>
  "dias" in filtro
    ? `Próximos ${filtro.dias} días`
    : `del ${formatearCorta(filtro.desde)} al ${formatearCorta(filtro.hasta)}`;

const leerFiltroGuardado = (clave: string): FiltroFechasAlquiler => {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave) || "null");
    if (
      typeof guardado?.dias === "number" &&
      guardado.dias >= 1 &&
      guardado.dias <= MAX_DIAS_RANGO
    ) {
      return { dias: guardado.dias };
    }
    if (
      typeof guardado?.desde === "string" &&
      typeof guardado?.hasta === "string" &&
      !validarRango(guardado.desde, guardado.hasta) &&
      // Un rango que ya terminó no sirve para "próximos"; volvemos al default
      guardado.hasta >= hoyISO()
    ) {
      return { desde: guardado.desde, hasta: guardado.hasta };
    }
  } catch {
    // localStorage no disponible o valor corrupto
  }
  return FILTRO_POR_DEFECTO;
};

// Filtro de fechas que se recuerda entre visitas al dashboard
export const useFiltroGuardado = (clave: string) => {
  const [filtro, setFiltro] = useState(() => leerFiltroGuardado(clave));

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(filtro));
    } catch {
      // Sin persistencia; el filtro sigue funcionando en memoria
    }
  }, [clave, filtro]);

  return [filtro, setFiltro] as const;
};
