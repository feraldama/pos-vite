import { useEffect, useState, useRef } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getAllSuscripcionesSinPaginacion } from "../../services/suscripciones.service";
import {
  getAllClientesSinPaginacion,
  createCliente,
} from "../../services/clientes.service";
import { getPlanes } from "../../services/planes.service";
import ClienteModal from "../common/ClienteModal";
import { formatMiles } from "../../utils/utils";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/useAuth";

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

interface Suscripcion {
  SuscripcionId: string | number;
  ClienteId: string | number;
  PlanId: string | number;
  SuscripcionFechaInicio: string;
  SuscripcionFechaFin: string;
  ClienteNombre?: string;
  ClienteApellido?: string;
  PlanNombre?: string;
  PlanPrecio?: number;
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
  PlanPrecio?: number;
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
    PagoMonto: 0,
    PagoTipo: "",
    PagoFecha: "",
    PagoUsuarioId: "",
  });
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [suscripcionSeleccionada, setSuscripcionSeleccionada] =
    useState<Suscripcion | null>(null);
  const [tipoPago, setTipoPago] = useState<"nueva" | "existente">("nueva");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [suscripcionFormData, setSuscripcionFormData] = useState({
    ClienteId: "",
    PlanId: "",
    SuscripcionFechaInicio: "",
    SuscripcionFechaFin: "",
  });
  const clienteSeleccionadoRef = useRef<Cliente | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Cargar todas las suscripciones y filtrar solo las pendientes
    getAllSuscripcionesSinPaginacion()
      .then((data) => {
        const todasSuscripciones = data.data || [];
        // Filtrar solo las suscripciones pendientes (sin pagos)
        const suscripcionesPendientes = todasSuscripciones.filter(
          (s: Suscripcion) => s.EstadoPago !== "PAGADA"
        );
        setSuscripciones(suscripcionesPendientes);
      })
      .catch(() => setSuscripciones([]));

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
    if (currentPago) {
      // Al editar, necesitamos cargar la suscripción aunque esté pagada
      getAllSuscripcionesSinPaginacion()
        .then((data) => {
          const todasSuscripciones = data.data || [];
          const suscripcion = todasSuscripciones.find(
            (s: Suscripcion) =>
              String(s.SuscripcionId) === String(currentPago.SuscripcionId)
          );
          setSuscripcionSeleccionada(suscripcion || null);
        })
        .catch(() => setSuscripcionSeleccionada(null));

      setFormData({
        id: String(currentPago.id ?? currentPago.PagoId),
        PagoId: String(currentPago.PagoId),
        SuscripcionId: String(currentPago.SuscripcionId),
        PagoMonto: currentPago.PagoMonto || 0,
        PagoTipo: currentPago.PagoTipo || "",
        PagoFecha: currentPago.PagoFecha
          ? currentPago.PagoFecha.split("T")[0]
          : "",
        PagoUsuarioId: String(currentPago.PagoUsuarioId || user?.id || ""),
      });
      setTipoPago("existente");
    } else {
      setFormData({
        id: "",
        PagoId: "",
        SuscripcionId: "",
        PagoMonto: 0,
        PagoTipo: "",
        PagoFecha: new Date().toISOString().split("T")[0],
        PagoUsuarioId: String(user?.id || ""),
      });
      setSuscripcionSeleccionada(null);
      setTipoPago("nueva");
      setClienteSeleccionado(null);
      setSuscripcionFormData({
        ClienteId: "",
        PlanId: "",
        SuscripcionFechaInicio: new Date().toISOString().split("T")[0],
        SuscripcionFechaFin: "",
      });
    }
  }, [currentPago, user]);

  const calculateFechaFin = (fechaInicio: string, planId: string | number) => {
    if (!fechaInicio || !planId) return "";

    const plan = planes.find((p) => Number(p.PlanId) === Number(planId));
    if (!plan || !plan.PlanDuracion) return "";

    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + plan.PlanDuracion);

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "PagoMonto" ? Number(value) : value,
    }));

    // Si cambió la suscripción, actualizar el monto con el PlanPrecio
    if (name === "SuscripcionId" && value) {
      const suscripcion = suscripciones.find(
        (s) => String(s.SuscripcionId) === String(value)
      );
      if (suscripcion) {
        setSuscripcionSeleccionada(suscripcion);
        if (suscripcion.PlanPrecio) {
          setFormData((prev) => ({
            ...prev,
            SuscripcionId: value,
            PagoMonto: Number(suscripcion.PlanPrecio),
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            SuscripcionId: value,
          }));
        }
      }
    }
  };

  const handleSuscripcionInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setSuscripcionFormData((prev) => {
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
        // Actualizar el monto del pago con el precio del plan
        const plan = planes.find((p) => Number(p.PlanId) === Number(value));
        if (plan && plan.PlanPrecio) {
          setFormData((prev) => ({
            ...prev,
            PagoMonto: Number(plan.PlanPrecio),
          }));
        }
      }

      return newData;
    });
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    clienteSeleccionadoRef.current = cliente;
    setSuscripcionFormData((prev) => ({
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
        ClienteTipo: "MI",
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

      const clienteCompleto =
        clientesOrdenados.find(
          (c) => Number(c.ClienteId) === Number(nuevoCliente.data.ClienteId)
        ) || nuevoCliente.data;

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

    // Si se está creando una nueva suscripción, validar campos de suscripción
    if (tipoPago === "nueva") {
      if (!suscripcionFormData.ClienteId || !clienteSeleccionado) {
        Swal.fire({
          icon: "warning",
          title: "Cliente requerido",
          text: "Debe seleccionar un cliente",
        });
        return;
      }

      if (!suscripcionFormData.PlanId) {
        Swal.fire({
          icon: "warning",
          title: "Plan requerido",
          text: "Debe seleccionar un plan",
        });
        return;
      }

      if (!suscripcionFormData.SuscripcionFechaInicio) {
        Swal.fire({
          icon: "warning",
          title: "Fecha de inicio requerida",
          text: "Debe seleccionar una fecha de inicio",
        });
        return;
      }

      if (!suscripcionFormData.SuscripcionFechaFin) {
        Swal.fire({
          icon: "warning",
          title: "Fecha de fin requerida",
          text: "Debe seleccionar una fecha de fin",
        });
        return;
      }
    } else {
      // Validar campos requeridos cuando se selecciona una suscripción existente
      if (!formData.SuscripcionId) {
        Swal.fire({
          icon: "warning",
          title: "Suscripción requerida",
          text: "Debe seleccionar una suscripción",
        });
        return;
      }
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
    let formDataToSubmit: Pago & {
      ClienteId?: string;
      PlanId?: string;
      SuscripcionFechaInicio?: string;
      SuscripcionFechaFin?: string;
      SuscripcionId?: string | number;
    };

    // Si se está creando una nueva suscripción, enviar ClienteId y PlanId
    // El backend creará la suscripción automáticamente
    if (tipoPago === "nueva") {
      formDataToSubmit = {
        id: formData.id,
        PagoId: formData.PagoId,
        PagoMonto: formData.PagoMonto,
        PagoTipo: formData.PagoTipo,
        PagoFecha: formData.PagoFecha,
        PagoUsuarioId: user?.id || formData.PagoUsuarioId,
        ClienteId: suscripcionFormData.ClienteId,
        PlanId: suscripcionFormData.PlanId,
        SuscripcionFechaInicio: suscripcionFormData.SuscripcionFechaInicio,
        SuscripcionFechaFin: suscripcionFormData.SuscripcionFechaFin,
      } as Pago & {
        ClienteId?: string;
        PlanId?: string;
        SuscripcionFechaInicio?: string;
        SuscripcionFechaFin?: string;
      };
    } else {
      formDataToSubmit = {
        ...formData,
        PagoUsuarioId: user?.id || formData.PagoUsuarioId,
      } as Pago;
    }

    const pagoData: Pago = formDataToSubmit as Pago;

    onSubmit(pagoData);
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
                {!currentPago && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block mb-3 text-sm font-medium text-gray-900">
                      Tipo de pago
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="nuevaSuscripcion"
                          name="tipoPago"
                          value="nueva"
                          checked={tipoPago === "nueva"}
                          onChange={(e) => {
                            setTipoPago(
                              e.target.value as "nueva" | "existente"
                            );
                            if (e.target.value === "nueva") {
                              // Limpiar suscripción seleccionada cuando se activa crear nueva
                              setFormData((prev) => ({
                                ...prev,
                                SuscripcionId: "",
                              }));
                              setSuscripcionSeleccionada(null);
                            } else {
                              // Limpiar datos de suscripción cuando se cambia a existente
                              setClienteSeleccionado(null);
                              setSuscripcionFormData({
                                ClienteId: "",
                                PlanId: "",
                                SuscripcionFechaInicio: new Date()
                                  .toISOString()
                                  .split("T")[0],
                                SuscripcionFechaFin: "",
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="nuevaSuscripcion"
                          className="ml-2 text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          Crear nueva suscripción
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="suscripcionExistente"
                          name="tipoPago"
                          value="existente"
                          checked={tipoPago === "existente"}
                          onChange={(e) => {
                            setTipoPago(
                              e.target.value as "nueva" | "existente"
                            );
                            if (e.target.value === "nueva") {
                              // Limpiar suscripción seleccionada cuando se activa crear nueva
                              setFormData((prev) => ({
                                ...prev,
                                SuscripcionId: "",
                              }));
                              setSuscripcionSeleccionada(null);
                            } else {
                              // Limpiar datos de suscripción cuando se cambia a existente
                              setClienteSeleccionado(null);
                              setSuscripcionFormData({
                                ClienteId: "",
                                PlanId: "",
                                SuscripcionFechaInicio: new Date()
                                  .toISOString()
                                  .split("T")[0],
                                SuscripcionFechaFin: "",
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="suscripcionExistente"
                          className="ml-2 text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          Realizar el pago de una suscripción existente
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {tipoPago === "nueva" && !currentPago ? (
                  <>
                    <div>
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
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">
                        Plan *
                      </label>
                      <select
                        name="PlanId"
                        value={suscripcionFormData.PlanId}
                        onChange={handleSuscripcionInputChange}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900">
                          Fecha Inicio *
                        </label>
                        <input
                          type="date"
                          name="SuscripcionFechaInicio"
                          value={suscripcionFormData.SuscripcionFechaInicio}
                          onChange={handleSuscripcionInputChange}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900">
                          Fecha Fin *
                        </label>
                        <input
                          type="date"
                          name="SuscripcionFechaFin"
                          value={suscripcionFormData.SuscripcionFechaFin}
                          onChange={handleSuscripcionInputChange}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">
                        Suscripción *
                      </label>
                      <select
                        name="SuscripcionId"
                        value={formData.SuscripcionId}
                        onChange={handleInputChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        required={tipoPago === "existente"}
                        disabled={!!currentPago}
                      >
                        <option value="">
                          {currentPago
                            ? "Suscripción del pago (no editable)"
                            : "Seleccione una suscripción"}
                        </option>
                        {suscripciones.map((suscripcion) => (
                          <option
                            key={suscripcion.SuscripcionId}
                            value={suscripcion.SuscripcionId}
                          >
                            ID: {suscripcion.SuscripcionId} -{" "}
                            {suscripcion.ClienteNombre || ""}{" "}
                            {suscripcion.ClienteApellido || ""} - Plan:{" "}
                            {suscripcion.PlanNombre || "N/A"}
                          </option>
                        ))}
                      </select>
                      {!formData.SuscripcionId && tipoPago === "existente" && (
                        <p className="mt-1 text-xs text-red-600">
                          * Debe seleccionar una suscripción
                        </p>
                      )}
                    </div>
                    {suscripcionSeleccionada && (
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900">
                          Plan
                        </label>
                        <input
                          type="text"
                          value={suscripcionSeleccionada.PlanNombre || "N/A"}
                          readOnly
                          disabled
                          className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed"
                        />
                      </div>
                    )}
                  </>
                )}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">
                    Monto * (Editable)
                  </label>
                  <input
                    type="text"
                    name="PagoMonto"
                    value={
                      formData.PagoMonto ? formatMiles(formData.PagoMonto) : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value
                        .replace(/\./g, "")
                        .replace(/\s/g, "");
                      const num = Number(raw);
                      if (!isNaN(num)) {
                        setFormData((prev) => ({ ...prev, PagoMonto: num }));
                      } else if (raw === "") {
                        setFormData((prev) => ({ ...prev, PagoMonto: 0 }));
                      }
                    }}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    required
                    placeholder={
                      suscripcionSeleccionada?.PlanPrecio
                        ? formatMiles(suscripcionSeleccionada.PlanPrecio)
                        : "0"
                    }
                  />
                  {suscripcionSeleccionada?.PlanPrecio && (
                    <p className="mt-1 text-xs text-gray-500">
                      Monto sugerido del plan:{" "}
                      {formatMiles(suscripcionSeleccionada.PlanPrecio)} Gs.
                    </p>
                  )}
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
