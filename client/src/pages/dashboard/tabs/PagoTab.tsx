import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/useAuth";
import PagoModal from "../../../components/common/PagoModal";
import { getEstadoAperturaPorUsuario } from "../../../services/registrodiariocaja.service";
import { getCajaById } from "../../../services/cajas.service";
import Swal from "sweetalert2";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

export default function PagosTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showPagoModal, setShowPagoModal] = useState(false);
  const { user } = useAuth();
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);

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
        }
      } catch {
        setCajaAperturada(null);
      }
    };
    fetchCaja();
  }, [user]);

  const handleOpenPagoModal = () => {
    if (!cajaAperturada) {
      Swal.fire({
        icon: "warning",
        title: "Caja no aperturada",
        text: "Debes aperturar una caja antes de realizar pagos.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }
    setShowPagoModal(true);
  };

  const handleClosePagoModal = () => {
    setShowPagoModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-green-800 mb-2">
          Módulo de Pagos
        </h2>
        <p className="text-green-700">
          Gestiona todos los pagos a proveedores, gastos operativos y otros
          desembolsos del negocio.
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar por proveedor, concepto o número de factura..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <button className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
          Buscar
        </button>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Resumen */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Resumen de Pagos
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total del Mes:</span>
              <span className="font-bold text-red-600">Gs. 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pagos del Día:</span>
              <span className="font-bold text-green-600">Gs. 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pendientes:</span>
              <span className="font-bold text-orange-600">Gs. 0</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Acciones Rápidas */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleOpenPagoModal}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Nuevo Pago
            </button>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              Registrar Gasto
            </button>
            <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
              Generar Reporte
            </button>
          </div>
        </div>

        {/* Tarjeta de Categorías */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Categorías de Gasto
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Proveedores:</span>
              <span className="font-bold text-blue-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Operativos:</span>
              <span className="font-bold text-green-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Administrativos:</span>
              <span className="font-bold text-purple-600">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Pagos Recientes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Pagos Recientes
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💳</div>
            <p>No hay pagos registrados para mostrar</p>
            <p className="text-sm">Los pagos realizados aparecerán aquí</p>
          </div>
        </div>
      </div>

      {/* Modal de Pago */}
      <PagoModal
        show={showPagoModal}
        handleClose={handleClosePagoModal}
        cajaAperturada={cajaAperturada}
        usuario={user}
      />
    </div>
  );
}
