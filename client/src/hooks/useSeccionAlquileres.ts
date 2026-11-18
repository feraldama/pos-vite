import { useEffect, useState } from "react";
import type { FiltroFechasAlquiler } from "../services/alquiler.service";
import { useFiltroGuardado } from "../utils/filtroFechas";

// Mínimo de caracteres para buscar (con 1 letra trae medio padrón)
const MIN_BUSQUEDA = 2;
const ESPERA_MS = 300;

const leerMinimizada = (clave: string) => {
  try {
    return localStorage.getItem(clave) === "1";
  } catch {
    return false;
  }
};

/**
 * Estado de una sección de alquileres del dashboard: filtro de fechas
 * (guardado), búsqueda de cliente y si está minimizada (también guardado).
 * Minimizada y sin búsqueda no pide nada a la API, así la pantalla abre
 * rápido y se va directo al buscador.
 */
export function useSeccionAlquileres<T>(
  clave: string,
  cargar: (
    filtro: FiltroFechasAlquiler,
    busqueda: string
  ) => Promise<{ data?: T[]; recortada?: boolean; limite?: number }>,
  recarga: number
) {
  // Mismas claves que antes ("dashboard.filtroEntrega"), para no perder el
  // filtro que cada usuario ya tenía guardado
  const [filtro, setFiltro] = useFiltroGuardado(`dashboard.filtro${clave}`);
  const claveMinimizada = `dashboard.minimizada${clave}`;
  const [minimizada, setMinimizada] = useState(() =>
    leerMinimizada(claveMinimizada)
  );
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [alquileres, setAlquileres] = useState<T[]>([]);
  // La búsqueda trajo más resultados que el máximo y la lista vino recortada
  const [recortada, setRecortada] = useState<{ limite: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Espera a que se deje de tipear antes de consultar
  useEffect(() => {
    const termino = busqueda.trim();
    const valor = termino.length >= MIN_BUSQUEDA ? termino : "";
    const t = setTimeout(() => setBusquedaAplicada(valor), valor ? ESPERA_MS : 0);
    return () => clearTimeout(t);
  }, [busqueda]);

  const visible = !minimizada || busquedaAplicada !== "";

  // "vigente" descarta respuestas viejas si cambian filtro o búsqueda antes
  // de que lleguen
  useEffect(() => {
    if (!visible) return;
    let vigente = true;
    setLoading(true);
    cargar(filtro, busquedaAplicada)
      .then((res) => {
        if (!vigente) return;
        setAlquileres(res.data || []);
        setRecortada(
          res.recortada ? { limite: res.limite ?? res.data?.length ?? 0 } : null
        );
      })
      .catch((error) => {
        console.error(`Error al cargar alquileres (${clave}):`, error);
        if (vigente) {
          setAlquileres([]);
          setRecortada(null);
        }
      })
      .finally(() => vigente && setLoading(false));
    return () => {
      vigente = false;
    };
  }, [filtro, busquedaAplicada, visible, recarga, cargar, clave]);

  const toggleMinimizada = () => {
    setMinimizada((actual) => {
      const nueva = !actual;
      try {
        localStorage.setItem(claveMinimizada, nueva ? "1" : "0");
      } catch {
        // sin localStorage: solo dura mientras la pantalla está abierta
      }
      return nueva;
    });
  };

  return {
    filtro,
    setFiltro,
    busqueda,
    setBusqueda,
    /** Término que efectivamente se está buscando ("" = sin búsqueda). */
    busquedaAplicada,
    minimizada,
    toggleMinimizada,
    /** false = minimizada y sin búsqueda: no se muestra la lista. */
    visible,
    alquileres,
    /** { limite } si la búsqueda tiene más resultados que los mostrados. */
    recortada,
    loading,
  };
}
