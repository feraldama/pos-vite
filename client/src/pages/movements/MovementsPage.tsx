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

export default function MovementsPage() {
  const [movimientosData, setMovimientosData] = useState({
    movimientos: [],
    pagination: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentMovement, setCurrentMovement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchMovimientos = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchRegistrosDiariosCaja(
          appliedSearchTerm,
          currentPage,
          itemsPerPage
        );
      } else {
        data = await getRegistrosDiariosCaja(currentPage, itemsPerPage);
      }
      setMovimientosData({
        movimientos: data.data,
        pagination: data.pagination,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedSearchTerm, itemsPerPage]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const applySearch = () => {
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      applySearch();
    }
  };

  const handleDelete = async (movimiento) => {
    try {
      await deleteRegistroDiarioCaja(movimiento.RegistroDiarioCajaId);
      setSuccessMessage("Registro eliminado exitosamente");
      setShowSuccessModal(true);
      fetchMovimientos();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCreate = () => {
    setCurrentMovement(null);
    setIsModalOpen(true);
  };

  const handleEdit = (movimiento) => {
    setCurrentMovement(movimiento);
    setIsModalOpen(true);
  };

  const handleSubmit = async (movementData) => {
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
      setError(error.message);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Resetear a la primera página cuando cambia el número de items por página
  };

  if (loading) return <div>Cargando registros...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-3">Registro Diario de Caja</h1>
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
