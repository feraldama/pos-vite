import { useEffect, useState, useCallback } from "react";
import {
  getRegistrosDiariosCaja,
  deleteRegistroDiarioCaja,
  searchRegistrosDiariosCaja,
  createRegistroDiarioCaja,
  updateRegistroDiarioCaja,
} from "../../services/registros.service";
import MovementsList from "../../components/movements/MovementsList";
import Pagination from "../../components/common/Pagination";
import { SuccessModal } from "../../components/common/Modal/SuccessModal";

// Tipos auxiliares
interface Movimiento {
  id: string | number;
  RegistroDiarioCajaId: string | number;
  RegistroDiarioCajaFecha: string;
  RegistroDiarioCajaDetalle: string;
  RegistroDiarioCajaMonto: number;
  UsuarioId: string | number;
  CajaId: string | number;
  TipoGastoId: string | number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function MovementsPage() {
  const [movimientosData, setMovimientosData] = useState<{
    movimientos: Movimiento[];
    pagination: Pagination;
  }>({ movimientos: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentMovement, setCurrentMovement] = useState<Movimiento | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const fetchMovimientos = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchRegistrosDiariosCaja(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getRegistrosDiariosCaja(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setMovimientosData({
        movimientos: data.data,
        pagination: data.pagination,
      });
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
    fetchMovimientos();
  }, [fetchMovimientos]);

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

  const handleDelete = async (movimiento: Movimiento) => {
    try {
      await deleteRegistroDiarioCaja(movimiento.RegistroDiarioCajaId);
      setSuccessMessage("Registro eliminado exitosamente");
      setShowSuccessModal(true);
      fetchMovimientos();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    }
  };

  const handleCreate = () => {
    setCurrentMovement(null);
    setIsModalOpen(true);
  };

  const handleEdit = (movimiento: Movimiento) => {
    setCurrentMovement(movimiento);
    setIsModalOpen(true);
  };

  const handleSubmit = async (movementData: Movimiento) => {
    try {
      if (currentMovement) {
        await updateRegistroDiarioCaja(
          currentMovement.RegistroDiarioCajaId,
          movementData
        );
        setSuccessMessage("Registro actualizado exitosamente");
      } else {
        const response = await createRegistroDiarioCaja(movementData);
        setSuccessMessage(response.message || "Registro creado exitosamente");
      }

      setIsModalOpen(false);
      setShowSuccessModal(true);
      fetchMovimientos();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) return <div>Cargando registros...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Registro Diario de Caja</h1>
      <MovementsList
        movimientos={movimientosData.movimientos}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onCreate={handleCreate}
        pagination={movimientosData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentMovement={currentMovement}
        onSubmit={handleSubmit}
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
        totalPages={movimientosData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {showSuccessModal && (
        <SuccessModal
          message={successMessage}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </div>
  );
}
