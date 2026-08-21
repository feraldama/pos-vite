import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

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
  onSearchSubmit: () => void;
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
    setFormData((prev) => ({
      ...prev,
      [name]: name === "MenuNombre" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ ...currentMenu, ...formData } as Menu);
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: currentMenu ? "Menú actualizado" : "Menú creado",
      showConfirmButton: false,
      timer: 2000,
    });
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
        <Modal
          open={isModalOpen}
          onClose={onCloseModal}
          title={currentMenu
                    ? `Editar menú: ${currentMenu.MenuNombre}`
                    : "Crear nuevo menú"}
        >
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                htmlFor="menuslist-id" className="block mb-2 text-sm font-medium text-gray-900">
                      ID
                    </label>
                    <input
                id="menuslist-id"
                      type="text"
                      name="MenuId"
                      value={formData.MenuId}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      required
                      disabled={!!currentMenu}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                htmlFor="menuslist-nombre" className="block mb-2 text-sm font-medium text-gray-900">
                      Nombre
                    </label>
                    <input
                id="menuslist-nombre"
                      type="text"
                      name="MenuNombre"
                      value={formData.MenuNombre}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      required
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                </div>
              </div>
              <div className="-mx-6 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 pt-5">
                <ActionButton
                  label={currentMenu ? "Actualizar" : "Crear"}
                  type="submit"
                />
                <ActionButton
                  label="Cancelar"
                  variant="secondary"
                  onClick={onCloseModal}
                />
              </div>
            </form>
        </Modal>
      )}
    </>
  );
}
