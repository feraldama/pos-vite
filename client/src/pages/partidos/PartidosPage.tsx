import { useEffect, useState, useCallback } from "react";
import {
  getPartidosPaginated,
  createPartido,
  updatePartido,
  deletePartido,
} from "../../services/partido.service";
// import { getClientes } from "../../services/clientes.service";
import PartidosList from "../../components/partidos/PartidosList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Partido {
  PartidoId: number;
  PartidoFecha: string;
  PartidoHoraInicio: string;
  PartidoHoraFin: string;
  PartidoCategoria: string;
  PartidoEstado: boolean;
  CanchaId: number;
  CanchaNombre?: string;
  id: number;
  [key: string]: unknown;
}

interface PartidoJugador {
  PartidoJugadorId: number;
  PartidoId: number;
  ClienteId: number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  PartidoJugadorPareja: string;
  PartidoJugadorResultado: string;
  PartidoJugadorObs: string;
  [key: string]: unknown;
}

interface PaginationType {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function PartidosPage() {
  const [partidosData, setPartidosData] = useState<{
    partidos: Partido[];
    pagination: PaginationType;
  }>({ partidos: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPartido, setCurrentPartido] = useState<Partido | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const puedeCrear = usePermiso("PARTIDOS", "crear");
  const puedeEditar = usePermiso("PARTIDOS", "editar");
  const puedeEliminar = usePermiso("PARTIDOS", "eliminar");
  const puedeLeer = usePermiso("PARTIDOS", "leer");

  const fetchPartidos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPartidosPaginated(currentPage, itemsPerPage);
      const data = response.data;
      setPartidosData({
        partidos: data,
        pagination: response.pagination || {
          totalItems: data.length,
          totalPages: 1,
        },
      });
    } catch {
      setError("Error al obtener partidos");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchPartidos();
  }, [fetchPartidos]);

  const handleCreate = () => {
    setCurrentPartido(null);
    setIsModalOpen(true);
  };

  const handleEdit = (partido: Partido) => {
    setCurrentPartido({ ...partido, id: partido.PartidoId });
    setIsModalOpen(true);
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
          await deletePartido(id);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Partido eliminado",
            showConfirmButton: false,
            timer: 2000,
          });
          fetchPartidos();
        } catch {
          Swal.fire({ icon: "error", title: "No se pudo eliminar" });
        }
      }
    });
  };

  const handleSubmit = async (
    partidoData: Partido & { jugadores?: PartidoJugador[] }
  ) => {
    try {
      if (currentPartido) {
        await updatePartido(currentPartido.PartidoId, { ...partidoData });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Partido actualizado",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        await createPartido({ ...partidoData });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Partido creado",
          showConfirmButton: false,
          timer: 2000,
        });
      }
      // Los jugadores ya fueron creados por el backend al crear el partido
      // No necesitamos crear jugadores adicionales aquí
      setIsModalOpen(false);
      fetchPartidos();
    } catch {
      setError("Error al guardar partido");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => setSearchInput(value);

  const handleSearchSubmit = () => setSearchTerm(searchInput);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearchSubmit();
  };

  const filteredPartidos = partidosData.partidos.filter(
    (partido) =>
      partido.PartidoCategoria.toLowerCase().includes(
        searchTerm.toLowerCase()
      ) ||
      (partido.PartidoEstado ? "FINALIZADO" : "PENDIENTE")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (partido.CanchaNombre &&
        partido.CanchaNombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!puedeLeer) return <div>No tienes permiso para ver los partidos</div>;
  if (loading) return <div>Cargando partidos...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Partidos</h1>
      <PartidosList
        partidos={filteredPartidos.map((p) => ({ ...p, id: p.PartidoId }))}
        onEdit={puedeEditar ? handleEdit : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentPartido={currentPartido}
        onSubmit={handleSubmit}
        searchTerm={searchInput}
        onSearch={handleSearch}
        onKeyPress={handleKeyPress}
        onSearchSubmit={handleSearchSubmit}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={partidosData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
