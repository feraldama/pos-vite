import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { PagoTrans } from "../../services/pagotrans.service";

interface Pagination {
  totalItems: number;
  // Puedes agregar más campos si tu paginación los tiene
}

interface PagoTransWithId extends PagoTrans {
  id: string | number;
  [key: string]: unknown;
}

interface PagosTransporteListProps {
  pagosTrans: PagoTrans[];
  onDelete?: (item: PagoTrans) => void;
  onEdit?: (item: PagoTrans) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  isModalOpen?: boolean;
  onCloseModal: () => void;
  currentPagoTrans?: PagoTrans | null;
  onSubmit: (formData: PagoTrans) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  disableEdit?: boolean;
}

export default function PagosTransporteList({
  pagosTrans = [],
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
  currentPagoTrans,
  onSubmit,
  disableEdit,
}: PagosTransporteListProps) {
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

  // Formatear fecha sin hora
  const formatDateOnly = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Formatear monto
  const formatAmount = (amount: number) => {
    if (!amount) return "Gs. 0";
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      currencyDisplay: "code", // Muestra "PYG"
    })
      .format(amount)
      .replace("PYG", "Gs."); // Reemplaza "PYG" con "Gs."
  };

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: "PagoTransId",
      label: "ID",
    },
    {
      key: "PagoTransFecha",
      label: "Fecha",
      render: (row: PagoTrans) => formatDate(row.PagoTransFecha || ""),
    },
    {
      key: "TransporteNombre",
      label: "Transporte",
    },
    {
      key: "PagoTransOrigen",
      label: "Origen",
    },
    {
      key: "PagoTransDestino",
      label: "Destino",
    },
    {
      key: "PagoTransFechaEmbarque",
      label: "Fecha Embarque",
      render: (row: PagoTrans) =>
        formatDateOnly(row.PagoTransFechaEmbarque || ""),
    },
    {
      key: "PagoTransHora",
      label: "Hora",
    },
    {
      key: "PagoTransAsiento",
      label: "Asiento",
    },
    {
      key: "PagoTransNumeroBoleto",
      label: "N° Boleto",
    },
    {
      key: "PagoTransNombreApellido",
      label: "Nombre/Apellido",
    },
    {
      key: "PagoTransCI",
      label: "CI",
    },
    {
      key: "PagoTransTelefono",
      label: "Teléfono",
    },
    {
      key: "CajaDescripcion",
      label: "Caja",
    },
    {
      key: "PagoTransMonto",
      label: "Monto",
      render: (item: PagoTrans) => formatAmount(item.PagoTransMonto || 0),
    },
    {
      key: "PagoTransClienteRUC",
      label: "RUC",
    },
  ];

  const handleBackdropClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (event.target === event.currentTarget) {
      onCloseModal();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentPagoTrans) {
      onSubmit(currentPagoTrans);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar pagos de transporte..."
          />
        </div>
        <div className="py-4">
          <ActionButton label="Nuevo Pago" onClick={onCreate} icon={PlusIcon} />
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {pagosTrans.length} de {pagination?.totalItems} registros
        </div>
      </div>

      <DataTable<PagoTransWithId>
        columns={columns}
        data={pagosTrans.map((pago) => ({
          ...pago,
          id: pago.id || pago.PagoTransId || 0,
        }))}
        onEdit={disableEdit ? undefined : onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron pagos de transporte"
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
              <ActionButton
                label={currentPagoTrans ? "Actualizar" : "Crear"}
                type="submit"
              />
              <ActionButton
                label="Cancelar"
                className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                onClick={onCloseModal}
              />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
