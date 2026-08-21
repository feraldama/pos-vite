import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

interface TipoPrenda {
  TipoPrendaId: number;
  TipoPrendaNombre: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface TiposPrendaListProps {
  tiposPrenda: TipoPrenda[];
  onDelete?: (item: TipoPrenda) => void;
  onEdit?: (item: TipoPrenda) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentTipoPrenda?: TipoPrenda | null;
  onSubmit: (formData: TipoPrenda) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function TiposPrendaList({
  tiposPrenda,
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
  currentTipoPrenda,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: TiposPrendaListProps) {
  const [formData, setFormData] = useState<TipoPrenda>({
    TipoPrendaId: 0,
    TipoPrendaNombre: "",
  });

  useEffect(() => {
    if (currentTipoPrenda) {
      setFormData({ ...currentTipoPrenda });
    } else {
      setFormData({
        TipoPrendaId: 0,
        TipoPrendaNombre: "",
      });
    }
  }, [currentTipoPrenda]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "TipoPrendaNombre" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };


  const columns = [
    { key: "TipoPrendaId", label: "ID" },
    { key: "TipoPrendaNombre", label: "Nombre" },
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
            placeholder="Buscar tipos de prenda"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Tipo de Prenda"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {tiposPrenda.length} de {pagination?.totalItems} tipos de
          prenda
        </div>
      </div>
      <DataTable<TipoPrenda & { id: number }>
        data={tiposPrenda.map((t) => ({ ...t, id: t.TipoPrendaId }))}
        columns={columns}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron tipos de prenda"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />

      {/* Modal */}
      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={onCloseModal}
          title={currentTipoPrenda
                    ? `Editar tipo de prenda: ${currentTipoPrenda.TipoPrendaId}`
                    : "Crear nuevo tipo de prenda"}
        >
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-6">
                    <label
                      htmlFor="TipoPrendaNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre *
                    </label>
                    <input
                      type="text"
                      name="TipoPrendaNombre"
                      id="TipoPrendaNombre"
                      value={formData.TipoPrendaNombre}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 uppercase"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="-mx-6 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 pt-5">
                <ActionButton
                  label={currentTipoPrenda ? "Actualizar" : "Crear"}
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
