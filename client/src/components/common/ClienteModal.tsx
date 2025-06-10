import React, { useState, useMemo } from "react";

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
}

const ClienteModal: React.FC<ClienteModalProps> = ({
  show,
  onClose,
  clientes,
  onSelect,
}) => {
  const [filtros, setFiltros] = useState({
    ruc: "",
    nombre: "",
    apellido: "",
    telefono: "",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Buscar Cliente
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                RUC
              </label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Search"
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
                placeholder="Search"
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
                placeholder="Search"
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
                placeholder="Search"
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
            <span className="text-sm">Rows per page:</span>
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
      </div>
    </div>
  );
};

export default ClienteModal;
