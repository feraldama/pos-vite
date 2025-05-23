import { useEffect, useState, useCallback } from "react";
import {
  getClientes,
  deleteCliente,
  searchClientes,
  createCliente,
  updateCliente,
} from "../../services/clientes.service";
import CustomersList from "../../components/customers/CustomersList";
import Pagination from "../../components/common/Pagination";
import { SuccessModal } from "../../components/common/Modal/SuccessModal";

interface Cliente {
  id: string | number;
  ClienteId: string;
  ClienteRUC: string;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteDireccion: string;
  ClienteTelefono: string;
  ClienteTipo: string;
  UsuarioId: string;
  ClienteCodJSI: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function CustomersPage() {
  const [clientesData, setClientesData] = useState<{
    clientes: Cliente[];
    pagination: Pagination;
  }>({ clientes: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Cliente | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchClientes(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getClientes(currentPage, itemsPerPage, sortKey, sortOrder);
      }
      setClientesData({
        clientes: data.data,
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
    fetchClientes();
  }, [fetchClientes]);

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
    try {
      await deleteCliente(id);
      setClientesData((prev) => ({
        ...prev,
        clientes: prev.clientes.filter((cliente) => cliente.ClienteId !== id),
      }));
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    }
  };

  const handleCreate = () => {
    setCurrentCliente(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setCurrentCliente(cliente);
    setIsModalOpen(true);
  };

  const handleSubmit = async (clienteData: Cliente) => {
    try {
      if (currentCliente) {
        await updateCliente(currentCliente.ClienteId, clienteData);
        setSuccessMessage("Cliente actualizado exitosamente");
      } else {
        const response = await createCliente(clienteData);
        setSuccessMessage(response.message || "Cliente creado exitosamente");
      }
      setIsModalOpen(false);
      setShowSuccessModal(true);
      fetchClientes();
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

  if (loading) return <div>Cargando clientes...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Clientes</h1>
      <CustomersList
        clientes={clientesData.clientes.map((c) => ({ ...c, id: c.ClienteId }))}
        onDelete={(cliente) => handleDelete(cliente.ClienteId)}
        onEdit={handleEdit}
        onCreate={handleCreate}
        pagination={clientesData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentCliente={
          currentCliente
            ? { ...currentCliente, id: currentCliente.ClienteId }
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
        totalPages={clientesData.pagination.totalPages}
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
