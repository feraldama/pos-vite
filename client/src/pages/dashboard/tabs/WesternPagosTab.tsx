import { useState } from "react";

export default function CobrosTab() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-blue-800 mb-2">
          Módulo de Cobros
        </h2>
        <p className="text-blue-700">
          Aquí podrás gestionar todos los cobros pendientes y realizar el
          seguimiento de cuentas por cobrar.
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar por cliente, factura o RUC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
          Buscar
        </button>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Resumen */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Resumen de Cobros
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Pendiente:</span>
              <span className="font-bold text-red-600">Gs. 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cobros del Día:</span>
              <span className="font-bold text-green-600">Gs. 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Clientes con Deuda:</span>
              <span className="font-bold text-orange-600">0</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Acciones Rápidas */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
              Nuevo Cobro
            </button>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              Registrar Pago
            </button>
            <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
              Generar Reporte
            </button>
          </div>
        </div>

        {/* Tarjeta de Estado */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Estado del Sistema
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Sistema Operativo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">Caja Abierta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Conexión DB OK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Cobros Pendientes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Cobros Pendientes
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">📋</div>
            <p>No hay cobros pendientes para mostrar</p>
            <p className="text-sm">Los cobros pendientes aparecerán aquí</p>
          </div>
        </div>
      </div>
    </div>
  );
}
