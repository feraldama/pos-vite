import React from "react";
import { formatMiles } from "../../utils/utils";

interface ProductCardProps {
  nombre: string;
  precio: number;
  precioMayorista?: number;
  clienteTipo?: string;
  imagen: string;
  stock: number;
  onAdd: () => void;
  precioUnitario?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({
  nombre,
  precio,
  precioMayorista,
  clienteTipo,
  imagen,
  stock,
  onAdd,
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
      </div>
    </div>
  );
};

export default ProductCard;
