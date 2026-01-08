import { useEffect, useState, useCallback } from "react";
import {
  getAlquileres,
  deleteAlquiler,
  searchAlquileres,
  createAlquiler,
  updateAlquiler,
  getAlquilerById,
} from "../../services/alquiler.service";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";
import { getProductosAll } from "../../services/productos.service";
import { getAllTiposPrenda } from "../../services/tipoprenda.service";
import AlquileresList from "../../components/alquileres/AlquileresList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Alquiler {
  AlquilerId: number;
  ClienteId: number;
  AlquilerFechaAlquiler: string;
  AlquilerFechaEntrega?: string;
  AlquilerFechaDevolucion?: string;
  AlquilerEstado: string;
  AlquilerTotal: number;
  AlquilerEntrega: number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  prendas?: AlquilerPrenda[];
  [key: string]: unknown;
}

interface AlquilerPrenda {
  AlquilerId: number;
  AlquilerPrendasId: number;
  ProductoId: number;
  AlquilerPrendasPrecio: number;
  ProductoNombre?: string;
  ProductoCodigo?: string;
  TipoPrendaNombre?: string;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

type AlquilerForm = Partial<Alquiler>;

export default function AlquileresPage() {
  const [alquileresData, setAlquileresData] = useState<{
    alquileres: Alquiler[];
    pagination: Pagination;
  }>({ alquileres: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAlquiler, setCurrentAlquiler] = useState<Alquiler | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const puedeCrear = usePermiso("ALQUILER", "crear");
  const puedeEditar = usePermiso("ALQUILER", "editar");
  const puedeEliminar = usePermiso("ALQUILER", "eliminar");
  const puedeLeer = usePermiso("ALQUILER", "leer");

  const fetchAlquileres = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchAlquileres(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getAlquileres(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setAlquileresData({
        alquileres: data.data,
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
    fetchAlquileres();
  }, [fetchAlquileres]);

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

  const handleDelete = async (id: number) => {
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
          await deleteAlquiler(id);
          Swal.fire({
            icon: "success",
            title: "Alquiler eliminado exitosamente",
          });
          fetchAlquileres();
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el alquiler";
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: msg,
          });
        }
      }
    });
  };

  const handleCreate = async () => {
    setCurrentAlquiler(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (alquiler: Alquiler) => {
    try {
      const alquilerCompleto = await getAlquilerById(alquiler.AlquilerId);
      setCurrentAlquiler(alquilerCompleto);
      setIsModalOpen(true);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el alquiler",
      });
    }
  };

  const handleSubmit = async (alquilerData: AlquilerForm) => {
    let mensaje = "";
    try {
      if (currentAlquiler) {
        await updateAlquiler(currentAlquiler.AlquilerId, alquilerData);
        mensaje = "Alquiler actualizado exitosamente";
      } else {
        const response = await createAlquiler(alquilerData);
        mensaje = response.message || "Alquiler creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchAlquileres();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message,
        });
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

  if (!puedeLeer) return <div>No tienes permiso para ver los alquileres</div>;
  if (loading) return <div>Cargando alquileres...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Alquileres</h1>
      <AlquileresList
        alquileres={alquileresData.alquileres.map((a) => ({
          ...a,
          AlquilerId: Number(a.AlquilerId),
        }))}
        onDelete={
          puedeEliminar ? (a) => handleDelete(Number(a.AlquilerId)) : undefined
        }
        onEdit={
          puedeEditar
            ? (a) =>
                handleEdit({
                  ...a,
                  AlquilerId: Number(a.AlquilerId),
                })
            : undefined
        }
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={alquileresData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentAlquiler={currentAlquiler}
        onSubmit={handleSubmit}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key: string, order: "asc" | "desc") => {
          setSortKey(key);
          setSortOrder(order);
          setCurrentPage(1);
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={alquileresData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
