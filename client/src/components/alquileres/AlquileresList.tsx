import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  getAllClientesSinPaginacion,
  createCliente,
} from "../../services/clientes.service";
import { getProductosAll } from "../../services/productos.service";
import { formatCurrency } from "../../utils/utils";
import ClienteModal from "../common/ClienteModal";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";

interface Alquiler {
  AlquilerId: number;
  ClienteId: number;
  AlquilerFechaAlquiler: string;
  AlquilerFechaEntrega?: string;
  AlquilerFechaDevolucion?: string;
  AlquilerEstado: string;
  AlquilerTotal: number;
  AlquilerEntrega: number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  prendas?: AlquilerPrenda[];
  [key: string]: unknown;
}

interface AlquilerPrenda {
  AlquilerId: number;
  AlquilerPrendasId: number;
  ProductoId: number;
  AlquilerPrendasPrecio: number;
  ProductoNombre?: string;
  ProductoCodigo?: string;
  TipoPrendaNombre?: string;
}

interface Pagination {
  totalItems: number;
}

interface AlquileresListProps {
  alquileres: Alquiler[];
  onDelete?: (item: Alquiler) => void;
  onEdit?: (item: Alquiler) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentAlquiler?: Alquiler | null;
  onSubmit: (formData: Alquiler) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function AlquileresList({
  alquileres,
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
  currentAlquiler,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: AlquileresListProps) {
  const [formData, setFormData] = useState<Alquiler>({
    AlquilerId: 0,
    ClienteId: 0,
    AlquilerFechaAlquiler: new Date().toISOString().slice(0, 16),
    AlquilerFechaEntrega: "",
    AlquilerFechaDevolucion: "",
    AlquilerEstado: "Pendiente",
    AlquilerTotal: 0,
    AlquilerEntrega: 0,
    prendas: [],
  });
  const [clientes, setClientes] = useState<
    {
      ClienteId: number;
      ClienteRUC: string;
      ClienteNombre: string;
      ClienteApellido: string;
      ClienteDireccion: string;
      ClienteTelefono: string;
      ClienteTipo: string;
      UsuarioId: string;
    }[]
  >([]);
  const [productos, setProductos] = useState<
    { ProductoId: number; ProductoNombre: string; ProductoCodigo: string }[]
  >([]);
  const [prendaActual, setPrendaActual] = useState<AlquilerPrenda>({
    AlquilerId: 0,
    AlquilerPrendasId: 0,
    ProductoId: 0,
    AlquilerPrendasPrecio: 0,
  });
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{
    ClienteId: number;
    ClienteNombre: string;
    ClienteApellido: string;
  } | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientesData, productosData] = await Promise.all([
          getAllClientesSinPaginacion(),
          getProductosAll(),
        ]);
        setClientes(clientesData.data || []);
        setProductos(productosData.data || []);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (currentAlquiler) {
      setFormData({
        ...currentAlquiler,
        AlquilerFechaAlquiler: currentAlquiler.AlquilerFechaAlquiler
          ? new Date(currentAlquiler.AlquilerFechaAlquiler)
              .toISOString()
              .slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        AlquilerFechaEntrega: currentAlquiler.AlquilerFechaEntrega
          ? new Date(currentAlquiler.AlquilerFechaEntrega)
              .toISOString()
              .slice(0, 16)
          : "",
        AlquilerFechaDevolucion: currentAlquiler.AlquilerFechaDevolucion
          ? new Date(currentAlquiler.AlquilerFechaDevolucion)
              .toISOString()
              .slice(0, 16)
          : "",
        prendas: currentAlquiler.prendas || [],
      });
      if (currentAlquiler.ClienteNombre && currentAlquiler.ClienteApellido) {
        setClienteSeleccionado({
          ClienteId: currentAlquiler.ClienteId,
          ClienteNombre: currentAlquiler.ClienteNombre,
          ClienteApellido: currentAlquiler.ClienteApellido,
        });
      }
    } else {
      setFormData({
        AlquilerId: 0,
        ClienteId: 0,
        AlquilerFechaAlquiler: new Date().toISOString().slice(0, 16),
        AlquilerFechaEntrega: "",
        AlquilerFechaDevolucion: "",
        AlquilerEstado: "Pendiente",
        AlquilerTotal: 0,
        AlquilerEntrega: 0,
        prendas: [],
      });
      setClienteSeleccionado(null);
    }
  }, [currentAlquiler]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "ClienteId" ? Number(value) : value,
    }));
  };

  const handleClienteSelect = (cliente: {
    ClienteId: number;
    ClienteNombre: string;
    ClienteApellido: string;
    ClienteRUC?: string;
    ClienteDireccion?: string;
    ClienteTelefono?: string;
    ClienteTipo?: string;
    UsuarioId?: string;
  }) => {
    setClienteSeleccionado({
      ClienteId: cliente.ClienteId,
      ClienteNombre: cliente.ClienteNombre,
      ClienteApellido: cliente.ClienteApellido,
    });
    setFormData((prev) => ({
      ...prev,
      ClienteId: cliente.ClienteId,
    }));
    setShowClienteModal(false);
  };

  const handleCreateCliente = async (clienteData: {
    ClienteId: number;
    ClienteRUC: string;
    ClienteNombre: string;
    ClienteApellido: string;
    ClienteDireccion: string;
    ClienteTelefono: string;
    ClienteTipo: string;
    UsuarioId: string;
  }) => {
    try {
      const response = await createCliente(clienteData);
      if (response.success) {
        const nuevoCliente = response.data;
        setClienteSeleccionado({
          ClienteId: nuevoCliente.ClienteId,
          ClienteNombre: nuevoCliente.ClienteNombre,
          ClienteApellido: nuevoCliente.ClienteApellido,
        });
        setFormData((prev) => ({
          ...prev,
          ClienteId: nuevoCliente.ClienteId,
        }));
        // Recargar lista de clientes
        const clientesData = await getAllClientesSinPaginacion();
        setClientes(clientesData.data || []);
        Swal.fire({
          icon: "success",
          title: "Cliente creado exitosamente",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo crear el cliente",
      });
    }
  };

  const handlePrendaChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPrendaActual((prev) => ({
      ...prev,
      [name]:
        name === "ProductoId" ||
        name === "AlquilerPrendasId" ||
        name === "AlquilerPrendasPrecio"
          ? Number(value)
          : value,
    }));
  };

  const agregarPrenda = () => {
    if (prendaActual.ProductoId && prendaActual.AlquilerPrendasPrecio > 0) {
      const nuevoId = formData.prendas
        ? Math.max(...formData.prendas.map((p) => p.AlquilerPrendasId), 0) + 1
        : 1;
      const nuevaPrenda: AlquilerPrenda = {
        ...prendaActual,
        AlquilerPrendasId: nuevoId,
      };
      setFormData((prev) => ({
        ...prev,
        prendas: [...(prev.prendas || []), nuevaPrenda],
        AlquilerTotal:
          (prev.AlquilerTotal || 0) + (prendaActual.AlquilerPrendasPrecio || 0),
      }));
      setPrendaActual({
        AlquilerId: 0,
        AlquilerPrendasId: 0,
        ProductoId: 0,
        AlquilerPrendasPrecio: 0,
      });
    }
  };

  const eliminarPrenda = (index: number) => {
    const prenda = formData.prendas?.[index];
    if (prenda) {
      setFormData((prev) => ({
        ...prev,
        prendas: prev.prendas?.filter((_, i) => i !== index) || [],
        AlquilerTotal:
          (prev.AlquilerTotal || 0) - (prenda.AlquilerPrendasPrecio || 0),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clienteSeleccionado || formData.ClienteId === 0) {
      Swal.fire({
        icon: "warning",
        title: "Cliente requerido",
        text: "Debe seleccionar un cliente para crear el alquiler",
      });
      return;
    }
    onSubmit(formData);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const columns = [
    { key: "AlquilerId", label: "ID" },
    { key: "ClienteNombre", label: "Cliente" },
    { key: "AlquilerFechaAlquiler", label: "Fecha Alquiler" },
    { key: "AlquilerFechaEntrega", label: "Fecha Entrega" },
    { key: "AlquilerEstado", label: "Estado" },
    { key: "AlquilerTotal", label: "Total" },
  ];

  const getProductoNombre = (productoId: number) => {
    const producto = productos.find((p) => p.ProductoId === productoId);
    return producto
      ? `${producto.ProductoCodigo} - ${producto.ProductoNombre}`
      : "";
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar alquileres"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Alquiler"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {alquileres.length} de {pagination?.totalItems} alquileres
        </div>
      </div>
      <DataTable
        data={
          alquileres.map((a) => ({
            ...a,
            id: a.AlquilerId,
            ClienteNombre:
              a.ClienteNombre && a.ClienteApellido
                ? `${a.ClienteNombre} ${a.ClienteApellido}`
                : "",
            AlquilerFechaAlquiler: a.AlquilerFechaAlquiler
              ? new Date(a.AlquilerFechaAlquiler).toLocaleDateString()
              : "",
            AlquilerFechaEntrega: a.AlquilerFechaEntrega
              ? new Date(a.AlquilerFechaEntrega).toLocaleDateString()
              : "",
            AlquilerTotal: formatCurrency(a.AlquilerTotal || 0),
          })) as unknown as (Alquiler & { id: number })[]
        }
        columns={columns}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron alquileres"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-4xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentAlquiler
                    ? `Editar alquiler: ${currentAlquiler.AlquilerId}`
                    : "Crear nuevo alquiler"}
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
                      htmlFor="ClienteId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Cliente *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowClienteModal(true)}
                      className={`w-full px-3 py-2.5 text-sm rounded-lg border ${
                        clienteSeleccionado
                          ? "bg-gray-50 border-gray-300 text-gray-900"
                          : "bg-gray-50 border-gray-300 text-gray-500"
                      } focus:ring-blue-500 focus:border-blue-500 text-left`}
                    >
                      {clienteSeleccionado
                        ? `${clienteSeleccionado.ClienteNombre} ${clienteSeleccionado.ClienteApellido}`
                        : "Seleccione un cliente"}
                    </button>
                    {!clienteSeleccionado && (
                      <p className="mt-1 text-xs text-red-600">
                        Debe seleccionar un cliente
                      </p>
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="AlquilerFechaAlquiler"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha Alquiler *
                    </label>
                    <input
                      type="datetime-local"
                      name="AlquilerFechaAlquiler"
                      id="AlquilerFechaAlquiler"
                      value={formData.AlquilerFechaAlquiler}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="AlquilerFechaEntrega"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha Entrega
                    </label>
                    <input
                      type="datetime-local"
                      name="AlquilerFechaEntrega"
                      id="AlquilerFechaEntrega"
                      value={formData.AlquilerFechaEntrega}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="AlquilerFechaDevolucion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha Devolución
                    </label>
                    <input
                      type="datetime-local"
                      name="AlquilerFechaDevolucion"
                      id="AlquilerFechaDevolucion"
                      value={formData.AlquilerFechaDevolucion}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="AlquilerEstado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Estado *
                    </label>
                    <select
                      name="AlquilerEstado"
                      id="AlquilerEstado"
                      value={formData.AlquilerEstado}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Entregado">Entregado</option>
                      <option value="Devuelto">Devuelto</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="AlquilerEntrega"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Entrega
                    </label>
                    <input
                      type="number"
                      name="AlquilerEntrega"
                      id="AlquilerEntrega"
                      value={formData.AlquilerEntrega}
                      onChange={handleInputChange}
                      step="0.01"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                </div>

                {/* Sección de Prendas */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">
                    Prendas del Alquiler
                  </h3>
                  <div className="grid grid-cols-6 gap-6 mb-3">
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="ProductoId"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        Producto
                      </label>
                      <select
                        name="ProductoId"
                        id="ProductoId"
                        value={prendaActual.ProductoId}
                        onChange={handlePrendaChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      >
                        <option value="">Seleccione</option>
                        {productos.map((producto) => (
                          <option
                            key={producto.ProductoId}
                            value={producto.ProductoId}
                          >
                            {producto.ProductoCodigo} -{" "}
                            {producto.ProductoNombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label
                        htmlFor="AlquilerPrendasPrecio"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        Precio
                      </label>
                      <input
                        type="number"
                        name="AlquilerPrendasPrecio"
                        id="AlquilerPrendasPrecio"
                        value={prendaActual.AlquilerPrendasPrecio}
                        onChange={handlePrendaChange}
                        step="0.01"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={agregarPrenda}
                        className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 text-sm font-medium"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Lista de prendas agregadas */}
                  {formData.prendas && formData.prendas.length > 0 && (
                    <div className="mt-4">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-2 py-1">
                              Producto
                            </th>
                            <th className="border border-gray-300 px-2 py-1">
                              Precio
                            </th>
                            <th className="border border-gray-300 px-2 py-1">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.prendas.map((prenda, index) => (
                            <tr key={index}>
                              <td className="border border-gray-300 px-2 py-1">
                                {getProductoNombre(prenda.ProductoId)}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                {formatCurrency(prenda.AlquilerPrendasPrecio)}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => eliminarPrenda(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-2 text-right font-semibold">
                        Total: {formatCurrency(formData.AlquilerTotal || 0)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentAlquiler ? "Actualizar" : "Crear"}
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

      {/* Modal de Cliente */}
      <ClienteModal
        show={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        clientes={clientes}
        onSelect={handleClienteSelect}
        onCreateCliente={handleCreateCliente}
        currentUserId={user?.id ? String(user.id).trim() : ""}
      />
    </>
  );
}
