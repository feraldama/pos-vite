import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getMenus } from "../../services/menus.service";
import { getPermisosByPerfil } from "../../services/perfilmenu.service";

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
  onSearchSubmit: () => void;
}

// Definir tipo explícito para los permisos
const PERMISOS = [
  "puedeLeer",
  "puedeEditar",
  "puedeEliminar",
  "puedeCrear",
] as const;
type Permiso = (typeof PERMISOS)[number];

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
  const [menus, setMenus] = useState<{ MenuId: number; MenuNombre: string }[]>(
    []
  );
  const [menusSeleccionados, setMenusSeleccionados] = useState<number[]>([]);
  const [permisosPorMenu, setPermisosPorMenu] = useState<{
    [menuId: number]: {
      puedeLeer: boolean;
      puedeEditar: boolean;
      puedeEliminar: boolean;
      puedeCrear: boolean;
    };
  }>({});

  useEffect(() => {
    if (isModalOpen) {
      getMenus(1, 1000).then((res) => {
        const menusFiltrados = (res.data || []).filter(
          (menu: { MenuId: number; MenuNombre: string }) => {
            const nombre = menu.MenuNombre.toUpperCase();
            return (
              !nombre.startsWith("WP") &&
              !nombre.startsWith("K2B") &&
              !nombre.startsWith("WW") &&
              !nombre.startsWith("INICIO")
            );
          }
        );
        setMenus(menusFiltrados);
      });
      if (currentPerfil) {
        getPermisosByPerfil(currentPerfil.PerfilId).then((res) => {
          const arr = Array.isArray(res) ? res : res.data;
          setMenusSeleccionados(
            Array.isArray(arr) ? arr.map((m) => m.MenuId) : []
          );
          // Inicializar permisos por menú si vienen del backend
          if (Array.isArray(arr)) {
            const permisos: {
              [menuId: number]: {
                puedeLeer: boolean;
                puedeEditar: boolean;
                puedeEliminar: boolean;
                puedeCrear: boolean;
              };
            } = {};
            arr.forEach((m) => {
              permisos[m.MenuId] = {
                puedeLeer: !!m.puedeLeer,
                puedeEditar: !!m.puedeEditar,
                puedeEliminar: !!m.puedeEliminar,
                puedeCrear: !!m.puedeCrear,
              };
            });
            setPermisosPorMenu(permisos);
          }
        });
      } else {
        setMenusSeleccionados([]);
        setPermisosPorMenu({});
      }
    }
  }, [isModalOpen, currentPerfil]);

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
    setFormData((prev) => ({
      ...prev,
      [name]: name === "PerfilDescripcion" ? value.toUpperCase() : value,
    }));
  };

  const handleMenuChange = (menuId: number) => {
    setMenusSeleccionados((prev) => {
      if (prev.includes(menuId)) {
        // Quitar menú y sus permisos
        const rest = { ...permisosPorMenu };
        delete rest[menuId];
        setPermisosPorMenu(rest);
        return prev.filter((id) => id !== menuId);
      } else {
        setPermisosPorMenu((prevPermisos) => ({
          ...prevPermisos,
          [menuId]: {
            puedeLeer: false,
            puedeEditar: false,
            puedeEliminar: false,
            puedeCrear: false,
          },
        }));
        return [...prev, menuId];
      }
    });
  };

  const handlePermisoChange = (
    menuId: number,
    permiso: Permiso,
    value: boolean
  ) => {
    setPermisosPorMenu((prev) => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [permiso]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const menusAsignados = menusSeleccionados.map((menuId) => ({
      PerfilId: currentPerfil?.PerfilId,
      MenuId: menuId,
      ...permisosPorMenu[menuId],
    }));
    // Enviar solo los datos del perfil y los menús asignados, sin id ni campos incompatibles
    onSubmit({
      PerfilDescripcion: formData.PerfilDescripcion,
      PerfilId: currentPerfil?.PerfilId,
      menusAsignados,
    } as unknown as Perfil);
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
        <Modal
          open={isModalOpen}
          onClose={onCloseModal}
          title={currentPerfil
                    ? `Editar perfil: ${currentPerfil.PerfilDescripcion}`
                    : "Crear nuevo perfil"}
        >
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                htmlFor="perfileslist-descripcion" className="block mb-2 text-sm font-medium text-gray-900">
                      Descripción
                    </label>
                    <input
                id="perfileslist-descripcion"
                      type="text"
                      name="PerfilDescripcion"
                      value={formData.PerfilDescripcion}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      required
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                  <div className="col-span-6">
                    <fieldset>
                      <legend className="block mb-2 text-sm font-medium text-gray-900">
                        Menús
                      </legend>
                    <div className="flex flex-col gap-0">
                      {menus.map((menu) => {
                        const checkboxId = `menu-checkbox-${menu.MenuId}`;
                        const isSelected = menusSeleccionados.includes(
                          menu.MenuId
                        );
                        return (
                          <div className="flex flex-col mb-2" key={menu.MenuId}>
                            <div className="flex items-center mb-1">
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleMenuChange(menu.MenuId)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500"
                              />
                              <label
                                htmlFor={checkboxId}
                                className="ms-2 text-sm font-medium text-gray-900"
                              >
                                {menu.MenuNombre}
                              </label>
                            </div>
                            {isSelected && (
                              <div className="flex gap-4 ml-6 mt-1">
                                {PERMISOS.map((permiso) => (
                                  <label
                                    key={permiso}
                                    className="flex items-center text-xs font-normal text-gray-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        permisosPorMenu[menu.MenuId]?.[
                                          permiso
                                        ] || false
                                      }
                                      onChange={(e) =>
                                        handlePermisoChange(
                                          menu.MenuId,
                                          permiso,
                                          e.target.checked
                                        )
                                      }
                                      className="mr-1"
                                    />
                                    {permiso.replace("puede", "")}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    </fieldset>
                  </div>
                </div>
              </div>
              <div className="-mx-6 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 pt-5">
                <ActionButton
                  label={currentPerfil ? "Actualizar" : "Crear"}
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
