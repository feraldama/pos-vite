import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const ocultarLayout = location.pathname === "/ventas";

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar con altura fija */}
      {!ocultarLayout && (
        <div className="flex-shrink-0">
          <Navbar setMobileOpen={setMobileOpen} />
        </div>
      )}

      {/* Contenedor principal que ocupa el resto */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!ocultarLayout && (
          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        )}

        {/* Contenido principal con scroll. "relative" hace que los elementos
            con position:absolute de las pantallas (p. ej. los textos sr-only
            para lectores de pantalla) se ubiquen dentro de este contenedor;
            sin eso se ubicaban respecto de la página, la estiraban más allá
            de la ventana y aparecía un segundo scroll en el navegador */}
        <main
          className={
            ocultarLayout
              ? "relative flex-1 overflow-y-auto p-0 m-0"
              : "relative flex-1 overflow-y-auto p-4 lg:ml-64"
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
