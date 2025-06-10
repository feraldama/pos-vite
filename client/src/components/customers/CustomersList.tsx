import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/useAuth";

interface Cliente {
  id: string | number;
  ClienteId: string;
  ClienteRUC: string;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteDireccion: string;
  ClienteTelefono: string;
  ClienteTipo: string;
  UsuarioId: string;
  ClienteCodJSI: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface CustomersListProps {
  clientes: Cliente[];
  onDelete?: (item: Cliente) => void;
  onEdit?: (item: Cliente) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCliente?: Cliente | null;
  onSubmit: (formData: Cliente) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function CustomersList({
  clientes,
  onDelete,
  onEdit,
  onCreate,
  pagination,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  isModalOpen,
  onCloseModal,
  currentCliente,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: CustomersListProps) {
  const [formData, setFormData] = useState<Cliente>({
    id: "",
    ClienteId: "",
    ClienteRUC: "",
    ClienteNombre: "",
    ClienteApellido: "",
    ClienteDireccion: "",
    ClienteTelefono: "",
    ClienteTipo: "",
    UsuarioId: "",
    ClienteCodJSI: "",
  });

  const { user } = useAuth();

  useEffect(() => {
    if (currentCliente) {
      setFormData({ ...currentCliente });
    } else {
      setFormData({
        id: "",
        ClienteId: "",
        ClienteRUC: "",
        ClienteNombre: "",
        ClienteApellido: "",
        ClienteDireccion: "",
        ClienteTelefono: "",
        ClienteTipo: "MI",
        UsuarioId: user?.id || "",
        ClienteCodJSI: "",
      });
    }
  }, [currentCliente, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const columns = [
    { key: "ClienteId", label: "ID" },
    { key: "ClienteRUC", label: "RUC" },
    { key: "ClienteNombre", label: "Nombre" },
    { key: "ClienteApellido", label: "Apellido" },
    { key: "ClienteDireccion", label: "Dirección" },
    { key: "ClienteTelefono", label: "Teléfono" },
    { key: "ClienteTipo", label: "Tipo" },
    { key: "UsuarioId", label: "Usuario" },
    { key: "ClienteCodJSI", label: "Cod. JSI" },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar clientes"
          />
        </div>
        <div className="py-4">
          <ActionButton
            label="Nuevo Cliente"
            onClick={onCreate}
            icon={PlusIcon}
          />
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {clientes.length} de {pagination?.totalItems} clientes
        </div>
      </div>
      <DataTable<Cliente>
        columns={columns}
        data={clientes}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron clientes"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-2xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentCliente
                    ? `Editar cliente: ${currentCliente.ClienteId}`
                    : "Crear nuevo cliente"}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center"
                  onClick={onCloseModal}
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
              <div className="p-6 space-y-6">
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
                      value={formData.ClienteRUC}
                      onChange={handleInputChange}
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
                      value={formData.ClienteNombre}
                      onChange={handleInputChange}
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
                      value={formData.ClienteApellido}
                      onChange={handleInputChange}
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
                      value={formData.ClienteDireccion}
                      onChange={handleInputChange}
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
                      value={formData.ClienteTelefono}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ClienteTipo"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Tipo
                    </label>
                    <select
                      name="ClienteTipo"
                      id="ClienteTipo"
                      value={formData.ClienteTipo}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="MI">Minorista</option>
                      <option value="MA">Mayorista</option>
                    </select>
                  </div>
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
                      value={formData.ClienteCodJSI}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
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
                      value={formData.UsuarioId}
                      readOnly
                      disabled
                      className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                    />{" "}
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentCliente ? "Actualizar" : "Crear"}
                  type="submit"
                />
                <ActionButton
                  label="Cancelar"
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                  onClick={onCloseModal}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
