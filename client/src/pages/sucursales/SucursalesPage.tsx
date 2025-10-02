import { useEffect, useState, useCallback } from "react";
import {
  getSucursales,
  deleteSucursal,
  searchSucursales,
  createSucursal,
  updateSucursal,
} from "../../services/sucursal.service";
import SucursalesList from "../../components/sucursales/SucursalesList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Sucursal {
  id: string | number;
  SucursalId: string | number;
  SucursalNombre: string;
  SucursalDireccion: string;
  SucursalTelefono: string;
  SucursalEmail: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function SucursalesPage() {
  const [sucursalesData, setSucursalesData] = useState<{
    sucursales: Sucursal[];
    pagination: Pagination;
  }>({ sucursales: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSucursal, setCurrentSucursal] = useState<Sucursal | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("SUCURSALES", "crear");
  const puedeEditar = usePermiso("SUCURSALES", "editar");
  const puedeEliminar = usePermiso("SUCURSALES", "eliminar");
  const puedeLeer = usePermiso("SUCURSALES", "leer");

  const fetchSucursales = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchSucursales(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getSucursales(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setSucursalesData({
        sucursales: data.data,
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
    fetchSucursales();
  }, [fetchSucursales]);

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
          await deleteSucursal(id);
          Swal.fire({
            icon: "success",
            title: "Sucursal eliminada exitosamente",
          });
          setSucursalesData((prev) => ({
            ...prev,
            sucursales: prev.sucursales.filter(
              (sucursal) => sucursal.SucursalId !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la sucursal";
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
    setCurrentSucursal(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sucursal: Sucursal) => {
    setCurrentSucursal(sucursal);
    setIsModalOpen(true);
  };

  const handleSubmit = async (sucursalData: Sucursal) => {
    let mensaje = "";
    try {
      if (currentSucursal) {
        await updateSucursal(currentSucursal.SucursalId, sucursalData);
        mensaje = "Sucursal actualizada exitosamente";
      } else {
        const response = await createSucursal(sucursalData);
        mensaje = response.message || "Sucursal creada exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchSucursales();
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

  if (loading) return <div>Cargando sucursales...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!puedeLeer) return <div>No tienes permiso para ver las sucursales</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Sucursales</h1>
      <SucursalesList
        sucursales={sucursalesData.sucursales.map((s) => ({
          ...s,
          id: s.SucursalId,
        }))}
        onDelete={
          puedeEliminar
            ? (sucursal) => handleDelete(sucursal.SucursalId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={sucursalesData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentSucursal={
          currentSucursal
            ? { ...currentSucursal, id: currentSucursal.SucursalId }
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
        totalPages={sucursalesData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
