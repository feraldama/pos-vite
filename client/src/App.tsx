import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/auth/Login/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import PrivateRoute from "./components/common/PrivateRoute";
import Layout from "./components/layout/Layout";
import NotFound from "./pages/NotFound";
import UsersPage from "./pages/users/UsersPage";
import MovementsPage from "./pages/movements/MovementsPage";
import CajasPage from "./pages/cajas/CajasPage";
import TiposGastoPage from "./pages/tipogasto/TiposGastoPage";
import CustomersPage from "./pages/customers/CustomersPage";
import AperturaCierreCajaPage from "./pages/cajas/AperturaCierreCajaPage";
import Sales from "./pages/dashboard/Sales";
import LocalesPage from "./pages/locales/LocalesPage";
import AlmacenesPage from "./pages/almacenes/AlmacenesPage";
import CombosPage from "./pages/combos/CombosPage";
import PerfilesPage from "./pages/perfiles/PerfilesPage";
import MenusPage from "./pages/menus/MenusPage";
import ProductsPage from "./pages/products/ProductsPage";
import VentasPage from "./pages/ventas/VentasPage";
import CreditoPagosPage from "./pages/ventas/CreditoPagosPage";
import ReportesPage from "./pages/dashboard/ReportesPage";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Redirige la raíz / a /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

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
            <Route path="/movements/summary" element={<MovementsPage />} />;
            <Route path="/movements/cajas" element={<CajasPage />} />;
            <Route path="/movements/tiposgasto" element={<TiposGastoPage />} />;
            <Route path="/customers" element={<CustomersPage />} />;
            <Route
              path="/apertura-cierre-caja"
              element={<AperturaCierreCajaPage />}
            />
            <Route path="/ventas" element={<Sales />} />
            <Route path="/locales" element={<LocalesPage />} />
            <Route path="/almacenes" element={<AlmacenesPage />} />
            <Route path="/combos" element={<CombosPage />} />
            <Route path="/perfiles" element={<PerfilesPage />} />
            <Route path="/menus" element={<MenusPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/modifications/ventas" element={<VentasPage />} />
            <Route path="/credito-pagos" element={<CreditoPagosPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
