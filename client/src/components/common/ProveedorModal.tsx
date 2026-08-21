import React, { useState, useRef, useEffect } from "react";
import { activarConTeclado } from "../../utils/teclado";
import { PlusIcon } from "@heroicons/react/24/outline";
import Modal from "./Modal";
import ActionButton from "./Button/ActionButton";

// Definir la interfaz Proveedor localmente
interface Proveedor {
  ProveedorId: number;
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

interface CreateProveedorData {
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

interface ProveedorModalProps {
  show: boolean;
  onClose: () => void;
  proveedores: Proveedor[];
  onSelect: (proveedor: Proveedor) => void;
  onCreateProveedor: (proveedorData: CreateProveedorData) => Promise<void>;
}

const ProveedorModal: React.FC<ProveedorModalProps> = ({
  show,
  onClose,
  proveedores,
  onSelect,
  onCreateProveedor,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProveedor, setNewProveedor] = useState<CreateProveedorData>({
    ProveedorRUC: "",
    ProveedorNombre: "",
    ProveedorDireccion: "",
    ProveedorTelefono: "",
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProveedores = proveedores.filter(
    (p) =>
      p.ProveedorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ProveedorRUC.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProveedor.ProveedorNombre.trim()) {
      return;
    }

    try {
      await onCreateProveedor(newProveedor);
      setNewProveedor({
        ProveedorRUC: "",
        ProveedorNombre: "",
        ProveedorDireccion: "",
        ProveedorTelefono: "",
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error al crear proveedor:", error);
    }
  };

  // Enfocar el input de búsqueda cuando se abre el modal y no está en modo crear
  useEffect(() => {
    if (show && !showCreateForm && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [show, showCreateForm]);

  return (
    <Modal
      open={show}
      onClose={onClose}
      title="Seleccionar Proveedor"
      maxWidth="max-w-4xl"
    >
        <div className="flex justify-between items-center mb-4">
          <ActionButton
            icon={PlusIcon}
            label="Crear Nuevo Proveedor"
            onClick={() => setShowCreateForm(true)}
          />
        </div>

        {!showCreateForm ? (
          <>
            <div className="mb-4">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredProveedores.map((proveedor) => (
                <div
                  key={proveedor.ProveedorId}
                  role="button"
                  tabIndex={0}
                  aria-label={`Seleccionar proveedor ${proveedor.ProveedorNombre}`}
                  className="mb-2 cursor-pointer rounded-lg border border-slate-200 p-3 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                  onClick={() => onSelect(proveedor)}
                  onKeyDown={activarConTeclado(() => onSelect(proveedor))}
                >
                  <div className="font-semibold">
                    {proveedor.ProveedorNombre}
                  </div>
                  <div className="text-sm text-gray-600">
                    RUC: {proveedor.ProveedorRUC || "Sin RUC"}
                  </div>
                  {proveedor.ProveedorTelefono && (
                    <div className="text-sm text-gray-600">
                      Tel: {proveedor.ProveedorTelefono}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreateProveedor} className="space-y-4">
            <h3 className="text-lg font-semibold">Crear Nuevo Proveedor</h3>

            <div>
              <label
                htmlFor="proveedormodal-nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                id="proveedormodal-nombre"
                type="text"
                value={newProveedor.ProveedorNombre}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorNombre: e.target.value,
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label
                htmlFor="proveedormodal-ruc" className="block text-sm font-medium text-gray-700 mb-1">
                RUC
              </label>
              <input
                id="proveedormodal-ruc"
                type="text"
                value={newProveedor.ProveedorRUC}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorRUC: e.target.value,
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="proveedormodal-direccion" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                id="proveedormodal-direccion"
                type="text"
                value={newProveedor.ProveedorDireccion}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorDireccion: e.target.value,
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="proveedormodal-telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                id="proveedormodal-telefono"
                type="text"
                value={newProveedor.ProveedorTelefono}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorTelefono: e.target.value,
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <ActionButton type="submit" variant="success" label="Crear" />
              <ActionButton
                type="button"
                variant="secondary"
                label="Cancelar"
                onClick={() => setShowCreateForm(false)}
              />
            </div>
          </form>
        )}
    </Modal>
  );
};

export default ProveedorModal;
