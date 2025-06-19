import { useEffect, useState, useCallback } from "react";
import {
  getVentasPaginated,
  searchVentas,
  type Venta,
} from "../../services/venta.service";
import { getClienteById } from "../../services/clientes.service";
import VentasList from "../../components/ventas/VentasList";
import Pagination from "../../components/common/Pagination";
import { formatCurrency } from "../../utils/utils";
import Swal from "sweetalert2";

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function VentasPage() {
  const [ventasData, setVentasData] = useState<{
    ventas: Venta[];
    pagination: Pagination;
  }>({ ventas: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string>("VentaFecha");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const loadClientesData = async (ventasData: Venta[]) => {
    try {
      const ventasConClientes = await Promise.all(
        ventasData.map(async (venta) => {
          try {
            const cliente = await getClienteById(venta.ClienteId);
            return {
              ...venta,
              ClienteNombre: cliente.ClienteNombre,
              ClienteApellido: cliente.ClienteApellido,
            };
          } catch (error) {
            console.error(`Error al cargar cliente ${venta.ClienteId}:`, error);
            return venta;
          }
        })
      );
      return ventasConClientes;
    } catch (error) {
      console.error("Error al cargar datos de clientes:", error);
      return ventasData;
    }
  };

  const fetchVentas = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchVentas(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getVentasPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      const ventasConClientes = await loadClientesData(data.data);
      setVentasData({
        ventas: ventasConClientes,
        pagination: data.pagination,
      });
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedSearchTerm, itemsPerPage, sortKey, sortOrder]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const applySearch = () => {
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applySearch();
    }
  };

  const handleViewDetails = (venta: Venta) => {
    const clienteInfo = venta.ClienteNombre
      ? `${venta.ClienteNombre} ${venta.ClienteApellido}`
      : `Cliente #${venta.ClienteId}`;

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

    Swal.fire({
      title: `Venta #${venta.VentaId}`,
      html: `
        <div class="text-left">
          <p><strong>Cliente:</strong> ${clienteInfo}</p>
          <p><strong>Fecha:</strong> ${new Date(
            venta.VentaFecha
          ).toLocaleString()}</p>
          <p><strong>Total:</strong> ${formatCurrency(venta.Total)}</p>
          <p><strong>Tipo:</strong> ${getTipoVentaText(venta.VentaTipo)}</p>
          <p><strong>Usuario:</strong> ${venta.VentaUsuario}</p>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Cerrar",
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleCreateVenta = () => {
    // Implementar la lógica para crear una nueva venta
    console.log("Crear nueva venta");
  };

  if (loading) return <div>Cargando ventas...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Historial de Ventas</h1>
      <VentasList
        ventas={ventasData.ventas}
        onViewDetails={handleViewDetails}
        onCreate={handleCreateVenta}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        pagination={ventasData.pagination}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
          setCurrentPage(1);
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={ventasData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
