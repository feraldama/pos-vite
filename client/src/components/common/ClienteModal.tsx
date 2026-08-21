import React, { useState, useMemo } from "react";
import { activarConTeclado } from "../../utils/teclado";
import { PlusIcon } from "@heroicons/react/24/outline";
import ActionButton from "./Button/ActionButton";
import Modal from "./Modal";

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
    UsuarioId: currentUserId ? String(currentUserId).trim() : "",
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
        UsuarioId: currentUserId ? String(currentUserId).trim() : "",
      });
    }
  };

  // handleBackdropClick ya no hace falta: el cierre por clic en el fondo, por
  // Escape y la devolución del foco los maneja el componente Modal

  return (
    <Modal
      open={show}
      onClose={onClose}
      title="Buscar Cliente"
      maxWidth="max-w-4xl"
    >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          {onCreateCliente && (
            <ActionButton
              icon={PlusIcon}
              label="Nuevo Cliente"
              onClick={() => setShowCreateModal(true)}
            />
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 flex-shrink-0">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="clientemodal-ruc" className="block text-xs font-semibold text-gray-500 mb-1">
                RUC
              </label>
              <input
                id="clientemodal-ruc"
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.ruc}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, ruc: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="clientemodal-nombre" className="block text-xs font-semibold text-gray-500 mb-1">
                Nombre
              </label>
              <input
                id="clientemodal-nombre"
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.nombre}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="clientemodal-apellido" className="block text-xs font-semibold text-gray-500 mb-1">
                Apellido
              </label>
              <input
                id="clientemodal-apellido"
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.apellido}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, apellido: e.target.value }))
                }
              />
            </div>
            <div>
              <label
                htmlFor="clientemodal-telefono" className="block text-xs font-semibold text-gray-500 mb-1">
                Teléfono
              </label>
              <input
                id="clientemodal-telefono"
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
        <div className="overflow-y-auto overflow-x-auto rounded-lg flex-1 min-h-0">
          <table className="min-w-full bg-white">
            <thead className="sticky top-0 bg-gray-50 z-10">
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
                  <td colSpan={5} className="text-center py-4 text-slate-500">
                    No hay clientes
                  </td>
                </tr>
              )}
              {paginatedClientes.map((c) => (
                <tr
                  key={c.ClienteId}
                  // Fila seleccionable: no se puede envolver en <button> sin
                  // romper la tabla, así que se le da rol y foco propios
                  role="button"
                  tabIndex={0}
                  aria-label={`Seleccionar cliente ${c.ClienteNombre} ${
                    c.ClienteApellido || ""
                  }`.trim()}
                  className="cursor-pointer transition-colors duration-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                  onClick={() => onSelect(c)}
                  onKeyDown={activarConTeclado(() => onSelect(c))}
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
        <div className="flex items-center justify-between mt-4 flex-shrink-0">
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

        {/* Modal para crear cliente: z-60 para quedar sobre el modal de búsqueda */}
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Crear nuevo cliente"
          zIndex="z-60"
        >
              <form onSubmit={handleCreateSubmit}>
                <div className="space-y-6">
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
                        className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
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
                        className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
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
                        className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
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
                        className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
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
                        className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3 hidden">
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
                        className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
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
                <div className="-mx-6 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 pt-5">
                  <ActionButton
                    type="submit"
                    label="Crear Cliente"
                  />
                  <ActionButton
                    type="button"
                    variant="secondary"
                    label="Cancelar"
                    onClick={() => setShowCreateModal(false)}
                  />
                </div>
              </form>
        </Modal>
    </Modal>
  );
};

export default ClienteModal;
