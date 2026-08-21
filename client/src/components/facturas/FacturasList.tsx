import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Factura {
  id: string | number;
  FacturaId: string | number;
  FacturaTimbrado: string;
  FacturaDesde: string;
  FacturaHasta: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface FacturasListProps {
  facturas: Factura[];
  onDelete?: (item: Factura) => void;
  onEdit?: (item: Factura) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentFactura?: Factura | null;
  onSubmit: (formData: Factura) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function FacturasList({
  facturas,
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
  currentFactura,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: FacturasListProps) {
  const [formData, setFormData] = useState({
    id: "",
    FacturaId: "",
    FacturaTimbrado: "",
    FacturaDesde: "",
    FacturaHasta: "",
  });

  useEffect(() => {
    if (currentFactura) {
      setFormData({
        id: String(currentFactura.id ?? currentFactura.FacturaId),
        FacturaId: String(currentFactura.FacturaId),
        FacturaTimbrado: currentFactura.FacturaTimbrado,
        FacturaDesde: currentFactura.FacturaDesde,
        FacturaHasta: currentFactura.FacturaHasta,
      });
    } else {
      setFormData({
        id: "",
        FacturaId: "",
        FacturaTimbrado: "",
        FacturaDesde: "",
        FacturaHasta: "",
      });
    }
  }, [currentFactura]);

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
    onSubmit(formData as Factura);
  };


  const columns = [
    { key: "FacturaId", label: "ID" },
    { key: "FacturaTimbrado", label: "Timbrado" },
    { key: "FacturaDesde", label: "Desde" },
    { key: "FacturaHasta", label: "Hasta" },
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
            placeholder="Buscar facturas"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Factura"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {facturas.length} de {pagination?.totalItems} facturas
        </div>
      </div>
      <DataTable<Factura>
        columns={columns}
        data={facturas}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron facturas"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={onCloseModal}
          title={currentFactura
                    ? `Editar factura: ${currentFactura.FacturaId}`
                    : "Crear nueva factura"}
        >
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaTimbrado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Timbrado (máximo 8 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaTimbrado"
                      id="FacturaTimbrado"
                      value={formData.FacturaTimbrado}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      placeholder="12345678"
                      maxLength={8}
                      pattern="[0-9]{1,8}"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaDesde"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Desde (máximo 7 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaDesde"
                      id="FacturaDesde"
                      value={formData.FacturaDesde}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      placeholder="1"
                      maxLength={7}
                      pattern="[0-9]{1,7}"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaHasta"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Hasta (máximo 7 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaHasta"
                      id="FacturaHasta"
                      value={formData.FacturaHasta}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      placeholder="1000"
                      maxLength={7}
                      pattern="[0-9]{1,7}"
                      required
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>• El timbrado debe tener máximo 8 dígitos numéricos</p>
                  <p>• Los números desde/hasta deben tener máximo 7 dígitos</p>
                  <p>• El número "Desde" debe ser menor que "Hasta"</p>
                  <p>• No se permiten superposiciones de rangos</p>
                </div>
              </div>
              <div className="-mx-6 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 pt-5">
                <ActionButton
                  label={currentFactura ? "Actualizar" : "Crear"}
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
