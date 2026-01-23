import { useState, useEffect } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getCajas } from "../../services/cajas.service";
import { formatMiles } from "../../utils/utils";

export interface PagoAdmin {
  id: string | number;
  PagoAdminId: string | number;
  PagoAdminFecha: string;
  PagoAdminDetalle: string;
  PagoAdminMonto: number;
  UsuarioId: string | number;
  CajaId: string | number;
  CajaOrigenId: string | number;
  CajaDescripcion?: string;
  CajaOrigenDescripcion?: string;
  [key: string]: unknown;
}

interface Caja {
  CajaId: number;
  CajaDescripcion: string;
  CajaMonto?: number;
}

interface Pagination {
  totalItems: number;
}

interface PagoAdminListProps {
  pagosAdmin: PagoAdmin[];
  onDelete?: (item: PagoAdmin) => void | Promise<void>;
  onEdit?: (item: PagoAdmin) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  isModalOpen?: boolean;
  onCloseModal: () => void;
  currentPagoAdmin?: PagoAdmin | null;
  onSubmit: (formData: PagoAdmin) => void | Promise<void>;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  disableEdit?: boolean;
}

export default function PagoAdminList({
  pagosAdmin = [],
  onDelete,
  onEdit,
  onCreate,
  pagination,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  sortKey,
  sortOrder,
  onSort,
  isModalOpen,
  onCloseModal,
  currentPagoAdmin,
  onSubmit,
  disableEdit,
}: PagoAdminListProps) {
  const [formData, setFormData] = useState<PagoAdmin>({
    PagoAdminId: "",
    PagoAdminFecha: "",
    PagoAdminDetalle: "",
    PagoAdminMonto: 0,
    UsuarioId: "",
    CajaId: "",
    CajaOrigenId: "",
    id: "",
  });

  const [cajas, setCajas] = useState<Caja[]>([]);

  useEffect(() => {
    const fetchCajas = async () => {
      try {
        const response = await getCajas(1, 1000);
        setCajas(response.data || []);
      } catch (error) {
        console.error("Error al obtener cajas:", error);
      }
    };
    fetchCajas();
  }, []);

  // Recargar cajas cuando se abre el modal en modo creación (para actualizar montos)
  useEffect(() => {
    if (isModalOpen && !currentPagoAdmin) {
      const fetchCajas = async () => {
        try {
          const response = await getCajas(1, 1000);
          setCajas(response.data || []);
        } catch (error) {
          console.error("Error al obtener cajas:", error);
        }
      };
      fetchCajas();
    }
  }, [isModalOpen, currentPagoAdmin]);

  useEffect(() => {
    if (currentPagoAdmin) {
      // Formatear fecha para input datetime-local
      const fecha = currentPagoAdmin.PagoAdminFecha
        ? new Date(currentPagoAdmin.PagoAdminFecha)
            .toISOString()
            .slice(0, 16)
        : "";
      setFormData({
        ...currentPagoAdmin,
        PagoAdminFecha: fecha,
      });
    } else {
      // Resetear formulario
      const fechaActual = new Date().toISOString().slice(0, 16);
      setFormData({
        PagoAdminId: "",
        PagoAdminFecha: fechaActual,
        PagoAdminDetalle: "",
        PagoAdminMonto: 0,
        UsuarioId: "",
        CajaId: "",
        CajaOrigenId: "",
        id: "",
      });
    }
  }, [currentPagoAdmin, isModalOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "PagoAdminMonto" || name === "CajaId" || name === "CajaOrigenId"
          ? value === "" ? "" : Number(value)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Convertir fecha a formato ISO para el backend
    const fechaISO = formData.PagoAdminFecha
      ? new Date(formData.PagoAdminFecha).toISOString()
      : new Date().toISOString();
    
    onSubmit({
      ...formData,
      PagoAdminFecha: fechaISO,
      CajaId: Number(formData.CajaId),
      CajaOrigenId: Number(formData.CajaOrigenId),
      PagoAdminMonto: Number(formData.PagoAdminMonto),
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Formatear monto ya está importado de utils

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: "PagoAdminId",
      label: "ID",
    },
    {
      key: "CajaOrigenDescripcion",
      label: "Caja Origen",
    },
    {
      key: "MontoCajaOrigen",
      label: "Monto Caja Origen",
      render: (item: PagoAdmin) => {
        const cajaOrigen = cajas.find(
          (c) => c.CajaId === Number(item.CajaOrigenId)
        );
        const monto = cajaOrigen?.CajaMonto ?? 0;
        return `Gs. ${formatMiles(monto)}`;
      },
    },
    {
      key: "CajaDescripcion",
      label: "Caja Destino",
    },
    {
      key: "MontoCajaDestino",
      label: "Monto Caja Destino",
      render: (item: PagoAdmin) => {
        const cajaDestino = cajas.find(
          (c) => c.CajaId === Number(item.CajaId)
        );
        const monto = cajaDestino?.CajaMonto ?? 0;
        return `Gs. ${formatMiles(monto)}`;
      },
    },
    {
      key: "PagoAdminFecha",
      label: "Fecha",
      render: (row: PagoAdmin) => formatDate(row.PagoAdminFecha),
    },
    {
      key: "PagoAdminDetalle",
      label: "Detalle",
    },
    {
      key: "PagoAdminMonto",
      label: "Monto",
      render: (item: PagoAdmin) => `Gs. ${formatMiles(item.PagoAdminMonto || 0)}`,
    },
    {
      key: "UsuarioId",
      label: "Usuario",
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
            placeholder="Buscar pagos admin..."
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Pago Admin"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {pagosAdmin.length} de {pagination?.totalItems} registros
        </div>
      </div>

      <DataTable<PagoAdmin>
        columns={columns}
        data={pagosAdmin}
        onEdit={disableEdit ? undefined : onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron pagos admin"
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
                  {currentPagoAdmin
                    ? `Editar pago: ${currentPagoAdmin.PagoAdminId}`
                    : "Crear nuevo pago"}
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
                      htmlFor="CajaOrigenId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Caja Origen
                    </label>
                    <select
                      name="CajaOrigenId"
                      id="CajaOrigenId"
                      value={formData.CajaOrigenId}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="">Seleccione...</option>
                      {cajas
                        .sort((a, b) =>
                          a.CajaDescripcion.localeCompare(b.CajaDescripcion)
                        )
                        .map((c) => (
                          <option key={c.CajaId} value={c.CajaId}>
                            {c.CajaDescripcion}
                          </option>
                        ))}
                    </select>
                    {formData.CajaOrigenId && (
                      <p className="mt-1 text-sm text-gray-600">
                        Monto actual:{" "}
                        <span className="font-semibold">
                          Gs.{" "}
                          {formatMiles(
                            Number(
                              cajas.find(
                                (c) => c.CajaId === Number(formData.CajaOrigenId)
                              )?.CajaMonto || 0
                            )
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="CajaId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Caja Destino
                    </label>
                    <select
                      name="CajaId"
                      id="CajaId"
                      value={formData.CajaId}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="">Seleccione...</option>
                      {cajas
                        .sort((a, b) =>
                          a.CajaDescripcion.localeCompare(b.CajaDescripcion)
                        )
                        .map((c) => (
                          <option key={c.CajaId} value={c.CajaId}>
                            {c.CajaDescripcion}
                          </option>
                        ))}
                    </select>
                    {formData.CajaId && (
                      <p className="mt-1 text-sm text-gray-600">
                        Monto actual:{" "}
                        <span className="font-semibold">
                          Gs.{" "}
                          {formatMiles(
                            Number(
                              cajas.find(
                                (c) => c.CajaId === Number(formData.CajaId)
                              )?.CajaMonto || 0
                            )
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="PagoAdminFecha"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha
                    </label>
                    <input
                      type="datetime-local"
                      name="PagoAdminFecha"
                      id="PagoAdminFecha"
                      value={formData.PagoAdminFecha}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="PagoAdminMonto"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Monto
                    </label>
                    <input
                      type="text"
                      name="PagoAdminMonto"
                      id="PagoAdminMonto"
                      value={
                        formData.PagoAdminMonto !== undefined &&
                        formData.PagoAdminMonto !== null
                          ? formatMiles(formData.PagoAdminMonto)
                          : "0"
                      }
                      onChange={(e) => {
                        let raw = e.target.value
                          .replace(/\s/g, "")
                          .replace(/\./g, ""); // Eliminar puntos de miles
                        // Manejar signo negativo
                        const isNegative = raw.startsWith("-");
                        if (isNegative) {
                          raw = raw.substring(1);
                        }
                        // Reemplazar coma por punto para parseFloat (el backend usa punto como decimal)
                        raw = raw.replace(/,/g, ".");
                        const num = parseFloat(raw);
                        if (!isNaN(num)) {
                          setFormData((prev) => ({
                            ...prev,
                            PagoAdminMonto: isNegative ? -num : num,
                          }));
                        } else if (raw === "" || raw === "-") {
                          setFormData((prev) => ({ ...prev, PagoAdminMonto: 0 }));
                        }
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6">
                    <label
                      htmlFor="PagoAdminDetalle"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Detalle
                    </label>
                    <textarea
                      name="PagoAdminDetalle"
                      id="PagoAdminDetalle"
                      value={formData.PagoAdminDetalle}
                      onChange={handleInputChange}
                      rows={3}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentPagoAdmin ? "Actualizar" : "Crear"}
                  type="submit"
                />
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
