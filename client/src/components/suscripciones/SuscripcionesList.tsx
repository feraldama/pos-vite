import { useEffect, useState, useRef } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  getAllClientesSinPaginacion,
  createCliente,
} from "../../services/clientes.service";
import { getPlanes } from "../../services/planes.service";
import ClienteModal from "../common/ClienteModal";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/useAuth";

interface Suscripcion {
  id: string | number;
  SuscripcionId: string | number;
  ClienteId: string | number;
  PlanId: string | number;
  SuscripcionFechaInicio: string;
  SuscripcionFechaFin: string;
  ClienteNombre?: string;
  ClienteApellido?: string;
  PlanNombre?: string;
  EstadoPago?: string;
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
  ClienteFechaNacimiento?: string;
  UsuarioId: string;
}

interface Plan {
  PlanId: string | number;
  PlanNombre: string;
  PlanDuracion: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface SuscripcionesListProps {
  suscripciones: Suscripcion[];
  onDelete?: (item: Suscripcion) => void;
  onEdit?: (item: Suscripcion) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentSuscripcion?: Suscripcion | null;
  onSubmit: (formData: Suscripcion) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function SuscripcionesList({
  suscripciones,
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
  currentSuscripcion,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: SuscripcionesListProps) {
  const [formData, setFormData] = useState({
    id: "",
    SuscripcionId: "",
    ClienteId: "",
    PlanId: "",
    SuscripcionFechaInicio: "",
    SuscripcionFechaFin: "",
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const { user } = useAuth();
  const clienteSeleccionadoRef = useRef<Cliente | null>(null);

  useEffect(() => {
    // Cargar clientes y planes
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
    if (currentSuscripcion) {
      const cliente = clientes.find(
        (c) => Number(c.ClienteId) === Number(currentSuscripcion.ClienteId)
      );
      setClienteSeleccionado(cliente || null);
      clienteSeleccionadoRef.current = cliente || null;

      const fechaInicio = currentSuscripcion.SuscripcionFechaInicio
        ? currentSuscripcion.SuscripcionFechaInicio.split("T")[0]
        : "";
      const fechaFin = currentSuscripcion.SuscripcionFechaFin
        ? currentSuscripcion.SuscripcionFechaFin.split("T")[0]
        : "";

      setFormData({
        id: String(currentSuscripcion.id ?? currentSuscripcion.SuscripcionId),
        SuscripcionId: String(currentSuscripcion.SuscripcionId),
        ClienteId: String(currentSuscripcion.ClienteId),
        PlanId: String(currentSuscripcion.PlanId),
        SuscripcionFechaInicio: fechaInicio,
        SuscripcionFechaFin: fechaFin,
      });
    } else if (currentSuscripcion === null && !clienteSeleccionadoRef.current) {
      // Solo resetear cuando currentSuscripcion cambia a null Y no hay cliente seleccionado
      // Esto evita que se resetee cuando se crea un nuevo cliente
      setClienteSeleccionado(null);
      setFormData({
        id: "",
        SuscripcionId: "",
        ClienteId: "",
        PlanId: "",
        SuscripcionFechaInicio: "",
        SuscripcionFechaFin: "",
      });
    }
  }, [currentSuscripcion, clientes]);

  // Actualizar cliente seleccionado cuando se actualiza la lista de clientes
  // Esto asegura que el cliente seleccionado tenga los datos más recientes
  useEffect(() => {
    if (
      clienteSeleccionadoRef.current &&
      clientes.length > 0 &&
      !currentSuscripcion
    ) {
      const clienteActualizado = clientes.find(
        (c) =>
          Number(c.ClienteId) ===
          Number(clienteSeleccionadoRef.current?.ClienteId)
      );
      if (clienteActualizado) {
        // Solo actualizar si el cliente existe en la nueva lista
        setClienteSeleccionado(clienteActualizado);
        clienteSeleccionadoRef.current = clienteActualizado;
      }
    }
  }, [clientes, currentSuscripcion]);

  const calculateFechaFin = (fechaInicio: string, planId: string | number) => {
    if (!fechaInicio || !planId) return "";

    const plan = planes.find((p) => Number(p.PlanId) === Number(planId));
    if (!plan || !plan.PlanDuracion) return "";

    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + plan.PlanDuracion);

    // Formatear a YYYY-MM-DD para el input type="date"
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value,
      };

      // Si cambió la fecha de inicio y hay un plan seleccionado, calcular fecha fin
      if (name === "SuscripcionFechaInicio" && prev.PlanId) {
        const fechaFin = calculateFechaFin(value, prev.PlanId);
        if (fechaFin) {
          newData.SuscripcionFechaFin = fechaFin;
        }
      }

      // Si cambió el plan y hay una fecha de inicio, recalcular fecha fin
      if (name === "PlanId" && prev.SuscripcionFechaInicio && value) {
        const fechaFin = calculateFechaFin(prev.SuscripcionFechaInicio, value);
        if (fechaFin) {
          newData.SuscripcionFechaFin = fechaFin;
        }
      }

      return newData;
    });
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    clienteSeleccionadoRef.current = cliente;
    setFormData((prev) => ({
      ...prev,
      ClienteId: String(cliente.ClienteId),
    }));
    setShowClienteModal(false);
  };

  const handleCreateCliente = async (clienteData: Cliente) => {
    try {
      const nuevoCliente = await createCliente({
        ClienteId: clienteData.ClienteId,
        ClienteRUC: clienteData.ClienteRUC || "",
        ClienteNombre: clienteData.ClienteNombre,
        ClienteApellido: clienteData.ClienteApellido || "",
        ClienteDireccion: clienteData.ClienteDireccion || "",
        ClienteTelefono: clienteData.ClienteTelefono || "",
        ClienteTipo: "MI", // Siempre Minorista por defecto
        ClienteFechaNacimiento: clienteData.ClienteFechaNacimiento || null,
        UsuarioId: user?.id || "",
      });
      // Recargar la lista de clientes
      const response = await getAllClientesSinPaginacion();
      const clientesData = response.data || [];
      const clientesOrdenados = [...clientesData].sort((a, b) => {
        const nombreA = `${a.ClienteNombre || ""} ${a.ClienteApellido || ""}`
          .trim()
          .toUpperCase();
        const nombreB = `${b.ClienteNombre || ""} ${b.ClienteApellido || ""}`
          .trim()
          .toUpperCase();
        return nombreA.localeCompare(nombreB);
      });
      setClientes(clientesOrdenados);

      // Buscar el cliente completo en la lista actualizada
      const clienteCompleto =
        clientesOrdenados.find(
          (c) => Number(c.ClienteId) === Number(nuevoCliente.data.ClienteId)
        ) || nuevoCliente.data;

      // Seleccionar el nuevo cliente creado (esto cierra el ClienteModal automáticamente)
      handleSelectCliente(clienteCompleto);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clienteSeleccionado || !formData.ClienteId) {
      Swal.fire({
        icon: "warning",
        title: "Cliente requerido",
        text: "Debe seleccionar un cliente",
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };

  // Función para calcular el estado basándose en las fechas
  const calcularEstadoPorFechas = (
    fechaInicio: string,
    fechaFin: string
  ): string => {
    if (!fechaInicio || !fechaFin) return "CANCELADA";

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fechaFin);
    fin.setHours(0, 0, 0, 0);

    if (hoy < inicio) {
      return "FUTURA"; // Opcional: suscripciones que aún no han comenzado
    } else if (hoy > fin) {
      return "VENCIDA";
    } else {
      return "ACTIVA";
    }
  };

  const columns = [
    { key: "SuscripcionId", label: "ID" },
    {
      key: "ClienteNombre",
      label: "Cliente",
      render: (suscripcion: Suscripcion) =>
        `${suscripcion.ClienteNombre || ""} ${
          suscripcion.ClienteApellido || ""
        }`.trim() || "N/A",
    },
    {
      key: "PlanNombre",
      label: "Plan",
      render: (suscripcion: Suscripcion) => suscripcion.PlanNombre || "N/A",
    },
    {
      key: "SuscripcionFechaInicio",
      label: "Fecha Inicio",
      render: (suscripcion: Suscripcion) =>
        formatDate(suscripcion.SuscripcionFechaInicio),
    },
    {
      key: "SuscripcionFechaFin",
      label: "Fecha Fin",
      render: (suscripcion: Suscripcion) =>
        formatDate(suscripcion.SuscripcionFechaFin),
    },
    {
      key: "SuscripcionEstado",
      label: "Estado",
      render: (suscripcion: Suscripcion) => {
        // Calcular el estado basándose en las fechas
        return calcularEstadoPorFechas(
          suscripcion.SuscripcionFechaInicio || "",
          suscripcion.SuscripcionFechaFin || ""
        );
      },
    },
    {
      key: "EstadoPago",
      label: "Estado Pago",
      render: (suscripcion: Suscripcion) => {
        const estadoPago = suscripcion.EstadoPago || "PENDIENTE";
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              estadoPago === "PAGADA"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {estadoPago}
          </span>
        );
      },
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
            placeholder="Buscar suscripciones"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Suscripción"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {suscripciones.length} de {pagination?.totalItems}{" "}
          suscripciones
        </div>
      </div>
      <DataTable<Suscripcion>
        columns={columns}
        data={suscripciones}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron suscripciones"
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
                  {currentSuscripcion
                    ? `Editar suscripción: ${currentSuscripcion.SuscripcionId}`
                    : "Crear nueva suscripción"}
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
                      Cliente
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
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="PlanId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Plan
                    </label>
                    <select
                      name="PlanId"
                      id="PlanId"
                      value={formData.PlanId}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="">Seleccionar plan</option>
                      {planes.map((plan) => (
                        <option key={plan.PlanId} value={plan.PlanId}>
                          {plan.PlanNombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="SuscripcionFechaInicio"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      name="SuscripcionFechaInicio"
                      id="SuscripcionFechaInicio"
                      value={formData.SuscripcionFechaInicio}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="SuscripcionFechaFin"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      name="SuscripcionFechaFin"
                      id="SuscripcionFechaFin"
                      value={formData.SuscripcionFechaFin}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="SuscripcionEstado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Estado
                    </label>
                    <input
                      type="text"
                      name="SuscripcionEstado"
                      id="SuscripcionEstado"
                      value={
                        formData.SuscripcionFechaInicio &&
                        formData.SuscripcionFechaFin
                          ? calcularEstadoPorFechas(
                              formData.SuscripcionFechaInicio,
                              formData.SuscripcionFechaFin
                            )
                          : "ACTIVA"
                      }
                      readOnly
                      disabled
                      className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed"
                      title="El estado se calcula automáticamente según las fechas"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      * El estado se calcula automáticamente según las fechas
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentSuscripcion ? "Actualizar" : "Crear"}
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
