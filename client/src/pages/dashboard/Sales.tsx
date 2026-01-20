import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import ActionButton from "../../components/common/Button/ActionButton";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";
import { getLocalById } from "../../services/locales.service";
import Swal from "sweetalert2";
import "../../App.css";

// Componentes de las pestañas
import PagoTab from "./tabs/PagoTab";
import WesternPagosTab from "./tabs/WesternPagosTab";
import PaseCajasTab from "./tabs/PaseCajasTab";
import CobranzaColegiosTab from "./tabs/CobranzaColegiosTab";
import EmpresasTransporteTab from "./tabs/EmpresasTransporteTab";
import DivisasTab from "./tabs/DivisasTab";
import JuntaSaneamientoTab from "./tabs/JuntaSaneamientoTab";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

export default function Sales() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pago");
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);
  const [localNombre, setLocalNombre] = useState("");

  // Configuración de las pestañas
  const tabs = [
    { id: "pago", label: "PAGO", component: PagoTab },
    {
      id: "western-pagos",
      label: "WESTERN PAGOS/ENVÍOS",
      component: WesternPagosTab,
    },
    {
      id: "pase-cajas",
      label: "PASE DE CAJAS",
      component: PaseCajasTab,
    },
    {
      id: "cobranza-colegios",
      label: "COBRANZA COLEGIOS",
      component: CobranzaColegiosTab,
    },
    {
      id: "empresas-transporte",
      label: "EMPRESAS TRANSPORTE",
      component: EmpresasTransporteTab,
    },
    { id: "divisas", label: "DIVISAS", component: DivisasTab },
    {
      id: "junta-saneamiento",
      label: "JUNTA DE SANEAMIENTO",
      component: JuntaSaneamientoTab,
    },
  ];

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || PagoTab;

  // Obtener información de caja y local
  useEffect(() => {
    const fetchCaja = async () => {
      if (!user?.id) return;
      try {
        const estado = await getEstadoAperturaPorUsuario(user.id);
        if (estado.cajaId && estado.aperturaId > estado.cierreId) {
          const caja = await getCajaById(estado.cajaId);
          setCajaAperturada(caja);
        } else {
          setCajaAperturada(null);
          // Mostrar mensaje y redirigir a apertura/cierre de caja si no hay caja aperturada
          await Swal.fire({
            icon: "warning",
            title: "Caja no aperturada",
            text: "Debes aperturar una caja antes de realizar cobros.",
            confirmButtonText: "Ir a aperturar caja",
            confirmButtonColor: "#2563eb",
          });
          navigate("/apertura-cierre-caja");
        }
      } catch {
        setCajaAperturada(null);
        // Mostrar mensaje y redirigir a apertura/cierre de caja si hay error
        await Swal.fire({
          icon: "warning",
          title: "Caja no aperturada",
          text: "Debes aperturar una caja antes de realizar cobros.",
          confirmButtonText: "Ir a aperturar caja",
          confirmButtonColor: "#2563eb",
        });
        navigate("/apertura-cierre-caja");
      }
    };
    fetchCaja();
  }, [user, navigate]);

  useEffect(() => {
    if (user?.LocalId) {
      getLocalById(user.LocalId)
        .then((data) => {
          setLocalNombre(data.LocalNombre || "");
        })
        .catch(() => setLocalNombre(""));
    } else {
      setLocalNombre("");
    }
  }, [user?.LocalId]);

  return (
    <div className="min-h-screen bg-[#f5f8ff] p-2">
      {/* Header con información del usuario */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              REGISTRAR COBROS/PAGOS
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Información de usuario, local y caja */}
            {user && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <span className="font-medium">{user.nombre}</span>
                <span className="text-gray-500">({user.id})</span>
                {localNombre && (
                  <span className="text-red-600 font-medium">
                    | Local: {localNombre}
                  </span>
                )}
                {cajaAperturada && (
                  <span className="text-blue-600 font-medium">
                    | Caja: {cajaAperturada.CajaDescripcion}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <ActionButton
                label="Apertura/Cierre Caja"
                onClick={() => navigate("/apertura-cierre-caja")}
                className="bg-blue-500 hover:bg-blue-700 text-white"
              />
              <ActionButton
                label="Configuración"
                onClick={() => navigate("/configuracion")}
                className="bg-gray-500 hover:bg-gray-700 text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas principales */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Navegación de pestañas */}
        <div className="bg-green-600 px-6 py-4">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-t-lg font-semibold text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white text-green-600 shadow-lg"
                    : "text-white hover:bg-green-500 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="p-4">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
