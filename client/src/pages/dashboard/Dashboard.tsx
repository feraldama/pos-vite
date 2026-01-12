import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/useAuth";
import {
  getAlquileresProximosEntrega,
  getAlquileresProximosDevolucion,
  updateAlquiler,
  getAlquilerById,
} from "../../services/alquiler.service";
import { formatCurrency } from "../../utils/utils";
import Swal from "sweetalert2";

interface AlquilerPrenda {
  ProductoNombre: string;
  ProductoCodigo: string;
  TipoPrendaNombre: string;
  AlquilerPrendasPrecio: number;
  ProductoImagen?: string;
}

interface Alquiler {
  AlquilerId: number;
  ClienteId: number;
  AlquilerFechaAlquiler: string;
  AlquilerFechaEntrega?: string;
  AlquilerFechaDevolucion?: string;
  AlquilerEstado: string;
  AlquilerTotal: number;
  AlquilerEntrega: number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  ClienteTelefono?: string;
  prendas: AlquilerPrenda[];
}

function Dashboard() {
  const { user } = useAuth();
  const [alquileresEntrega, setAlquileresEntrega] = useState<Alquiler[]>([]);
  const [alquileresDevolucion, setAlquileresDevolucion] = useState<Alquiler[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAlquiler, setCurrentAlquiler] = useState<Alquiler | null>(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [entregaRes, devolucionRes] = await Promise.all([
          getAlquileresProximosEntrega(7),
          getAlquileresProximosDevolucion(7),
        ]);
        setAlquileresEntrega(entregaRes.data || []);
        setAlquileresDevolucion(devolucionRes.data || []);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const formatearFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-PY");
  };

  const handleAlquilerClick = async (alquiler: Alquiler) => {
    try {
      // Obtener el alquiler completo con todos los datos
      const alquilerCompleto = await getAlquilerById(alquiler.AlquilerId);
      // El servicio puede devolver el objeto directamente o dentro de data
      const alquilerData =
        (alquilerCompleto as { data?: Alquiler }).data || alquilerCompleto;
      setCurrentAlquiler(alquilerData as Alquiler);
      setEstadoSeleccionado(
        (alquilerData as Alquiler).AlquilerEstado || "Pendiente"
      );
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error al cargar alquiler:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el alquiler",
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAlquiler(null);
    setEstadoSeleccionado("");
  };

  const handleUpdateEstado = async () => {
    if (!currentAlquiler) return;

    try {
      await updateAlquiler(currentAlquiler.AlquilerId, {
        ClienteId: currentAlquiler.ClienteId,
        AlquilerFechaAlquiler: currentAlquiler.AlquilerFechaAlquiler,
        AlquilerFechaEntrega: currentAlquiler.AlquilerFechaEntrega,
        AlquilerFechaDevolucion: currentAlquiler.AlquilerFechaDevolucion,
        AlquilerEstado: estadoSeleccionado,
        AlquilerTotal: currentAlquiler.AlquilerTotal,
        AlquilerEntrega: currentAlquiler.AlquilerEntrega,
      });

      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Estado del alquiler actualizado correctamente",
        timer: 2000,
        showConfirmButton: false,
      });

      handleCloseModal();
      // Recargar los datos
      const [entregaRes, devolucionRes] = await Promise.all([
        getAlquileresProximosEntrega(7),
        getAlquileresProximosDevolucion(7),
      ]);
      setAlquileresEntrega(entregaRes.data || []);
      setAlquileresDevolucion(devolucionRes.data || []);
    } catch (error) {
      console.error("Error al actualizar alquiler:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo actualizar el estado del alquiler",
      });
    }
  };

  return (
    <main className="py-6 px-6 space-y-12 bg-gray-100 w-full">
      {/* Sección de Bienvenida */}
      {user && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-blue-600">
              Bienvenido, {user.nombre}
            </h2>
            <p className="text-gray-600 mt-1">
              Este es tu panel de administración
            </p>
          </div>
        </section>
      )}

      {/* Sección de Alquileres Próximos a Entrega */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Alquileres Próximos a Entrega (Próximos 7 días)
        </h2>
        {loading ? (
          <p className="text-gray-600">Cargando...</p>
        ) : alquileresEntrega.length === 0 ? (
          <p className="text-gray-600">No hay alquileres próximos a entrega</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alquiler ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Entrega
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prendas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entrega
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alquileresEntrega.map((alquiler) => (
                  <tr
                    key={alquiler.AlquilerId}
                    onClick={() => handleAlquilerClick(alquiler)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alquiler.AlquilerId}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alquiler.ClienteNombre} {alquiler.ClienteApellido}
                      {alquiler.ClienteTelefono && (
                        <span className="block text-xs text-gray-500">
                          {alquiler.ClienteTelefono}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatearFecha(alquiler.AlquilerFechaEntrega)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Estado:{" "}
                        <span className="font-semibold">
                          {alquiler.AlquilerEstado}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-2">
                        {alquiler.prendas.map((prenda, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 border rounded p-2 bg-gray-50"
                          >
                            {prenda.ProductoImagen ? (
                              <img
                                src={`data:image/jpeg;base64,${prenda.ProductoImagen}`}
                                alt={prenda.ProductoNombre}
                                className="w-16 h-16 object-contain rounded"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                Sin imagen
                              </div>
                            )}
                            <div className="text-xs">
                              <div className="font-medium">
                                {prenda.ProductoNombre}
                              </div>
                              <div className="text-gray-500">
                                {prenda.TipoPrendaNombre}
                              </div>
                              {prenda.ProductoCodigo && (
                                <div className="text-gray-400">
                                  {prenda.ProductoCodigo}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(alquiler.AlquilerTotal)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(alquiler.AlquilerEntrega || 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(
                        (alquiler.AlquilerTotal || 0) -
                          (alquiler.AlquilerEntrega || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sección de Alquileres Próximos a Devolución */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Alquileres Próximos a Devolución (Próximos 7 días)
        </h2>
        {loading ? (
          <p className="text-gray-600">Cargando...</p>
        ) : alquileresDevolucion.length === 0 ? (
          <p className="text-gray-600">
            No hay alquileres próximos a devolución
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alquiler ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Devolución
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prendas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entrega
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alquileresDevolucion.map((alquiler) => (
                  <tr
                    key={alquiler.AlquilerId}
                    onClick={() => handleAlquilerClick(alquiler)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alquiler.AlquilerId}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alquiler.ClienteNombre} {alquiler.ClienteApellido}
                      {alquiler.ClienteTelefono && (
                        <span className="block text-xs text-gray-500">
                          {alquiler.ClienteTelefono}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {formatearFecha(alquiler.AlquilerFechaDevolucion)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Estado:{" "}
                        <span className="font-semibold">
                          {alquiler.AlquilerEstado}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-2">
                        {alquiler.prendas.map((prenda, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 border rounded p-2 bg-gray-50"
                          >
                            {prenda.ProductoImagen ? (
                              <img
                                src={`data:image/jpeg;base64,${prenda.ProductoImagen}`}
                                alt={prenda.ProductoNombre}
                                className="w-16 h-16 object-contain rounded"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                Sin imagen
                              </div>
                            )}
                            <div className="text-xs">
                              <div className="font-medium">
                                {prenda.ProductoNombre}
                              </div>
                              <div className="text-gray-500">
                                {prenda.TipoPrendaNombre}
                              </div>
                              {prenda.ProductoCodigo && (
                                <div className="text-gray-400">
                                  {prenda.ProductoCodigo}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(alquiler.AlquilerTotal)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(alquiler.AlquilerEntrega || 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(
                        (alquiler.AlquilerTotal || 0) -
                          (alquiler.AlquilerEntrega || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal para editar estado del alquiler */}
      {isModalOpen && currentAlquiler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Editar Estado del Alquiler #{currentAlquiler.AlquilerId}
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Cliente: {currentAlquiler.ClienteNombre}{" "}
                {currentAlquiler.ClienteApellido}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Estado actual:{" "}
                <span className="font-semibold">
                  {currentAlquiler.AlquilerEstado}
                </span>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Estado
              </label>
              <select
                value={estadoSeleccionado}
                onChange={(e) => setEstadoSeleccionado(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Entregado">Entregado</option>
                <option value="Devuelto">Devuelto</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateEstado}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Dashboard;
