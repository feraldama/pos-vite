import { useState } from "react";

export default function PresupuestosTab() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-purple-800 mb-2">
          Módulo de Presupuestos
        </h2>
        <p className="text-purple-700">
          Crea y gestiona presupuestos para clientes, cotizaciones y propuestas
          comerciales.
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar por cliente, número de presupuesto o producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
          Buscar
        </button>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Resumen */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Resumen de Presupuestos
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total del Mes:</span>
              <span className="font-bold text-purple-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pendientes:</span>
              <span className="font-bold text-orange-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Aprobados:</span>
              <span className="font-bold text-green-600">0</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Acciones Rápidas */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Acciones Rápidas
          </h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
              Nuevo Presupuesto
            </button>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              Convertir a Venta
            </button>
            <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
              Generar PDF
            </button>
          </div>
        </div>

        {/* Tarjeta de Estados */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Estados de Presupuestos
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Borrador:</span>
              <span className="font-bold text-gray-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Enviado:</span>
              <span className="font-bold text-blue-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Aprobado:</span>
              <span className="font-bold text-green-600">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Presupuestos Recientes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Presupuestos Recientes
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">📋</div>
            <p>No hay presupuestos registrados para mostrar</p>
            <p className="text-sm">Los presupuestos creados aparecerán aquí</p>
          </div>
        </div>
      </div>

      {/* Formulario de Nuevo Presupuesto */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Crear Nuevo Presupuesto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente
            </label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Válido por (días)
            </label>
            <input
              type="number"
              placeholder="30"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condiciones de Pago
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option>Seleccionar condiciones</option>
              <option>Contado</option>
              <option>30 días</option>
              <option>60 días</option>
              <option>90 días</option>
              <option>Personalizado</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              placeholder="Observaciones adicionales del presupuesto..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sección de Productos */}
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3">
            Productos del Presupuesto
          </h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-center text-gray-500 py-4">
              <div className="text-2xl mb-2">➕</div>
              <p>Agregar productos al presupuesto</p>
              <button className="mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
                Agregar Producto
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
            Crear Presupuesto
          </button>
          <button className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
            Guardar Borrador
          </button>
        </div>
      </div>
    </div>
  );
}
