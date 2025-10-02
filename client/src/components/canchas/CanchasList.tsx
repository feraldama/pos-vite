import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getSucursales } from "../../services/sucursal.service";

interface Cancha {
  id: string | number;
  CanchaId: string | number;
  CanchaNombre: string;
  CanchaEstado: boolean;
  SucursalId: string | number;
  [key: string]: unknown;
}

interface Sucursal {
  SucursalId: string | number;
  SucursalNombre: string;
  SucursalDireccion: string;
  SucursalTelefono: string;
  SucursalEmail: string;
}

interface Pagination {
  totalItems: number;
}

interface CanchasListProps {
  canchas: Cancha[];
  onDelete?: (item: Cancha) => void;
  onEdit?: (item: Cancha) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCancha?: Cancha | null;
  onSubmit: (formData: Cancha) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function CanchasList({
  canchas,
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
  currentCancha,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: CanchasListProps) {
  const [formData, setFormData] = useState({
    id: "",
    CanchaId: "",
    CanchaNombre: "",
    CanchaEstado: true,
    SucursalId: "",
  });
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  // Cargar sucursales al montar el componente
  useEffect(() => {
    const loadSucursales = async () => {
      try {
        const response = await getSucursales(1, 1000); // Obtener todas las sucursales
        setSucursales(response.data || []);
      } catch (error) {
        console.error("Error al cargar sucursales:", error);
      }
    };
    loadSucursales();
  }, []);

  useEffect(() => {
    if (currentCancha) {
      setFormData({
        id: String(currentCancha.id ?? currentCancha.CanchaId),
        CanchaId: String(currentCancha.CanchaId),
        CanchaNombre: currentCancha.CanchaNombre,
        CanchaEstado: Boolean(currentCancha.CanchaEstado),
        SucursalId: String(currentCancha.SucursalId),
      });
    } else {
      setFormData({
        id: "",
        CanchaId: "",
        CanchaNombre: "",
        CanchaEstado: true,
        SucursalId: "",
      });
    }
  }, [currentCancha]);

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

    // Validar que se haya seleccionado una sucursal
    if (!formData.SucursalId || formData.SucursalId === "") {
      alert("Por favor seleccione una sucursal");
      return;
    }

    // Convertir SucursalId a número
    const formDataToSubmit = {
      ...formData,
      SucursalId: Number(formData.SucursalId),
    };

    onSubmit(formDataToSubmit as Cancha);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const columns = [
    { key: "CanchaId", label: "ID" },
    { key: "CanchaNombre", label: "Nombre" },
    {
      key: "CanchaEstado",
      label: "Estado",
      render: (item: Cancha) => (item.CanchaEstado ? "ACTIVA" : "INACTIVA"),
    },
    {
      key: "SucursalId",
      label: "Sucursal",
      render: (item: Cancha) => {
        const sucursal = sucursales.find(
          (s) => s.SucursalId == item.SucursalId
        );
        return sucursal ? sucursal.SucursalNombre : `ID: ${item.SucursalId}`;
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
            placeholder="Buscar canchas"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Cancha"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {canchas.length} de {pagination?.totalItems} canchas
        </div>
      </div>
      <DataTable<Cancha>
        columns={columns}
        data={canchas}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron canchas"
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
                  {currentCancha
                    ? `Editar cancha: ${currentCancha.CanchaId}`
                    : "Crear nueva cancha"}
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
                      htmlFor="CanchaNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="CanchaNombre"
                      id="CanchaNombre"
                      value={formData.CanchaNombre}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "CanchaNombre",
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
                      htmlFor="CanchaEstado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Estado
                    </label>
                    <select
                      name="CanchaEstado"
                      id="CanchaEstado"
                      value={formData.CanchaEstado ? "true" : "false"}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          CanchaEstado: e.target.value === "true",
                        }));
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-6">
                    <label
                      htmlFor="SucursalId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Sucursal
                    </label>
                    <select
                      name="SucursalId"
                      id="SucursalId"
                      value={formData.SucursalId}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    >
                      <option value="">Seleccionar sucursal</option>
                      {sucursales.map((sucursal) => (
                        <option
                          key={sucursal.SucursalId}
                          value={sucursal.SucursalId}
                        >
                          {sucursal.SucursalNombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentCancha ? "Actualizar" : "Crear"}
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
