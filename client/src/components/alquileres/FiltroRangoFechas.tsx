import { useState } from "react";
import type { FiltroFechasAlquiler } from "../../services/alquiler.service";
import { hoyISO, sumarDiasISO, validarRango } from "../../utils/filtroFechas";

const OPCIONES_DIAS = [7, 15, 30];

interface Props {
  id: string;
  filtro: FiltroFechasAlquiler;
  onChange: (filtro: FiltroFechasAlquiler) => void;
}

const claseBoton = (activo: boolean) =>
  `cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
    activo
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  }`;

// Botones rápidos (7/15/30 días) o rango personalizado desde/hasta.
// Solo avisa al padre cuando el filtro es válido.
export default function FiltroRangoFechas({ id, filtro, onChange }: Props) {
  const esRango = !("dias" in filtro);
  const [personalizado, setPersonalizado] = useState(esRango);
  const [desde, setDesde] = useState(esRango ? filtro.desde : hoyISO());
  const [hasta, setHasta] = useState(
    esRango ? filtro.hasta : sumarDiasISO(hoyISO(), 7)
  );
  const error = personalizado ? validarRango(desde, hasta) : null;

  const elegirDias = (dias: number) => {
    setPersonalizado(false);
    onChange({ dias });
  };

  const elegirPersonalizado = () => {
    setPersonalizado(true);
    if (!validarRango(desde, hasta)) onChange({ desde, hasta });
  };

  const cambiarRango = (nuevoDesde: string, nuevoHasta: string) => {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    if (!validarRango(nuevoDesde, nuevoHasta)) {
      onChange({ desde: nuevoDesde, hasta: nuevoHasta });
    }
  };

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Período a mostrar"
        className="flex flex-wrap gap-2"
      >
        {OPCIONES_DIAS.map((dias) => {
          const activo = !personalizado && "dias" in filtro && filtro.dias === dias;
          return (
            <button
              key={dias}
              type="button"
              aria-pressed={activo}
              onClick={() => elegirDias(dias)}
              className={claseBoton(activo)}
            >
              {dias} días
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={personalizado}
          onClick={elegirPersonalizado}
          className={claseBoton(personalizado)}
        >
          Personalizado
        </button>
      </div>

      {personalizado && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor={`${id}-desde`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Desde
            </label>
            <input
              id={`${id}-desde`}
              type="date"
              value={desde}
              onChange={(e) => cambiarRango(e.target.value, hasta)}
              className="p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label
              htmlFor={`${id}-hasta`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Hasta
            </label>
            <input
              id={`${id}-hasta`}
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => cambiarRango(desde, e.target.value)}
              className="p-2 border border-gray-300 rounded-lg"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 pb-2">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
