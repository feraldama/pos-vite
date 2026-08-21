import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import {
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  KeyIcon,
  UsersIcon,
  PencilSquareIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  // RectangleGroupIcon,
  CubeIcon,
  WrenchIcon,
  LockClosedIcon,
  ChartBarIcon,
  // ShoppingCartIcon,
  TagIcon,
  // ClockIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { EMPRESA } from "../../config/empresa";

interface NavigationChild {
  name: string;
  href: string;
  children?: NavigationChild[];
}

interface NavigationItem extends NavigationChild {
  icon?: React.ReactNode;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: <HomeIcon className="h-7 w-6" />,
  },
  {
    name: "Apertura/Cierre de Caja",
    href: "/apertura-cierre-caja",
    icon: <LockClosedIcon className="h-7 w-6" />,
  },
  // {
  //   name: "Alquileres",
  //   href: "/alquileres",
  //   icon: <ClockIcon className="h-7 w-6" />,
  // },
  {
    name: "Alquiler Prendas",
    href: "/alquileres-venta",
    icon: <CurrencyDollarIcon className="h-7 w-6" />,
  },
  // {
  //   name: "Compras",
  //   href: "/compras",
  //   icon: <ShoppingCartIcon className="h-7 w-6" />,
  // },
  {
    name: "Cobro de Alquileres",
    href: "/credito-pagos",
    icon: <BanknotesIcon className="h-7 w-6" />,
  },

  {
    name: "Almacenes",
    href: "/almacenes",
    icon: <ArchiveBoxIcon className="h-7 w-6" />,
  },
  {
    name: "Tipos de Prenda",
    href: "/tipoprenda",
    icon: <TagIcon className="h-7 w-6" />,
  },
  {
    name: "Productos",
    href: "/products",
    icon: <CubeIcon className="h-7 w-6" />,
  },
  // {
  //   name: "Combos",
  //   href: "/combos",
  //   icon: <RectangleGroupIcon className="h-7 w-6" />,
  // },
  {
    name: "Clientes",
    href: "/customers",
    icon: <UsersIcon className="h-7 w-6" />,
  },
  {
    name: "Venta Prendas",
    href: "/ventas",
    icon: <CurrencyDollarIcon className="h-7 w-6" />,
  },
  {
    name: "Reportes",
    href: "/reportes",
    icon: <ChartBarIcon className="h-7 w-6" />,
  },
  {
    name: "Registro Diario",
    href: "/movements",
    icon: <PencilSquareIcon className="h-7 w-6" />,
    children: [
      { name: "Cajas", href: "/movements/cajas" },
      { name: "Tipos de Gasto", href: "/movements/tiposgasto" },
      // { name: "Compras", href: "/movements/purchases" },
      { name: "Registro Diario Caja", href: "/movements/summary" },
    ],
  },
  {
    name: "Modificaciones",
    href: "/modifications",
    icon: <WrenchIcon className="h-7 w-6" />,
    children: [
      { name: "Alquileres", href: "/alquileres" },
      { name: "Venta Prendas", href: "/modifications/ventas" },
      { name: "Facturas", href: "/facturas" },
      // { name: "Compras", href: "/modifications/compras" },
      { name: "Inventario", href: "/inventario" },
    ],
  },
  {
    name: "Control de Acceso",
    href: "/access-control",
    icon: <KeyIcon className="h-7 w-6" />,
    children: [
      { name: "Locales", href: "/locales" },
      { name: "Usuarios", href: "/users" },
      { name: "Perfiles", href: "/perfiles" },
      { name: "Menús", href: "/menus" },
    ],
  },
];

interface NavItemProps {
  item: NavigationItem;
  level?: number;
}

/** ¿La ruta actual cae dentro de este ítem o de alguno de sus hijos? */
function contieneRuta(item: NavigationChild, pathname: string): boolean {
  if (item.href === pathname) return true;
  return (item.children ?? []).some((hijo) => contieneRuta(hijo, pathname));
}

// min-h-11 (44px) por ítem: la navegación se usa con el dedo en la tablet
const ITEM_BASE =
  "flex items-center w-full min-h-11 px-4 py-2 text-sm font-medium rounded-md " +
  "transition-colors duration-200 cursor-pointer " +
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white";

function NavItem({ item, level = 0 }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.href;
  // Los ítems padre tienen un href que no corresponde a ninguna ruta real
  // ("/access-control", "/modifications"), así que comparar sólo por href nunca
  // los marcaba activos ni los abría al entrar a una de sus subpáginas.
  const contieneActiva = contieneRuta(item, location.pathname);

  if (item.children) {
    return (
      <Disclosure as="div" defaultOpen={contieneActiva}>
        {({ open }) => (
          <>
            <DisclosureButton
              className={`${ITEM_BASE} ${
                contieneActiva
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              style={{ paddingLeft: `${level * 12 + 12}px` }}
            >
              {level === 0 && (
                <span aria-hidden="true" className="mr-3 text-lg">
                  {item.icon}
                </span>
              )}
              <span className="flex-1 text-left">{item.name}</span>
              {open ? (
                <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
              ) : (
                <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
              )}
            </DisclosureButton>
            <DisclosurePanel as="ul" className="space-y-1">
              {item.children &&
                item.children.map((child) => (
                  <li key={child.name}>
                    <NavItem item={child} level={level + 1} />
                  </li>
                ))}
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    );
  }

  return (
    <Link
      to={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`${ITEM_BASE} ${
        isActive
          ? "bg-slate-800 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
      style={{ paddingLeft: `${level * 12 + (level === 0 ? 12 : 24)}px` }}
    >
      {level === 0 && (
        <span aria-hidden="true" className="mr-3 text-lg">
          {item.icon}
        </span>
      )}
      {item.name}
    </Link>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const location = useLocation();

  // Escape cierra el panel móvil, que es lo que espera cualquiera que lo abra
  // sin querer con el teclado
  useEffect(() => {
    if (!mobileOpen) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [mobileOpen, setMobileOpen]);

  // Al navegar, cerrar el panel: si no, queda tapando la página recién abierta
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  return (
    <>
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <div
          // bg-slate-900/75 en vez de "bg-gray-600 bg-opacity-75": las utilidades
          // *-opacity-* se eliminaron en Tailwind v4, así que el fondo quedaba
          // gris opaco y tapaba por completo la pantalla en vez de atenuarla
          className={`fixed inset-0 z-40 bg-slate-900/75 transition-opacity duration-200 ${
            mobileOpen ? "block" : "hidden"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          // Cuando está cerrado se saca del árbol de accesibilidad y del tab
          // order: antes seguía siendo enfocable fuera de la pantalla
          aria-hidden={!mobileOpen}
          inert={!mobileOpen}
          className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full pointer-events-none"
          }`}
        >
          <div className="flex h-full flex-col bg-slate-900">
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-4">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
                >
                  {EMPRESA.inicial}
                </span>
                <span className="truncate text-sm font-semibold text-white">
                  {EMPRESA.nombre}
                </span>
              </div>
              <button
                type="button"
                className="-mr-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-300 transition-colors duration-200 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={() => setMobileOpen(false)}
              >
                <span className="sr-only">Cerrar menú de navegación</span>
                <XMarkIcon aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav aria-label="Navegación principal" className="px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar (siempre visible) */}
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex lg:flex-col bg-sidebar border-r border-slate-800"
        style={{
          top: "64px",
          height: "calc(100vh - 64px)",
        }}
      >
        <div className="flex-1 overflow-y-auto">
          <nav aria-label="Navegación principal" className="px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
