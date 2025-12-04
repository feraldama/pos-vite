import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getNominas } from "../../services/nomina.service";
import { getCajas } from "../../services/cajas.service";
import { getUsuarios } from "../../services/usuarios.service";
import { formatMiles } from "../../utils/utils";

interface ColegioCobranza {
  id: string | number;
  ColegioCobranzaId: string | number;
  CajaId: string | number;
  ColegioCobranzaFecha: string;
  NominaId: string | number;
  ColegioCobranzaMesPagado: string;
  ColegioCobranzaMes: string;
  ColegioCobranzaDiasMora: number;
  ColegioCobranzaExamen: string;
  UsuarioId: string | number;
  ColegioCobranzaDescuento: number;
  CajaDescripcion?: string;
  NominaNombre?: string;
  NominaApellido?: string;
  UsuarioNombre?: string;
  [key: string]: unknown;
}

interface Caja {
  CajaId: number;
  CajaDescripcion: string;
}

interface Nomina {
  NominaId: number;
  NominaNombre: string;
  NominaApellido: string;
}

interface Usuario {
  UsuarioId: number;
  UsuarioNombre: string;
}

interface Pagination {
  totalItems: number;
}

interface ColegioCobranzasListProps {
  cobranzas: ColegioCobranza[];
  onDelete?: (item: ColegioCobranza) => void;
  onEdit?: (item: ColegioCobranza) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCobranza?: ColegioCobranza | null;
  onSubmit: (formData: ColegioCobranza) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function ColegioCobranzasList({
  cobranzas,
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
  currentCobranza,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: ColegioCobranzasListProps) {
  const [formData, setFormData] = useState({
    id: "",
    ColegioCobranzaId: "",
    CajaId: "",
    ColegioCobranzaFecha: "",
    NominaId: "",
    ColegioCobranzaMesPagado: "",
    ColegioCobranzaMes: "",
    ColegioCobranzaDiasMora: 0,
    ColegioCobranzaExamen: "",
    UsuarioId: "",
    ColegioCobranzaDescuento: 0,
  });

  const [cajas, setCajas] = useState<Caja[]>([]);
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cajasData, nominasData, usuariosData] = await Promise.all([
          getCajas(1, 1000),
          getNominas(1, 1000),
          getUsuarios(1, 1000),
        ]);
        setCajas(cajasData.data || []);
        setNominas(nominasData.data || []);
        setUsuarios(usuariosData.data || []);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (currentCobranza) {
      // Formatear fecha para input type="date"
      const fecha = currentCobranza.ColegioCobranzaFecha
        ? new Date(currentCobranza.ColegioCobranzaFecha)
            .toISOString()
            .split("T")[0]
        : "";
      setFormData({
        id: String(currentCobranza.id ?? currentCobranza.ColegioCobranzaId),
        ColegioCobranzaId: String(currentCobranza.ColegioCobranzaId),
        CajaId: currentCobranza.CajaId ? String(currentCobranza.CajaId) : "",
        ColegioCobranzaFecha: fecha,
        NominaId: currentCobranza.NominaId
          ? String(currentCobranza.NominaId)
          : "",
        ColegioCobranzaMesPagado:
          currentCobranza.ColegioCobranzaMesPagado || "",
        ColegioCobranzaMes: currentCobranza.ColegioCobranzaMes || "",
        ColegioCobranzaDiasMora: currentCobranza.ColegioCobranzaDiasMora || 0,
        ColegioCobranzaExamen: currentCobranza.ColegioCobranzaExamen || "",
        UsuarioId: currentCobranza.UsuarioId
          ? String(currentCobranza.UsuarioId)
          : "",
        ColegioCobranzaDescuento: currentCobranza.ColegioCobranzaDescuento || 0,
      });
    } else {
      setFormData({
        id: "",
        ColegioCobranzaId: "",
        CajaId: "",
        ColegioCobranzaFecha: "",
        NominaId: "",
        ColegioCobranzaMesPagado: "",
        ColegioCobranzaMes: "",
        ColegioCobranzaDiasMora: 0,
        ColegioCobranzaExamen: "",
        UsuarioId: "",
        ColegioCobranzaDescuento: 0,
      });
    }
  }, [currentCobranza]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "ColegioCobranzaDiasMora" ||
        name === "ColegioCobranzaDescuento"
          ? Number(value) || 0
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dataToSubmit: Partial<ColegioCobranza> = {
      id: formData.id,
      ColegioCobranzaId: formData.ColegioCobranzaId,
      CajaId: formData.CajaId,
      ColegioCobranzaFecha: formData.ColegioCobranzaFecha,
      NominaId: formData.NominaId,
      ColegioCobranzaMesPagado: formData.ColegioCobranzaMesPagado,
      ColegioCobranzaMes: formData.ColegioCobranzaMes,
      ColegioCobranzaDiasMora: formData.ColegioCobranzaDiasMora,
      ColegioCobranzaExamen: formData.ColegioCobranzaExamen,
      UsuarioId: formData.UsuarioId,
      ColegioCobranzaDescuento: formData.ColegioCobranzaDescuento,
    };
    onSubmit(dataToSubmit as ColegioCobranza);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = [
    { key: "ColegioCobranzaId", label: "ID" },
    {
      key: "CajaDescripcion",
      label: "Caja",
      render: (cobranza: ColegioCobranza) =>
        cobranza.CajaDescripcion || cobranza.CajaId,
    },
    {
      key: "ColegioCobranzaFecha",
      label: "Fecha",
      render: (cobranza: ColegioCobranza) =>
        formatDate(cobranza.ColegioCobranzaFecha),
    },
    {
      key: "NominaNombre",
      label: "Nomina",
      render: (cobranza: ColegioCobranza) =>
        cobranza.NominaNombre && cobranza.NominaApellido
          ? `${cobranza.NominaNombre} ${cobranza.NominaApellido}`
          : cobranza.NominaId,
    },
    { key: "ColegioCobranzaMesPagado", label: "Mes Pagado" },
    { key: "ColegioCobranzaMes", label: "Mes" },
    { key: "ColegioCobranzaDiasMora", label: "Días Mora" },
    {
      key: "ColegioCobranzaExamen",
      label: "Examen",
      render: (cobranza: ColegioCobranza) => {
        if (!cobranza.ColegioCobranzaExamen) return "";
        const value = Number(cobranza.ColegioCobranzaExamen);
        return isNaN(value)
          ? cobranza.ColegioCobranzaExamen
          : `Gs. ${formatMiles(value)}`;
      },
    },
    {
      key: "UsuarioNombre",
      label: "Usuario",
      render: (cobranza: ColegioCobranza) =>
        cobranza.UsuarioNombre || cobranza.UsuarioId,
    },
    {
      key: "ColegioCobranzaDescuento",
      label: "Descuento",
      render: (cobranza: ColegioCobranza) => {
        if (!cobranza.ColegioCobranzaDescuento) return "Gs. 0";
        const value = Number(cobranza.ColegioCobranzaDescuento);
        return isNaN(value)
          ? cobranza.ColegioCobranzaDescuento
          : `Gs. ${formatMiles(value)}`;
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
            placeholder="Buscar cobranzas..."
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Cobranza"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {cobranzas.length} de {pagination?.totalItems} cobranzas
        </div>
      </div>
      <DataTable<ColegioCobranza>
        columns={columns}
        data={cobranzas}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron cobranzas"
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
          <div className="relative w-full max-w-4xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentCobranza
                    ? `Editar cobranza: ${currentCobranza.ColegioCobranzaId}`
                    : "Crear nueva cobranza"}
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
                      htmlFor="CajaId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Caja
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
                      {cajas.map((c) => (
                        <option key={c.CajaId} value={c.CajaId}>
                          {c.CajaDescripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ColegioCobranzaFecha"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha
                    </label>
                    <input
                      type="date"
                      name="ColegioCobranzaFecha"
                      id="ColegioCobranzaFecha"
                      value={formData.ColegioCobranzaFecha}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="NominaId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nomina
                    </label>
                    <select
                      name="NominaId"
                      id="NominaId"
                      value={formData.NominaId}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="">Seleccione...</option>
                      {nominas.map((n) => (
                        <option key={n.NominaId} value={n.NominaId}>
                          {n.NominaNombre} {n.NominaApellido}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ColegioCobranzaMesPagado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Mes Pagado
                    </label>
                    <input
                      type="text"
                      name="ColegioCobranzaMesPagado"
                      id="ColegioCobranzaMesPagado"
                      value={formData.ColegioCobranzaMesPagado}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ColegioCobranzaMes"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Mes
                    </label>
                    <input
                      type="text"
                      name="ColegioCobranzaMes"
                      id="ColegioCobranzaMes"
                      value={formData.ColegioCobranzaMes}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ColegioCobranzaDiasMora"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Días Mora
                    </label>
                    <input
                      type="number"
                      name="ColegioCobranzaDiasMora"
                      id="ColegioCobranzaDiasMora"
                      value={formData.ColegioCobranzaDiasMora}
                      onChange={handleInputChange}
                      min="0"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ColegioCobranzaExamen"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Examen
                    </label>
                    <input
                      type="text"
                      name="ColegioCobranzaExamen"
                      id="ColegioCobranzaExamen"
                      value={formData.ColegioCobranzaExamen}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="UsuarioId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Usuario
                    </label>
                    <select
                      name="UsuarioId"
                      id="UsuarioId"
                      value={formData.UsuarioId}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="">Seleccione...</option>
                      {usuarios.map((u) => (
                        <option key={u.UsuarioId} value={u.UsuarioId}>
                          {u.UsuarioNombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ColegioCobranzaDescuento"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Descuento
                    </label>
                    <input
                      type="number"
                      name="ColegioCobranzaDescuento"
                      id="ColegioCobranzaDescuento"
                      value={formData.ColegioCobranzaDescuento}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentCobranza ? "Actualizar" : "Crear"}
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
