import React from "react";
import { formatMiles } from "../../utils/formato";

export interface RangoAlquilado {
  desde: string; // ISO date
  hasta: string; // ISO date
  cliente?: string;
}

interface ProductCardProps {
  nombre: string;
  precio: number;
  precioMayorista?: number;
  clienteTipo?: string;
  imagen: string;
  stock: number;
  onAdd: () => void;
  precioUnitario?: number;
  fechasAlquiladas?: RangoAlquilado[];
}

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
  });

const MAX_RANGOS_VISIBLES = 3;

const ProductCard: React.FC<ProductCardProps> = ({
  nombre,
  precio,
  precioMayorista,
  clienteTipo,
  imagen,
  stock,
  onAdd,
  fechasAlquiladas,
}) => {
  const mostrarPrecio =
    clienteTipo === "MA" && precioMayorista !== undefined
      ? precioMayorista
      : precio;
  const sinStock = stock <= 0;

  return (
    // <button> en vez de un <div> con onClick: la tarjeta es la acción principal
    // de la pantalla y así se puede recorrer y activar con el teclado
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Agregar ${nombre}, Gs. ${formatMiles(mostrarPrecio)}`}
      className="flex w-full cursor-pointer flex-col items-center rounded-lg border border-slate-200 bg-white p-0 text-center shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <div className="flex w-full items-center justify-center p-4">
        <img
          // w-full además de la altura, para que la caja de la imagen no mida
          // 0px de ancho antes de cargar y todas las tarjetas queden parejas
          className="h-32 w-full object-contain bg-white"
          src={imagen}
          // El nombre va como texto justo debajo, repetirlo en el alt haría que
          // el lector de pantalla lo anuncie dos veces
          alt=""
          // Sin loading="lazy": acá todas las imágenes son data URI (base64 que
          // ya viene en la respuesta, o el SVG de placeholder), así que no hay
          // ningún pedido de red que diferir y con el placeholder impedía que
          // la imagen llegara a cargarse
          decoding="async"
        />
      </div>
      <div className="w-full px-4 pb-3">
        <div className="flex min-h-[44px] items-center justify-center text-base font-bold uppercase leading-tight text-slate-800">
          {nombre}
        </div>
        {/* orange-700 (5.18:1) en vez de orange-500 (2.80:1): el precio es el
            dato que más se mira y era el texto con menos contraste de la pantalla */}
        <div className="text-2xl font-bold tabular-nums text-orange-700">
          Gs. {formatMiles(mostrarPrecio)}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          Stock:{" "}
          <span
            className={`font-semibold tabular-nums ${
              sinStock ? "text-red-700" : "text-green-700"
            }`}
          >
            {stock}
          </span>
        </div>
        {fechasAlquiladas && fechasAlquiladas.length > 0 && (
          <div className="mt-2 mb-1 flex flex-col gap-1">
            {fechasAlquiladas
              .slice(0, MAX_RANGOS_VISIBLES)
              .map((rango, idx) => (
                <div
                  key={idx}
                  className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700"
                  title={
                    rango.cliente ? `Alquilado por ${rango.cliente}` : "Alquilado"
                  }
                >
                  Alquilado: {formatFecha(rango.desde)} al{" "}
                  {formatFecha(rango.hasta)}
                </div>
              ))}
            {fechasAlquiladas.length > MAX_RANGOS_VISIBLES && (
              <div className="text-xs font-medium text-red-700">
                +{fechasAlquiladas.length - MAX_RANGOS_VISIBLES} alquiler
                {fechasAlquiladas.length - MAX_RANGOS_VISIBLES > 1 ? "es" : ""}{" "}
                más
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

export default ProductCard;
