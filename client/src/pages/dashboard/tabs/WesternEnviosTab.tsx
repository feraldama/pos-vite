import { useState } from "react";

export default function DevolucionesTab() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-red-800 mb-2">
          Módulo de Devoluciones
        </h2>
        <p className="text-red-700">
          Gestiona todas las devoluciones de productos, reembolsos y ajustes de
          inventario.
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar por cliente, factura o producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        <button className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
          Buscar
        </button>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Resumen */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Resumen de Devoluciones
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total del Mes:</span>
              <span className="font-bold text-red-600">Gs. 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Devoluciones del Día:</span>
              <span className="font-bold text-orange-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Productos Devueltos:</span>
              <span className="font-bold text-blue-600">0</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Acciones Rápidas */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
              Nueva Devolución
            </button>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              Procesar Reembolso
            </button>
            <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
              Generar Reporte
            </button>
          </div>
        </div>

        {/* Tarjeta de Tipos */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Tipos de Devolución
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Defectuoso:</span>
              <span className="font-bold text-red-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cambio de Talla:</span>
              <span className="font-bold text-blue-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Arrepentimiento:</span>
              <span className="font-bold text-orange-600">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Devoluciones Recientes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Devoluciones Recientes
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🔄</div>
            <p>No hay devoluciones registradas para mostrar</p>
            <p className="text-sm">
              Las devoluciones realizadas aparecerán aquí
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de Nueva Devolución */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Registrar Nueva Devolución
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente
            </label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Factura
            </label>
            <input
              type="text"
              placeholder="Número de factura original"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producto
            </label>
            <input
              type="text"
              placeholder="Nombre del producto a devolver"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad
            </label>
            <input
              type="number"
              placeholder="0"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent">
              <option>Seleccionar motivo</option>
              <option>Producto defectuoso</option>
              <option>Cambio de talla</option>
              <option>Arrepentimiento del cliente</option>
              <option>Error en la venta</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Devolución
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-6">
          <button className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
            Registrar Devolución
          </button>
        </div>
      </div>
    </div>
  );
}
