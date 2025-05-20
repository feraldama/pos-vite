// import React from "react";
// import PropTypes from "prop-types";

interface SuccessModalProps {
  message: string;
  onClose: () => void;
}

export const SuccessModal = ({ message, onClose }: SuccessModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo opacado */}
      <div className="absolute inset-0 bg-black opacity-50" />

      <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4 z-10">
        {/* Botón de cierre - Posicionado a la derecha */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Contenido del modal */}
        <div className="flex flex-col items-center pt-2">
          {" "}
          {/* Añadido pt-2 para compensar el botón */}
          {/* Icono de check (verificación) */}
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          {/* Mensaje */}
          <h3 className="text-xl font-semibold text-gray-800 mb-2">¡Éxito!</h3>
          <p className="text-gray-600 text-center mb-6">{message}</p>
          {/* Botón OK */}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
