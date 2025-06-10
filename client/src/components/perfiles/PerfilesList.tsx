import { useEffect, useState } from "react";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Perfil {
  id: number;
  PerfilId: number;
  PerfilDescripcion: string;
  [key: string]: unknown;
}

interface PerfilesListProps {
  perfiles: Perfil[];
  onEdit?: (perfil: Perfil) => void;
  onDelete?: (id: number) => void;
  onCreate?: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentPerfil: Perfil | null;
  onSubmit: (perfil: Perfil) => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
}

export default function PerfilesList({
  perfiles,
  onEdit,
  onDelete,
  onCreate,
  isModalOpen,
  onCloseModal,
  currentPerfil,
  onSubmit,
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
}: PerfilesListProps) {
  const [formData, setFormData] = useState({
    PerfilDescripcion: "",
  });

  useEffect(() => {
    if (currentPerfil) {
      setFormData({
        PerfilDescripcion: currentPerfil.PerfilDescripcion,
      });
    } else {
      setFormData({ PerfilDescripcion: "" });
    }
  }, [currentPerfil]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ ...currentPerfil, ...formData } as Perfil);
  };

  const columns = [
    { key: "PerfilId", label: "ID" },
    { key: "PerfilDescripcion", label: "Descripción" },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar perfiles"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Perfil"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <DataTable<Perfil>
        columns={columns}
        data={perfiles}
        onEdit={onEdit}
        onDelete={onDelete ? (item) => onDelete(item.PerfilId) : undefined}
        emptyMessage="No se encontraron perfiles"
      />
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onCloseModal}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-md max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4">
                {currentPerfil ? `Editar perfil` : "Crear nuevo perfil"}
              </h3>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Descripción
                </label>
                <input
                  type="text"
                  name="PerfilDescripcion"
                  value={formData.PerfilDescripcion}
                  onChange={handleInputChange}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <ActionButton
                  label={currentPerfil ? "Actualizar" : "Crear"}
                  type="submit"
                />
                <ActionButton label="Cancelar" onClick={onCloseModal} />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
