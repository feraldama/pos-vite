import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";
import { getPlanes } from "../../services/planes.service";
import { formatMiles } from "../../utils/utils";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/useAuth";
import ClienteModal from "../common/ClienteModal";

interface Pago {
  id: string | number;
  PagoId: string | number;
  SuscripcionId: string | number;
  PagoMonto: number;
  PagoTipo: string;
  PagoFecha: string;
  PagoUsuarioId: string | number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  [key: string]: unknown;
}

interface Cliente {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteRUC: string;
  ClienteDireccion: string;
  ClienteTelefono: string;
  ClienteTipo: string;
  UsuarioId: string;
}

interface Plan {
  PlanId: string | number;
  PlanNombre: string;
  PlanDuracion: number;
  PlanPrecio: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface PagosListProps {
  pagos: Pago[];
  onDelete?: (item: Pago) => void;
  onEdit?: (item: Pago) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentPago?: Pago | null;
  onSubmit: (formData: Pago) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function PagosList({
  pagos,
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
  currentPago,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: PagosListProps) {
  const [formData, setFormData] = useState({
    id: "",
    PagoId: "",
    SuscripcionId: "",
    ClienteId: "",
    PlanId: "",
    PagoMonto: 0,
    PagoTipo: "",
    PagoFecha: "",
    PagoUsuarioId: "",
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Cargar clientes y planes para crear nueva suscripción
    getAllClientesSinPaginacion()
      .then((data) => {
        setClientes(data.data || []);
      })
      .catch(() => setClientes([]));

    getPlanes(1, 1000)
      .then((data) => {
        setPlanes(data.data || []);
      })
      .catch(() => setPlanes([]));
  }, []);

  useEffect(() => {
    if (currentPago) {
      setFormData({
        id: String(currentPago.id ?? currentPago.PagoId),
        PagoId: String(currentPago.PagoId),
        SuscripcionId: String(currentPago.SuscripcionId),
        ClienteId: "",
        PlanId: "",
        PagoMonto: currentPago.PagoMonto || 0,
        PagoTipo: currentPago.PagoTipo || "",
        PagoFecha: currentPago.PagoFecha
          ? currentPago.PagoFecha.split("T")[0]
          : "",
        PagoUsuarioId: String(currentPago.PagoUsuarioId || user?.id || ""),
      });
    } else {
      setFormData({
        id: "",
        PagoId: "",
        SuscripcionId: "",
        ClienteId: "",
        PlanId: "",
        PagoMonto: 0,
        PagoTipo: "",
        PagoFecha: new Date().toISOString().split("T")[0],
        PagoUsuarioId: String(user?.id || ""),
      });
      setClienteSeleccionado(null);
    }
  }, [currentPago, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: name === "PagoMonto" ? Number(value) : value,
      };

      // Si cambió el plan, actualizar el monto con el PlanPrecio
      if (name === "PlanId" && value) {
        const planSeleccionado = planes.find(
          (p) => String(p.PlanId) === String(value)
        );
        if (planSeleccionado && planSeleccionado.PlanPrecio) {
          newFormData.PagoMonto = Number(planSeleccionado.PlanPrecio);
        }
      }

      return newFormData;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validar campos requeridos para nueva suscripción
    if (!formData.ClienteId) {
      Swal.fire({
        icon: "warning",
        title: "Cliente requerido",
        text: "Debe seleccionar un cliente",
      });
      return;
    }
    if (!formData.PlanId) {
      Swal.fire({
        icon: "warning",
        title: "Plan requerido",
        text: "Debe seleccionar un plan",
      });
      return;
    }

    if (!formData.PagoMonto || formData.PagoMonto <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Monto inválido",
        text: "El monto debe ser mayor a cero",
      });
      return;
    }
    if (!formData.PagoTipo) {
      Swal.fire({
        icon: "warning",
        title: "Tipo requerido",
        text: "Debe seleccionar un tipo de pago",
      });
      return;
    }

    // Asegurar que PagoUsuarioId tenga el valor del usuario logueado
    const formDataToSubmit = {
      ...formData,
      PagoUsuarioId: user?.id || formData.PagoUsuarioId,
    };

    // Siempre crear nueva suscripción, enviar ClienteId y PlanId en lugar de SuscripcionId
    const pagoData: Pago = {
      ...formDataToSubmit,
      SuscripcionId: "", // Se creará en el backend
      ClienteId: formData.ClienteId,
      PlanId: formData.PlanId,
    } as Pago;

    onSubmit(pagoData);
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setFormData((prev) => ({
      ...prev,
      ClienteId: String(cliente.ClienteId),
    }));
    setShowClienteModal(false);
  };

  const handleCreateCliente = async (clienteData: Cliente) => {
    try {
      const { createCliente } = await import("../../services/clientes.service");
      const nuevoCliente = await createCliente({
        ClienteId: clienteData.ClienteId,
        ClienteRUC: clienteData.ClienteRUC || "",
        ClienteNombre: clienteData.ClienteNombre,
        ClienteApellido: clienteData.ClienteApellido || "",
        ClienteDireccion: clienteData.ClienteDireccion || "",
        ClienteTelefono: clienteData.ClienteTelefono || "",
        ClienteTipo: "MI",
        UsuarioId: user?.id || "",
      });
      const response = await getAllClientesSinPaginacion();
      const clientesData = response.data || [];
      setClientes(clientesData);
      if (nuevoCliente.data) {
        handleSelectCliente(nuevoCliente.data);
      }
      Swal.fire({
        icon: "success",
        title: "Cliente creado exitosamente",
        text: "El cliente ha sido creado y seleccionado",
      });
    } catch (error) {
      console.error("Error al crear cliente:", error);
      Swal.fire({
        icon: "error",
        title: "Error al crear cliente",
        text: "Hubo un problema al crear el cliente",
      });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };

  const columns = [
    { key: "PagoId", label: "ID" },
    {
      key: "ClienteNombre",
      label: "Cliente",
      render: (pago: Pago) =>
        `${pago.ClienteNombre || ""} ${pago.ClienteApellido || ""}`.trim() ||
        "N/A",
    },
    { key: "SuscripcionId", label: "Suscripción ID" },
    {
      key: "PagoMonto",
      label: "Monto",
      render: (pago: Pago) => `Gs. ${formatMiles(pago.PagoMonto || 0)}`,
    },
    {
      key: "PagoTipo",
      label: "Tipo",
      render: (pago: Pago) => {
        const tipoMap: { [key: string]: string } = {
          CO: "Contado",
          CR: "Crédito",
          PO: "POS",
          TR: "Transfer",
        };
        return tipoMap[pago.PagoTipo] || pago.PagoTipo;
      },
    },
    {
      key: "PagoFecha",
      label: "Fecha",
      render: (pago: Pago) => formatDate(pago.PagoFecha),
    },
    {
      key: "PagoUsuarioId",
      label: "Usuario ID",
      render: (pago: Pago) => pago.PagoUsuarioId || "N/A",
    },
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
            placeholder="Buscar pagos"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Pago"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {pagos.length} de {pagination?.totalItems} pagos
        </div>
      </div>
      <DataTable<Pago>
        columns={columns}
        data={pagos}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron pagos"
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
                  {currentPago
                    ? `Editar pago: ${currentPago.PagoId}`
                    : "Crear nuevo pago"}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                  onClick={onCloseModal}
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Cliente *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowClienteModal(true)}
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 text-left hover:bg-gray-100 transition"
                    >
                      {clienteSeleccionado
                        ? `${clienteSeleccionado.ClienteNombre} ${
                            clienteSeleccionado.ClienteApellido || ""
                          }`
                        : "Seleccionar cliente"}
                    </button>
                    {!clienteSeleccionado && (
                      <p className="mt-1 text-xs text-red-600">
                        * Debe seleccionar un cliente
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Plan *
                    </label>
                    <select
                      name="PlanId"
                      value={formData.PlanId}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="">Seleccione un plan</option>
                      {planes.map((plan) => (
                        <option key={plan.PlanId} value={plan.PlanId}>
                          {plan.PlanNombre} -{" "}
                          {formatMiles(plan.PlanPrecio || 0)} Gs.
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">
                    Monto *
                  </label>
                  <input
                    type="text"
                    name="PagoMonto"
                    value={
                      formData.PagoMonto ? formatMiles(formData.PagoMonto) : 0
                    }
                    onChange={(e) => {
                      const raw = e.target.value
                        .replace(/\./g, "")
                        .replace(/\s/g, "");
                      const num = Number(raw);
                      if (!isNaN(num)) {
                        setFormData((prev) => ({ ...prev, PagoMonto: num }));
                      }
                    }}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">
                    Tipo *
                  </label>
                  <select
                    name="PagoTipo"
                    value={formData.PagoTipo}
                    onChange={handleInputChange}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  >
                    <option value="">Seleccione un tipo</option>
                    <option value="CO">Contado</option>
                    <option value="CR">Crédito</option>
                    <option value="PO">POS</option>
                    <option value="TR">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    name="PagoFecha"
                    value={formData.PagoFecha}
                    onChange={handleInputChange}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <button
                  type="submit"
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  {currentPago ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900"
                  onClick={onCloseModal}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ClienteModal
        show={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        clientes={clientes}
        onSelect={handleSelectCliente}
        onCreateCliente={handleCreateCliente}
        currentUserId={user?.id}
        hideTipo={true}
      />
    </>
  );
}
