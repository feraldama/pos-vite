import React from "react";
import { formatMiles } from "../../utils/utils";

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
  return (
    <div
      className="w-full bg-white border border-gray-200 rounded-lg shadow-md cursor-pointer p-0 flex flex-col items-center transition hover:shadow-lg"
      onClick={onAdd}
    >
      <div className="w-full flex justify-center items-center p-4">
        <img
          className="h-32 object-contain bg-white"
          src={imagen}
          alt={nombre}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="w-full px-4 pb-2 text-center">
        <div className="font-bold text-base text-gray-800 uppercase leading-tight min-h-[44px] flex items-center justify-center">
          {nombre}
        </div>
        <div className="font-bold text-2xl text-orange-500 mb-0">
          Gs. {formatMiles(mostrarPrecio)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Stock: <span className="text-green-600 font-semibold">{stock}</span>
        </div>
        {fechasAlquiladas && fechasAlquiladas.length > 0 && (
          <div className="mt-2 mb-1 flex flex-col gap-1">
            {fechasAlquiladas
              .slice(0, MAX_RANGOS_VISIBLES)
              .map((rango, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5 font-semibold"
                  title={rango.cliente ? `Alquilado por ${rango.cliente}` : "Alquilado"}
                >
                  Alquilado: {formatFecha(rango.desde)} al{" "}
                  {formatFecha(rango.hasta)}
                </div>
              ))}
            {fechasAlquiladas.length > MAX_RANGOS_VISIBLES && (
              <div className="text-xs text-red-500 font-medium">
                +{fechasAlquiladas.length - MAX_RANGOS_VISIBLES} alquiler
                {fechasAlquiladas.length - MAX_RANGOS_VISIBLES > 1 ? "es" : ""}{" "}
                más
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
