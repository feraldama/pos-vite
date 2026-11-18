import type { ReactNode } from "react";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface Props {
  /** Prefijo para los ids (debe ser único en la pantalla). */
  id: string;
  titulo: string;
  /** Texto chico bajo el título. */
  subtitulo?: ReactNode;
  minimizada: boolean;
  onToggleMinimizada: () => void;
  busqueda: string;
  onBusqueda: (valor: string) => void;
  /** Controles a la derecha (filtro de fechas). */
  acciones?: ReactNode;
}

// Encabezado de las secciones de alquileres del dashboard: título que
// minimiza/expande la lista, buscador de cliente y filtros. El buscador queda
// visible aunque la sección esté minimizada, para ir directo a un cliente.
export default function CabeceraSeccionAlquileres({
  id,
  titulo,
  subtitulo,
  minimizada,
  onToggleMinimizada,
  busqueda,
  onBusqueda,
  acciones,
}: Props) {
  const idBusqueda = `${id}-busqueda`;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            <button
              type="button"
              onClick={onToggleMinimizada}
              aria-expanded={!minimizada}
              aria-controls={`${id}-contenido`}
              title={minimizada ? "Expandir lista" : "Minimizar lista"}
              className="-ml-1 inline-flex cursor-pointer items-center gap-2 rounded-lg px-1 text-left transition-colors duration-200 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <ChevronDownIcon
                aria-hidden="true"
                className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                  minimizada ? "-rotate-90" : ""
                }`}
              />
              {titulo}
            </button>
          </h2>
          {subtitulo && (
            <p className="mt-1 text-sm text-gray-500">{subtitulo}</p>
          )}
        </div>
        {acciones}
      </div>

      <div className="relative max-w-md">
        <label htmlFor={idBusqueda} className="sr-only">
          Buscar cliente por nombre, apellido, cédula o teléfono
        </label>
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          id={idBusqueda}
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onBusqueda("");
          }}
          placeholder="Buscar cliente por nombre, apellido, cédula o teléfono"
          autoComplete="off"
          className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => onBusqueda("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <XMarkIcon aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
