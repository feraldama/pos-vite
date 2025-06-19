import { useEffect, useState } from "react";
import DataTable from "../common/Table/DataTable";
import type { Venta } from "../../services/venta.service";
import { formatCurrency } from "../../utils/utils";
import { getAlmacenById } from "../../services/almacenes.service";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import { PlusIcon } from "@heroicons/react/24/outline";

interface VentasListProps {
  ventas: Venta[];
  onSort?: (key: string, order: "asc" | "desc") => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onViewDetails?: (venta: Venta) => void;
  onCreate?: () => void;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
  pagination?: {
    totalItems: number;
  };
}

interface VentaWithId extends Venta {
  id: number;
  AlmacenNombre?: string;
  Saldo?: number;
  [key: string]: string | number | undefined;
}

const VentasList = ({
  ventas,
  onSort,
  sortKey,
  sortOrder,
  onViewDetails,
  onCreate,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  pagination,
}: VentasListProps) => {
  const [ventasWithAlmacen, setVentasWithAlmacen] = useState<VentaWithId[]>([]);

  useEffect(() => {
    const loadAlmacenesData = async () => {
      const ventasData = ventas.map((venta) => ({
        ...venta,
        id: venta.VentaId,
        Saldo: venta.Total - Number(venta.VentaEntrega || 0),
      }));

      try {
        const ventasWithAlmacenData = await Promise.all(
          ventasData.map(async (venta) => {
            try {
              const almacen = await getAlmacenById(venta.AlmacenId);
              return {
                ...venta,
                AlmacenNombre: almacen.AlmacenNombre,
              };
            } catch (error) {
              console.error(
                `Error al cargar almacén ${venta.AlmacenId}:`,
                error
              );
              return venta;
            }
          })
        );
        setVentasWithAlmacen(ventasWithAlmacenData);
      } catch (error) {
        console.error("Error al cargar datos de almacenes:", error);
        setVentasWithAlmacen(ventasData);
      }
    };

    loadAlmacenesData();
  }, [ventas]);

  const getTipoVentaText = (tipo: string) => {
    switch (tipo) {
      case "CO":
        return "Contado";
      case "CR":
        return "Crédito";
      case "PO":
        return "POS";
      case "TR":
        return "Transfer";
      default:
        return tipo;
    }
  };

  const columns = [
    {
      key: "VentaId",
      label: "ID",
    },
    {
      key: "VentaFecha",
      label: "Fecha",
      render: (venta: VentaWithId) => {
        const fecha = new Date(venta.VentaFecha);
        return fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      key: "Cliente",
      label: "Cliente",
      render: (venta: VentaWithId) =>
        venta.ClienteNombre
          ? `${venta.ClienteNombre} ${venta.ClienteApellido}`
          : `Cliente #${venta.ClienteId}`,
    },
    {
      key: "AlmacenNombre",
      label: "Almacén",
      render: (venta: VentaWithId) =>
        venta.AlmacenNombre || `Almacén #${venta.AlmacenId}`,
    },
    {
      key: "VentaTipo",
      label: "Tipo",
      render: (venta: VentaWithId) => getTipoVentaText(venta.VentaTipo),
    },
    {
      key: "Total",
      label: "Total",
      render: (venta: VentaWithId) => formatCurrency(venta.Total),
    },
    {
      key: "VentaEntrega",
      label: "Entrega",
      render: (venta: VentaWithId) =>
        venta.VentaEntrega ? formatCurrency(Number(venta.VentaEntrega)) : "-",
    },
    {
      key: "Saldo",
      label: "Saldo",
      render: (venta: VentaWithId) => formatCurrency(venta.Saldo || 0),
    },
    {
      key: "VentaUsuario",
      label: "Usuario",
    },
  ];

  const getStatusColor = (status: unknown) => {
    switch (status) {
      case "P":
        return "bg-yellow-500"; // Pendiente
      case "C":
        return "bg-green-500"; // Completado
      case "A":
        return "bg-red-500"; // Anulado
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: unknown) => {
    switch (status) {
      case "P":
        return "Pendiente";
      case "C":
        return "Completado";
      case "A":
        return "Anulado";
      default:
        return "Desconocido";
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
            placeholder="Buscar ventas..."
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Venta"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {ventasWithAlmacen.length} de{" "}
          {pagination?.totalItems || ventasWithAlmacen.length} ventas
        </div>
      </div>

      <DataTable<VentaWithId>
        columns={columns}
        data={ventasWithAlmacen}
        onEdit={onViewDetails}
        emptyMessage="No hay ventas registradas"
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
    </>
  );
};

export default VentasList;
