import { useEffect, useState } from "react";
import type { Cliente } from "../../types/cliente.types";
import ClienteForm from "./ClienteForm";

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCliente?: Cliente | null;
  onSubmit: (formData: Cliente) => void;
  showCodJSI?: boolean;
  defaultUserId?: string;
}

export default function ClienteFormModal({
  isOpen,
  onClose,
  currentCliente,
  onSubmit,
  showCodJSI = true,
  defaultUserId = "",
}: ClienteFormModalProps) {
  const [formData, setFormData] = useState<Cliente>({
    ClienteId: "",
    ClienteRUC: "",
    ClienteNombre: "",
    ClienteApellido: "",
    ClienteDireccion: "",
    ClienteTelefono: "",
    UsuarioId: defaultUserId,
    ClienteCodJSI: "",
  });

  useEffect(() => {
    if (currentCliente) {
      setFormData({ ...currentCliente });
    } else {
      setFormData({
        ClienteId: "",
        ClienteRUC: "",
        ClienteNombre: "",
        ClienteApellido: "",
        ClienteDireccion: "",
        ClienteTelefono: "",
        UsuarioId: defaultUserId,
        ClienteCodJSI: "",
      });
    }
  }, [currentCliente, defaultUserId]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Convertir a mayúsculas los campos de nombre y apellido
    const processedValue =
      name === "ClienteNombre" || name === "ClienteApellido"
        ? value.toUpperCase()
        : value;
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="relative w-full max-w-2xl max-h-full z-10">
        <div className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between p-4 border-b rounded-t">
            <h3 className="text-xl font-semibold text-gray-900">
              {currentCliente
                ? `Editar cliente: ${currentCliente.ClienteId}`
                : "Crear nuevo cliente"}
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center"
              onClick={onClose}
            >
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>
          <div className="p-6">
            <ClienteForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onCancel={onClose}
              isEditing={!!currentCliente}
              showCodJSI={showCodJSI}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
