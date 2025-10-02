import React, { useState, useMemo } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

// Definir la interfaz Cliente localmente para evitar error de importación
interface Cliente {
  ClienteId: number;
  ClienteRUC: string;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteDireccion: string;
  ClienteTelefono: string;
  ClienteTipo: string;
  UsuarioId: string;
}

interface ClienteModalProps {
  show: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onSelect: (cliente: Cliente) => void;
  onCreateCliente?: (cliente: Cliente) => void;
  currentUserId?: string;
}

const ClienteModal: React.FC<ClienteModalProps> = ({
  show,
  onClose,
  clientes,
  onSelect,
  onCreateCliente,
  currentUserId,
}) => {
  const [filtros, setFiltros] = useState({
    ruc: "",
    nombre: "",
    apellido: "",
    telefono: "",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<Cliente>({
    ClienteId: 0,
    ClienteRUC: "",
    ClienteNombre: "",
    ClienteApellido: "",
    ClienteDireccion: "",
    ClienteTelefono: "",
    ClienteTipo: "MI",
    UsuarioId: currentUserId || "",
  });

  const clientesFiltrados = useMemo(() => {
    return clientes.filter(
      (c) =>
        c.ClienteRUC.toLowerCase().includes(filtros.ruc.toLowerCase()) &&
        c.ClienteNombre.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
        (c.ClienteApellido || "")
          .toLowerCase()
          .includes(filtros.apellido.toLowerCase()) &&
        (c.ClienteTelefono || "")
          .toLowerCase()
          .includes(filtros.telefono.toLowerCase())
    );
  }, [clientes, filtros]);

  const totalPages = Math.ceil(clientesFiltrados.length / rowsPerPage);
  const paginatedClientes = clientesFiltrados.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "ClienteNombre" || name === "ClienteApellido"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onCreateCliente) {
      onCreateCliente(formData);
      setShowCreateModal(false);
      // Reset form data
      setFormData({
        ClienteId: 0,
        ClienteRUC: "",
        ClienteNombre: "",
        ClienteApellido: "",
        ClienteDireccion: "",
        ClienteTelefono: "",
        ClienteTipo: "MI",
        UsuarioId: currentUserId || "",
      });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowCreateModal(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex justify-between items-center mb-4 pr-8">
          <h2 className="text-2xl font-semibold text-gray-800">
            Buscar Jugador
          </h2>
          {onCreateCliente && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Nuevo Jugador
            </button>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                RUC
              </label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.ruc}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, ruc: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Nombre
              </label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.nombre}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Apellido
              </label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.apellido}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, apellido: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Teléfono
              </label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.telefono}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, telefono: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="py-2 px-4 text-left">RUC</th>
                <th className="py-2 px-4 text-left">Nombre</th>
                <th className="py-2 px-4 text-left">Apellido</th>
                <th className="py-2 px-4 text-left">Teléfono</th>
                <th className="py-2 px-4 text-left">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-400">
                    No hay clientes
                  </td>
                </tr>
              )}
              {paginatedClientes.map((c) => (
                <tr
                  key={c.ClienteId}
                  className="hover:bg-blue-50 cursor-pointer transition"
                  onClick={() => onSelect(c)}
                >
                  <td className="py-2 px-4">{c.ClienteRUC || ""}</td>
                  <td className="py-2 px-4">{c.ClienteNombre}</td>
                  <td className="py-2 px-4">{c.ClienteApellido || ""}</td>
                  <td className="py-2 px-4">{c.ClienteTelefono || ""}</td>
                  <td className="py-2 px-4">
                    {c.ClienteTipo === "MI"
                      ? "Minorista"
                      : c.ClienteTipo === "MA"
                      ? "Mayorista"
                      : c.ClienteTipo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            {clientesFiltrados.length === 0
              ? "0"
              : `${(page - 1) * rowsPerPage + 1} to ${Math.min(
                  page * rowsPerPage,
                  clientesFiltrados.length
                )} of ${clientesFiltrados.length}`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Filas por página:</span>
            <select
              className="border border-gray-200 rounded px-2 py-1 text-sm"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded text-gray-500 border border-gray-200 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 rounded text-gray-500 border border-gray-200 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* Modal para crear cliente */}
        {showCreateModal && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center"
            onClick={handleBackdropClick}
          >
            <div className="absolute inset-0 bg-black opacity-50" />
            <div className="relative w-full max-w-2xl max-h-full z-10">
              <form
                onSubmit={handleCreateSubmit}
                className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between p-4 border-b rounded-t">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Crear nuevo jugador
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center"
                    onClick={() => setShowCreateModal(false)}
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
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                  <button
                    type="submit"
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center cursor-pointer"
                  >
                    Crear Cliente
                  </button>
                  <button
                    type="button"
                    className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 cursor-pointer"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClienteModal;
