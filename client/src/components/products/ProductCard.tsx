import React from "react";

interface ProductCardProps {
  // id: number;
  nombre: string;
  precio: number;
  imagen: string;
  stock: number;
  onAdd: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  // id,
  nombre,
  precio,
  imagen,
  stock,
  onAdd,
}) => {
  return (
    <div
      className="w-full bg-white border border-gray-200 rounded-lg shadow-sm"
      onClick={onAdd}
    >
      <div className="p-4">
        <img
          className="w-full h-40 object-contain rounded-t-lg"
          src={imagen}
          alt={nombre}
        />
      </div>
      <div className="px-5 pb-5">
        <h5 className="text-lg font-semibold tracking-tight text-gray-900 truncate">
          {nombre}
        </h5>

        {/* Rating section (puedes personalizar según tus necesidades) */}
        <div className="flex items-center mt-2.5 mb-3">
          <div className="flex items-center space-x-1">
            {[...Array(4)].map((_, i) => (
              <svg
                key={i}
                className="w-4 h-4 text-yellow-300"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 22 20"
              >
                <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
              </svg>
            ))}
            <svg
              className="w-4 h-4 text-gray-200"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 22 20"
            >
              <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
            </svg>
          </div>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded ml-2">
            4.0
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-gray-900">
              Gs. {precio.toLocaleString()}
            </span>
            <div className="text-xs text-gray-500">Stock: {stock}</div>
          </div>
          <button
            onClick={onAdd}
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-2 text-center"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
