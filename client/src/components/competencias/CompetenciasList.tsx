import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Competencia {
  id: string | number;
  CompetenciaId: string | number;
  CompetenciaNombre: string;
  CompetenciaFechaInicio: string;
  CompetenciaFechaFin: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface CompetenciasListProps {
  competencias: Competencia[];
  onDelete?: (item: Competencia) => void;
  onEdit?: (item: Competencia) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCompetencia?: Competencia | null;
  onSubmit: (formData: Competencia) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function CompetenciasList({
  competencias,
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
  currentCompetencia,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: CompetenciasListProps) {
  const [formData, setFormData] = useState({
    id: "",
    CompetenciaId: "",
    CompetenciaNombre: "",
    CompetenciaFechaInicio: "",
    CompetenciaFechaFin: "",
  });

  useEffect(() => {
    if (currentCompetencia) {
      // Formatear las fechas para que sean compatibles con input type="date"
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        // Verificar si la fecha es válida
        if (isNaN(date.getTime())) return "";
        // Retornar en formato YYYY-MM-DD
        return date.toISOString().split("T")[0];
      };

      setFormData({
        id: String(currentCompetencia.id ?? currentCompetencia.CompetenciaId),
        CompetenciaId: String(currentCompetencia.CompetenciaId),
        CompetenciaNombre: currentCompetencia.CompetenciaNombre,
        CompetenciaFechaInicio: formatDateForInput(
          currentCompetencia.CompetenciaFechaInicio
        ),
        CompetenciaFechaFin: formatDateForInput(
          currentCompetencia.CompetenciaFechaFin
        ),
      });
    } else {
      setFormData({
        id: "",
        CompetenciaId: "",
        CompetenciaNombre: "",
        CompetenciaFechaInicio: "",
        CompetenciaFechaFin: "",
      });
    }
  }, [currentCompetencia]);

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

    // Validar que las fechas sean válidas
    if (!formData.CompetenciaFechaInicio || !formData.CompetenciaFechaFin) {
      alert("Por favor complete ambas fechas");
      return;
    }

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    const fechaInicio = new Date(formData.CompetenciaFechaInicio);
    const fechaFin = new Date(formData.CompetenciaFechaFin);

    if (fechaFin <= fechaInicio) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    onSubmit(formData as Competencia);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const columns = [
    { key: "CompetenciaId", label: "ID" },
    { key: "CompetenciaNombre", label: "Nombre" },
    {
      key: "CompetenciaFechaInicio",
      label: "Fecha Inicio",
      render: (item: Competencia) => formatDate(item.CompetenciaFechaInicio),
    },
    {
      key: "CompetenciaFechaFin",
      label: "Fecha Fin",
      render: (item: Competencia) => formatDate(item.CompetenciaFechaFin),
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
            placeholder="Buscar competencias"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Competencia"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {competencias.length} de {pagination?.totalItems}{" "}
          competencias
        </div>
      </div>
      <DataTable<Competencia>
        columns={columns}
        data={competencias}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron competencias"
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
                  {currentCompetencia
                    ? `Editar competencia: ${currentCompetencia.CompetenciaId}`
                    : "Crear nueva competencia"}
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
                  <div className="col-span-6 sm:col-span-6">
                    <label
                      htmlFor="CompetenciaNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="CompetenciaNombre"
                      id="CompetenciaNombre"
                      value={formData.CompetenciaNombre}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "CompetenciaNombre",
                            value: value,
                          },
                        } as React.ChangeEvent<HTMLInputElement>);
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="CompetenciaFechaInicio"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      name="CompetenciaFechaInicio"
                      id="CompetenciaFechaInicio"
                      value={formData.CompetenciaFechaInicio}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="CompetenciaFechaFin"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      name="CompetenciaFechaFin"
                      id="CompetenciaFechaFin"
                      value={formData.CompetenciaFechaFin}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentCompetencia ? "Actualizar" : "Crear"}
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
