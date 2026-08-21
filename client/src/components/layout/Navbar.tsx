import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Bars3Icon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/useAuth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";
import { EMPRESA } from "../../config/empresa";

function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Iniciales del usuario, hasta dos. */
function iniciales(nombre?: string) {
  if (!nombre) return "?";
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface NavbarProps {
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Navbar({ setMobileOpen }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Navegación fija
  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Apertura de caja", href: "/apertura-cierre-caja" },
    { name: "Alquiler Prendas", href: "/alquileres-venta" },
    { name: "Cobro de Alquileres", href: "/credito-pagos" },
  ];

  return (
    <nav className="sticky top-0 z-30 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Botón para abrir sidebar en móvil */}
            <button
              type="button"
              className="-ml-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-300 transition-colors duration-200 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <span className="sr-only">Abrir menú de navegación</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>

            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
              >
                {EMPRESA.inicial}
              </span>
              <span className="hidden text-sm font-semibold text-white sm:block">
                {EMPRESA.nombre}
              </span>
            </Link>

            {/* Menú de navegación (visible en desktop) */}
            <div className="hidden sm:ml-3 sm:block">
              <div className="flex space-x-1">
                {navigation.map((item) => {
                  const activo = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      // aria-current marca en qué sección estás parado
                      aria-current={activo ? "page" : undefined}
                      className={classNames(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                        activo
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Menú de perfil */}
          <Menu as="div" className="relative shrink-0">
            <MenuButton className="relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {/* Avatar con iniciales: antes se cargaba una foto de stock de
                  Unsplash para todos los usuarios, con pedido a un host externo */}
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white"
              >
                {iniciales(user?.nombre)}
              </span>
              <span className="hidden text-white sm:block">
                {user?.nombre ?? "Usuario"}
              </span>
              <ChevronDownIcon
                aria-hidden="true"
                className="h-4 w-4 text-slate-400"
              />
              <span className="sr-only">Abrir menú de usuario</span>
            </MenuButton>
            <MenuItems
              transition
              className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
            >
              <div className="border-b border-slate-200 px-4 py-2">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user?.nombre ?? "Usuario"}
                </p>
                {user?.LocalNombre && (
                  <p className="truncate text-xs text-slate-500">
                    {user.LocalNombre}
                  </p>
                )}
              </div>
              {/* Se quitaron "Tu Perfil" y "Configuración": apuntaban a /profile
                  y /configuraciones, rutas que no existen en App.tsx, y además
                  eran <a> que recargaban toda la SPA */}
              <MenuItem>
                {({ focus }: { focus: boolean }) => (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={classNames(
                      focus ? "bg-slate-100" : "",
                      "block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-700"
                    )}
                  >
                    Cerrar sesión
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>
    </nav>
  );
}
