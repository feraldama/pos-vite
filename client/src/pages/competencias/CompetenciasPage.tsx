import { useEffect, useState, useCallback } from "react";
import {
  getCompetenciasPaginated,
  deleteCompetencia,
  searchCompetencias,
  createCompetencia,
  updateCompetencia,
} from "../../services/competencia.service";
import CompetenciasList from "../../components/competencias/CompetenciasList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Competencia {
  id: string | number;
  CompetenciaId: string | number;
  CompetenciaNombre: string;
  CompetenciaFechaInicio: string;
  CompetenciaFechaFin: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function CompetenciasPage() {
  const [competenciasData, setCompetenciasData] = useState<{
    competencias: Competencia[];
    pagination: Pagination;
  }>({ competencias: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCompetencia, setCurrentCompetencia] =
    useState<Competencia | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("COMPETENCIAS", "crear");
  const puedeEditar = usePermiso("COMPETENCIAS", "editar");
  const puedeEliminar = usePermiso("COMPETENCIAS", "eliminar");
  const puedeLeer = usePermiso("COMPETENCIAS", "leer");

  const fetchCompetencias = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchCompetencias(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getCompetenciasPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setCompetenciasData({
        competencias: data.data,
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
    fetchCompetencias();
  }, [fetchCompetencias]);

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
          await deleteCompetencia(id);
          Swal.fire({
            icon: "success",
            title: "Competencia eliminada exitosamente",
          });
          setCompetenciasData((prev) => ({
            ...prev,
            competencias: prev.competencias.filter(
              (competencia) => competencia.CompetenciaId !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la competencia";
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
    setCurrentCompetencia(null);
    setIsModalOpen(true);
  };

  const handleEdit = (competencia: Competencia) => {
    setCurrentCompetencia(competencia);
    setIsModalOpen(true);
  };

  const handleSubmit = async (competenciaData: Competencia) => {
    let mensaje = "";
    try {
      if (currentCompetencia) {
        await updateCompetencia(
          currentCompetencia.CompetenciaId,
          competenciaData
        );
        mensaje = "Competencia actualizada exitosamente";
      } else {
        const response = await createCompetencia(competenciaData);
        mensaje = response.message || "Competencia creada exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchCompetencias();
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

  if (loading) return <div>Cargando competencias...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!puedeLeer) return <div>No tienes permiso para ver las competencias</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Competencias</h1>
      <CompetenciasList
        competencias={competenciasData.competencias.map((c) => ({
          ...c,
          id: c.CompetenciaId,
        }))}
        onDelete={
          puedeEliminar
            ? (competencia) => handleDelete(competencia.CompetenciaId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={competenciasData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentCompetencia={
          currentCompetencia
            ? { ...currentCompetencia, id: currentCompetencia.CompetenciaId }
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
        totalPages={competenciasData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
