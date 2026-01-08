import { useEffect, useState, useCallback } from "react";
import {
  getTiposPrenda,
  deleteTipoPrenda,
  searchTiposPrenda,
  createTipoPrenda,
  updateTipoPrenda,
} from "../../services/tipoprenda.service";
import TiposPrendaList from "../../components/tipoprenda/TiposPrendaList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface TipoPrenda {
  TipoPrendaId: number;
  TipoPrendaNombre: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

type TipoPrendaForm = Partial<TipoPrenda>;

export default function TiposPrendaPage() {
  const [tiposPrendaData, setTiposPrendaData] = useState<{
    tiposPrenda: TipoPrenda[];
    pagination: Pagination;
  }>({ tiposPrenda: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTipoPrenda, setCurrentTipoPrenda] = useState<TipoPrenda | null>(
    null
  );
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("TIPOPRENDA", "crear");
  const puedeEditar = usePermiso("TIPOPRENDA", "editar");
  const puedeEliminar = usePermiso("TIPOPRENDA", "eliminar");
  const puedeLeer = usePermiso("TIPOPRENDA", "leer");

  const fetchTiposPrenda = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchTiposPrenda(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getTiposPrenda(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setTiposPrendaData({
        tiposPrenda: data.data,
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
    fetchTiposPrenda();
  }, [fetchTiposPrenda]);

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
          await deleteTipoPrenda(id);
          Swal.fire({
            icon: "success",
            title: "Tipo de prenda eliminado exitosamente",
          });
          setTiposPrendaData((prev) => ({
            ...prev,
            tiposPrenda: prev.tiposPrenda.filter(
              (tipo) => Number(tipo.TipoPrendaId) !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el tipo de prenda";
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
    setCurrentTipoPrenda(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tipoPrenda: TipoPrenda) => {
    setCurrentTipoPrenda({
      ...tipoPrenda,
      TipoPrendaId: Number(tipoPrenda.TipoPrendaId),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (tipoPrendaData: TipoPrendaForm) => {
    let mensaje = "";
    try {
      if (currentTipoPrenda) {
        await updateTipoPrenda(currentTipoPrenda.TipoPrendaId, tipoPrendaData);
        mensaje = "Tipo de prenda actualizado exitosamente";
      } else {
        const response = await createTipoPrenda(tipoPrendaData);
        mensaje = response.message || "Tipo de prenda creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchTiposPrenda();
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
    return <div>No tienes permiso para ver los tipos de prenda</div>;
  if (loading) return <div>Cargando tipos de prenda...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Tipos de Prenda</h1>
      <TiposPrendaList
        tiposPrenda={tiposPrendaData.tiposPrenda.map((t) => ({
          ...t,
          TipoPrendaId: Number(t.TipoPrendaId),
        }))}
        onDelete={
          puedeEliminar
            ? (t) => handleDelete(Number(t.TipoPrendaId))
            : undefined
        }
        onEdit={
          puedeEditar
            ? (t) =>
                handleEdit({
                  ...t,
                  TipoPrendaId: Number(t.TipoPrendaId),
                })
            : undefined
        }
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={tiposPrendaData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentTipoPrenda={currentTipoPrenda}
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
        totalPages={tiposPrendaData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
