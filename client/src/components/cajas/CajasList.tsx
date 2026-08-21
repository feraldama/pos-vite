import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/formato";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface CajasListProps {
  cajas: Caja[];
  onDelete?: (item: Caja) => void;
  onEdit?: (item: Caja) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCaja?: Caja | null;
  onSubmit: (formData: Caja) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function CajasList({
  cajas,
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
  currentCaja,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: CajasListProps) {
  const [formData, setFormData] = useState({
    id: "",
    CajaId: "",
    CajaDescripcion: "",
    CajaMonto: 0,
  });

  useEffect(() => {
    if (currentCaja) {
      setFormData({
        id: String(currentCaja.id ?? currentCaja.CajaId),
        CajaId: String(currentCaja.CajaId),
        CajaDescripcion: currentCaja.CajaDescripcion,
        CajaMonto: currentCaja.CajaMonto,
      });
    } else {
      setFormData({
        id: "",
        CajaId: "",
        CajaDescripcion: "",
        CajaMonto: 0,
      });
    }
  }, [currentCaja]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "CajaMonto" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };


  const columns = [
    { key: "CajaId", label: "ID" },
    { key: "CajaDescripcion", label: "Descripción" },
    {
      key: "CajaMonto",
      label: "Monto",
      render: (caja: Caja) => `Gs. ${formatMiles(caja.CajaMonto)}`,
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
            placeholder="Buscar cajas"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Caja"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {cajas.length} de {pagination?.totalItems} cajas
        </div>
      </div>
      <DataTable<Caja>
        columns={columns}
        data={cajas}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron cajas"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={onCloseModal}
          title={currentCaja
                    ? `Editar caja: ${currentCaja.CajaId}`
                    : "Crear nueva caja"}
        >
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="CajaDescripcion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="CajaDescripcion"
                      id="CajaDescripcion"
                      value={formData.CajaDescripcion}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "CajaDescripcion",
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
                      htmlFor="CajaMonto"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Monto
                    </label>
                    <input
                      type="text"
                      name="CajaMonto"
                      id="CajaMonto"
                      value={
                        formData.CajaMonto ? formatMiles(formData.CajaMonto) : 0
                      }
                      onChange={(e) => {
                        const raw = e.target.value
                          .replace(/\./g, "")
                          .replace(/\s/g, "");
                        const num = Number(raw);
                        if (!isNaN(num)) {
                          setFormData((prev) => ({ ...prev, CajaMonto: num }));
                        }
                      }}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="-mx-6 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 pt-5">
                <ActionButton
                  label={currentCaja ? "Actualizar" : "Crear"}
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
