import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

interface TipoGasto {
  id: string | number;
  TipoGastoId: string | number;
  TipoGastoDescripcion: string;
  TipoGastoCantGastos: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface TiposGastoListProps {
  tiposGasto: TipoGasto[];
  onDelete?: (item: TipoGasto) => void;
  onEdit?: (item: TipoGasto) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentTipoGasto?: TipoGasto | null;
  onSubmit: (formData: TipoGasto) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function TiposGastoList({
  tiposGasto,
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
  currentTipoGasto,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: TiposGastoListProps) {
  const [formData, setFormData] = useState({
    id: "",
    TipoGastoId: "",
    TipoGastoDescripcion: "",
    TipoGastoCantGastos: 0,
  });

  useEffect(() => {
    if (currentTipoGasto) {
      setFormData({
        id: String(currentTipoGasto.id ?? currentTipoGasto.TipoGastoId),
        TipoGastoId: String(currentTipoGasto.TipoGastoId),
        TipoGastoDescripcion: currentTipoGasto.TipoGastoDescripcion,
        TipoGastoCantGastos: currentTipoGasto.TipoGastoCantGastos,
      });
    } else {
      setFormData({
        id: "",
        TipoGastoId: "",
        TipoGastoDescripcion: "",
        TipoGastoCantGastos: 0,
      });
    }
  }, [currentTipoGasto]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "TipoGastoCantGastos" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const columns = [
    { key: "TipoGastoId", label: "ID" },
    { key: "TipoGastoDescripcion", label: "Descripción" },
    { key: "TipoGastoCantGastos", label: "Cantidad de Gastos" },
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
            placeholder="Buscar tipos de gasto"
          />
        </div>
        <div className="py-4">
          <ActionButton
            label="Nuevo Tipo de Gasto"
            onClick={onCreate}
            icon={PlusIcon}
          />
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {tiposGasto.length} de {pagination?.totalItems} tipos de
          gasto
        </div>
      </div>
      <DataTable<TipoGasto>
        columns={columns}
        data={tiposGasto}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron tipos de gasto"
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
              className="relative bg-white rounded-lg shadow"
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentTipoGasto
                    ? `Editar tipo de gasto: ${currentTipoGasto.TipoGastoId}`
                    : "Crear nuevo tipo de gasto"}
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
                  <div className="col-span-6 sm:col-span-4">
                    <label
                      htmlFor="TipoGastoDescripcion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="TipoGastoDescripcion"
                      id="TipoGastoDescripcion"
                      value={formData.TipoGastoDescripcion}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label
                      htmlFor="TipoGastoCantGastos"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Cantidad de Gastos
                    </label>
                    <input
                      type="number"
                      name="TipoGastoCantGastos"
                      id="TipoGastoCantGastos"
                      value={formData.TipoGastoCantGastos}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <button
                  type="submit"
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  {currentTipoGasto ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                  onClick={onCloseModal}
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
