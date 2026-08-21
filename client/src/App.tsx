import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/common/PrivateRoute";
import Layout from "./components/layout/Layout";

// El armazón se carga de entrada: es lo primero que ve cualquiera al abrir.
import Login from "./pages/auth/Login/Login";
import NotFound from "./pages/NotFound";

// El resto de las pantallas se cargan al entrar a su ruta. Antes las 22 páginas
// viajaban en el bundle inicial, así que abrir el login descargaba también el
// inventario, los reportes y todo lo demás.
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Sales = lazy(() => import("./pages/dashboard/Sales"));
const Rentals = lazy(() => import("./pages/dashboard/Rentals"));
const Compras = lazy(() => import("./pages/compras/Compras"));
const Inventario = lazy(() => import("./pages/inventario/Inventario"));
const UsersPage = lazy(() => import("./pages/users/UsersPage"));
const MovementsPage = lazy(() => import("./pages/movements/MovementsPage"));
const CajasPage = lazy(() => import("./pages/cajas/CajasPage"));
const TiposGastoPage = lazy(() => import("./pages/tipogasto/TiposGastoPage"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const AperturaCierreCajaPage = lazy(
  () => import("./pages/cajas/AperturaCierreCajaPage")
);
const LocalesPage = lazy(() => import("./pages/locales/LocalesPage"));
const AlmacenesPage = lazy(() => import("./pages/almacenes/AlmacenesPage"));
const CombosPage = lazy(() => import("./pages/combos/CombosPage"));
const PerfilesPage = lazy(() => import("./pages/perfiles/PerfilesPage"));
const MenusPage = lazy(() => import("./pages/menus/MenusPage"));
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
const VentasPage = lazy(() => import("./pages/ventas/VentasPage"));
const ComprasPage = lazy(() => import("./pages/compras/ComprasPage"));
const CreditoPagosPage = lazy(() => import("./pages/ventas/CreditoPagosPage"));
const ReportesPage = lazy(() => import("./pages/dashboard/ReportesPage"));
const FacturasPage = lazy(() => import("./pages/facturas/FacturasPage"));
const TiposPrendaPage = lazy(() => import("./pages/tipoprenda/TiposPrendaPage"));
const AlquileresPage = lazy(() => import("./pages/alquileres/AlquileresPage"));

/** Se muestra mientras se descarga el código de una pantalla. */
function CargandoPantalla() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500"
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 animate-spin motion-reduce:animate-none"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        />
      </svg>
      <span className="text-sm">Cargando…</span>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<CargandoPantalla />}>
          <Routes>
            {/* Redirige la raíz / a /login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Rutas sin Layout (Sales, Compras e Inventario) */}
            <Route
              path="/ventas"
              element={
                <PrivateRoute>
                  <Sales />
                </PrivateRoute>
              }
            />
            <Route
              path="/alquileres-venta"
              element={
                <PrivateRoute>
                  <Rentals />
                </PrivateRoute>
              }
            />
            <Route
              path="/compras"
              element={
                <PrivateRoute>
                  <Compras />
                </PrivateRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <PrivateRoute>
                  <Inventario />
                </PrivateRoute>
              }
            />

            {/* Rutas privadas (con Layout que incluye Navbar) */}
            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Agrega aquí más rutas protegidas */}
              <Route path="/users" element={<UsersPage />} />
              <Route path="/movements/summary" element={<MovementsPage />} />
              <Route path="/movements/cajas" element={<CajasPage />} />
              <Route path="/movements/tiposgasto" element={<TiposGastoPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route
                path="/apertura-cierre-caja"
                element={<AperturaCierreCajaPage />}
              />
              <Route path="/locales" element={<LocalesPage />} />
              <Route path="/almacenes" element={<AlmacenesPage />} />
              <Route path="/combos" element={<CombosPage />} />
              <Route path="/perfiles" element={<PerfilesPage />} />
              <Route path="/menus" element={<MenusPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/modifications/ventas" element={<VentasPage />} />
              <Route path="/modifications/compras" element={<ComprasPage />} />
              <Route path="/credito-pagos" element={<CreditoPagosPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
              <Route path="/facturas" element={<FacturasPage />} />
              <Route path="/tipoprenda" element={<TiposPrendaPage />} />
              <Route path="/alquileres" element={<AlquileresPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
