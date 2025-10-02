import { useEffect, useState, useCallback } from "react";
import {
  getCanchasPaginated,
  deleteCancha,
  searchCanchas,
  createCancha,
  updateCancha,
} from "../../services/cancha.service";
import CanchasList from "../../components/canchas/CanchasList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Cancha {
  id: string | number;
  CanchaId: string | number;
  CanchaNombre: string;
  CanchaEstado: boolean;
  SucursalId: string | number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function CanchasPage() {
  const [canchasData, setCanchasData] = useState<{
    canchas: Cancha[];
    pagination: Pagination;
  }>({ canchas: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCancha, setCurrentCancha] = useState<Cancha | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("CANCHAS", "crear");
  const puedeEditar = usePermiso("CANCHAS", "editar");
  const puedeEliminar = usePermiso("CANCHAS", "eliminar");
  const puedeLeer = usePermiso("CANCHAS", "leer");

  const fetchCanchas = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchCanchas(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getCanchasPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setCanchasData({
        canchas: data.data,
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
    fetchCanchas();
  }, [fetchCanchas]);

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

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar!",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteCancha(id);
          Swal.fire({
            icon: "success",
            title: "Cancha eliminada exitosamente",
          });
          setCanchasData((prev) => ({
            ...prev,
            canchas: prev.canchas.filter((cancha) => cancha.CanchaId !== id),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la cancha";
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: msg,
          });
        }
      }
    });
  };

  const handleCreate = () => {
    setCurrentCancha(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cancha: Cancha) => {
    setCurrentCancha(cancha);
    setIsModalOpen(true);
  };

  const handleSubmit = async (canchaData: Cancha) => {
    let mensaje = "";
    try {
      if (currentCancha) {
        await updateCancha(currentCancha.CanchaId, canchaData);
        mensaje = "Cancha actualizada exitosamente";
      } else {
        const response = await createCancha(canchaData);
        mensaje = response.message || "Cancha creada exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchCanchas();
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

  if (loading) return <div>Cargando canchas...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!puedeLeer) return <div>No tienes permiso para ver las canchas</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Canchas</h1>
      <CanchasList
        canchas={canchasData.canchas.map((c) => ({
          ...c,
          id: c.CanchaId,
        }))}
        onDelete={
          puedeEliminar
            ? (cancha) => handleDelete(cancha.CanchaId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={canchasData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentCancha={
          currentCancha
            ? { ...currentCancha, id: currentCancha.CanchaId }
            : null
        }
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
        totalPages={canchasData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
