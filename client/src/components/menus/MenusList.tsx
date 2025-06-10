import { useEffect, useState } from "react";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";
interface Menu {
  id: string;
  MenuId: string;
  MenuNombre: string;
  [key: string]: unknown;
}

interface MenusListProps {
  menus: Menu[];
  onEdit?: (menu: Menu) => void;
  onDelete?: (id: string) => void;
  onCreate?: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentMenu: Menu | null;
  onSubmit: (menu: Menu) => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
}

export default function MenusList({
  menus,
  onEdit,
  onDelete,
  onCreate,
  isModalOpen,
  onCloseModal,
  currentMenu,
  onSubmit,
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
}: MenusListProps) {
  const [formData, setFormData] = useState({
    MenuId: "",
    MenuNombre: "",
  });

  useEffect(() => {
    if (currentMenu) {
      setFormData({
        MenuId: currentMenu.MenuId,
        MenuNombre: currentMenu.MenuNombre,
      });
    } else {
      setFormData({ MenuId: "", MenuNombre: "" });
    }
  }, [currentMenu]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ ...currentMenu, ...formData } as Menu);
  };

  const columns = [
    { key: "MenuId", label: "ID" },
    { key: "MenuNombre", label: "Nombre" },
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
            placeholder="Buscar menús"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Menú"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <DataTable<Menu>
        columns={columns}
        data={menus}
        onEdit={onEdit}
        onDelete={onDelete ? (item) => onDelete(item.MenuId) : undefined}
        emptyMessage="No se encontraron menús"
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
                {currentMenu ? `Editar menú` : "Crear nuevo menú"}
              </h3>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  ID
                </label>
                <input
                  type="text"
                  name="MenuId"
                  value={formData.MenuId}
                  onChange={handleInputChange}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                  disabled={!!currentMenu}
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Nombre
                </label>
                <input
                  type="text"
                  name="MenuNombre"
                  value={formData.MenuNombre}
                  onChange={handleInputChange}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <ActionButton
                  label={currentMenu ? "Actualizar" : "Crear"}
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
