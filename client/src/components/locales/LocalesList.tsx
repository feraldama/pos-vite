import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Local {
  id: string | number;
  LocalId: string | number;
  LocalNombre: string;
  LocalTelefono?: string;
  LocalCelular?: string;
  LocalDireccion?: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface LocalesListProps {
  locales: Local[];
  onDelete?: (item: Local) => void;
  onEdit?: (item: Local) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentLocal?: Local | null;
  onSubmit: (formData: Local) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function LocalesList({
  locales,
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
  currentLocal,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: LocalesListProps) {
  const [formData, setFormData] = useState<Local>({
    id: "",
    LocalId: "",
    LocalNombre: "",
    LocalTelefono: "",
    LocalCelular: "",
    LocalDireccion: "",
  });

  useEffect(() => {
    if (currentLocal) {
      setFormData({
        id: String(currentLocal.id ?? currentLocal.LocalId),
        LocalId: String(currentLocal.LocalId),
        LocalNombre: currentLocal.LocalNombre,
        LocalTelefono: currentLocal.LocalTelefono || "",
        LocalCelular: currentLocal.LocalCelular || "",
        LocalDireccion: currentLocal.LocalDireccion || "",
      });
    } else {
      setFormData({
        id: "",
        LocalId: "",
        LocalNombre: "",
        LocalTelefono: "",
        LocalCelular: "",
        LocalDireccion: "",
      });
    }
  }, [currentLocal]);

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
    onSubmit(formData);
  };


  const columns = [
    { key: "LocalId", label: "ID" },
    { key: "LocalNombre", label: "Nombre" },
    { key: "LocalTelefono", label: "Teléfono" },
    { key: "LocalCelular", label: "Celular" },
    { key: "LocalDireccion", label: "Dirección" },
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
            placeholder="Buscar locales"
          />
        </div>
        <div className="py-4">
          <ActionButton
            label="Nuevo Local"
            onClick={onCreate}
            icon={PlusIcon}
          />
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {locales.length} de {pagination?.totalItems} locales
        </div>
      </div>
      <DataTable<Local>
        columns={columns}
        data={locales}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron locales"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={onCloseModal}
          title={currentLocal
                    ? `Editar local: ${currentLocal.LocalId}`
                    : "Crear nuevo local"}
        >
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="LocalNombre"
                      id="LocalNombre"
                      value={formData.LocalNombre}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "LocalNombre",
                            value: value,
                          },
                        } as React.ChangeEvent<HTMLInputElement>);
                      }}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalTelefono"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="LocalTelefono"
                      id="LocalTelefono"
                      value={formData.LocalTelefono}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalCelular"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Celular
                    </label>
                    <input
                      type="text"
                      name="LocalCelular"
                      id="LocalCelular"
                      value={formData.LocalCelular}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-6">
                    <label
                      htmlFor="LocalDireccion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="LocalDireccion"
                      id="LocalDireccion"
                      value={formData.LocalDireccion}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                    />
                  </div>
                </div>
              </div>
              <div className="-mx-6 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 pt-5">
                <ActionButton
                  label={currentLocal ? "Actualizar" : "Crear"}
                  type="submit"
                />
                <ActionButton
                  label="Cancelar"
                  variant="secondary"
                  onClick={onCloseModal}
                />
              </div>
            </form>
        </Modal>
      )}
    </>
  );
}
