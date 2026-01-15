import type { Cliente } from "../../types/cliente.types";
import ActionButton from "./Button/ActionButton";

interface ClienteFormProps {
  formData: Cliente;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isEditing?: boolean;
  showCodJSI?: boolean;
}

export default function ClienteForm({
  formData,
  onInputChange,
  onSubmit,
  onCancel,
  isEditing = false,
  showCodJSI = true,
}: ClienteFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-6 gap-6">
        <div className="col-span-6 sm:col-span-3">
          <label
            htmlFor="ClienteRUC"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            RUC
          </label>
          <input
            type="text"
            name="ClienteRUC"
            id="ClienteRUC"
            value={formData.ClienteRUC || ""}
            onChange={onInputChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <label
            htmlFor="ClienteNombre"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Nombre
          </label>
          <input
            type="text"
            name="ClienteNombre"
            id="ClienteNombre"
            value={formData.ClienteNombre || ""}
            onChange={onInputChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            required
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <label
            htmlFor="ClienteApellido"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Apellido
          </label>
          <input
            type="text"
            name="ClienteApellido"
            id="ClienteApellido"
            value={formData.ClienteApellido || ""}
            onChange={onInputChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <label
            htmlFor="ClienteDireccion"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Dirección
          </label>
          <input
            type="text"
            name="ClienteDireccion"
            id="ClienteDireccion"
            value={formData.ClienteDireccion || ""}
            onChange={onInputChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
        <div className="col-span-6 sm:col-span-3">
          <label
            htmlFor="ClienteTelefono"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Teléfono
          </label>
          <input
            type="text"
            name="ClienteTelefono"
            id="ClienteTelefono"
            value={formData.ClienteTelefono || ""}
            onChange={onInputChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
        {showCodJSI && (
          <div className="col-span-6 sm:col-span-3">
            <label
              htmlFor="ClienteCodJSI"
              className="block mb-2 text-sm font-medium text-gray-900"
            >
              Código JSI
            </label>
            <input
              type="text"
              name="ClienteCodJSI"
              id="ClienteCodJSI"
              value={formData.ClienteCodJSI || ""}
              onChange={onInputChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>
        )}
        <div className="col-span-6 sm:col-span-3">
          <label
            htmlFor="UsuarioId"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Usuario ID
          </label>
          <input
            type="text"
            name="UsuarioId"
            id="UsuarioId"
            value={formData.UsuarioId || ""}
            readOnly
            disabled
            className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
          />
        </div>
      </div>
      <div className="flex items-center space-x-2 border-t border-gray-200 pt-6">
        <ActionButton
          label={isEditing ? "Actualizar" : "Crear"}
          type="submit"
        />
        <ActionButton
          label="Cancelar"
          className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
          onClick={onCancel}
        />
      </div>
    </form>
  );
}
