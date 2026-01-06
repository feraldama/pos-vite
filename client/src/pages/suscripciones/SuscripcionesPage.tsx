import { useEffect, useState, useCallback } from "react";
import {
  getSuscripciones,
  deleteSuscripcion,
  searchSuscripciones,
  createSuscripcion,
  updateSuscripcion,
} from "../../services/suscripciones.service";
import SuscripcionesList from "../../components/suscripciones/SuscripcionesList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Suscripcion {
  id: string | number;
  SuscripcionId: string | number;
  ClienteId: string | number;
  PlanId: string | number;
  SuscripcionFechaInicio: string;
  SuscripcionFechaFin: string;
  ClienteNombre?: string;
  ClienteApellido?: string;
  PlanNombre?: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function SuscripcionesPage() {
  const [suscripcionesData, setSuscripcionesData] = useState<{
    suscripciones: Suscripcion[];
    pagination: Pagination;
  }>({ suscripciones: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSuscripcion, setCurrentSuscripcion] =
    useState<Suscripcion | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("SUSCRIPCIONES", "crear");
  const puedeEditar = usePermiso("SUSCRIPCIONES", "editar");
  const puedeEliminar = usePermiso("SUSCRIPCIONES", "eliminar");
  const puedeLeer = usePermiso("SUSCRIPCIONES", "leer");

  const fetchSuscripciones = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchSuscripciones(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getSuscripciones(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setSuscripcionesData({
        suscripciones: data.data,
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
    fetchSuscripciones();
  }, [fetchSuscripciones]);

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
          await deleteSuscripcion(id);
          Swal.fire({
            icon: "success",
            title: "Suscripción eliminada exitosamente",
          });
          setSuscripcionesData((prev) => ({
            ...prev,
            suscripciones: prev.suscripciones.filter(
              (suscripcion) => suscripcion.SuscripcionId !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la suscripción";
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
    setCurrentSuscripcion(null);
    setIsModalOpen(true);
  };

  const handleEdit = (suscripcion: Suscripcion) => {
    setCurrentSuscripcion(suscripcion);
    setIsModalOpen(true);
  };

  const handleSubmit = async (suscripcionData: Suscripcion) => {
    let mensaje = "";
    try {
      if (currentSuscripcion) {
        await updateSuscripcion(
          currentSuscripcion.SuscripcionId,
          suscripcionData
        );
        mensaje = "Suscripción actualizada exitosamente";
      } else {
        const response = await createSuscripcion(suscripcionData);
        mensaje = response.message || "Suscripción creada exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchSuscripciones();
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

  if (!puedeLeer)
    return <div>No tienes permiso para ver las suscripciones</div>;

  if (loading) return <div>Cargando suscripciones...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Suscripciones</h1>
      <SuscripcionesList
        suscripciones={suscripcionesData.suscripciones.map((s) => ({
          ...s,
          id: s.SuscripcionId,
        }))}
        onDelete={
          puedeEliminar
            ? (suscripcion) => handleDelete(suscripcion.SuscripcionId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={suscripcionesData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentSuscripcion={
          currentSuscripcion
            ? { ...currentSuscripcion, id: currentSuscripcion.SuscripcionId }
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
        totalPages={suscripcionesData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
