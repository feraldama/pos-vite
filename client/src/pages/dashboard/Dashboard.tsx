import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
import { getSuscripcionesProximasAVencer } from "../../services/suscripciones.service";

interface Suscripcion {
  SuscripcionId: string | number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  PlanNombre?: string;
  SuscripcionFechaFin: string;
  [key: string]: unknown;
}

function Dashboard() {
  const { user } = useAuth();
  const [suscripcionesProximas, setSuscripcionesProximas] = useState<
    Suscripcion[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarSuscripcionesProximas = async () => {
      try {
        setLoading(true);
        // Obtener suscripciones próximas a vencer (30 días, máximo 10)
        const response = await getSuscripcionesProximasAVencer(30, 10);
        setSuscripcionesProximas(response.data || []);
      } catch (error) {
        console.error("Error al cargar suscripciones próximas:", error);
        setSuscripcionesProximas([]);
      } finally {
        setLoading(false);
      }
    };

    cargarSuscripcionesProximas();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calcularDiasRestantes = (fechaFin: string) => {
    if (!fechaFin) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(fechaFin);
    fin.setHours(0, 0, 0, 0);
    const diffTime = fin.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getEstadoColor = (diasRestantes: number) => {
    if (diasRestantes <= 7) return "text-red-600 font-semibold";
    if (diasRestantes <= 15) return "text-orange-600 font-semibold";
    return "text-yellow-600";
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

      {/* Sección de Suscripciones Próximas a Vencer */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Suscripciones Próximas a Vencer
        </h2>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Cargando suscripciones...</p>
          </div>
        ) : suscripcionesProximas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No hay suscripciones próximas a vencer en los próximos 30 días
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Plan
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Fecha de Vencimiento
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Días Restantes
                  </th>
                </tr>
              </thead>
              <tbody>
                {suscripcionesProximas.map((suscripcion) => {
                  const diasRestantes = calcularDiasRestantes(
                    suscripcion.SuscripcionFechaFin
                  );
                  const nombreCompleto = `${suscripcion.ClienteNombre || ""} ${
                    suscripcion.ClienteApellido || ""
                  }`.trim();

                  return (
                    <tr
                      key={suscripcion.SuscripcionId}
                      className="bg-white border-b hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {nombreCompleto || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {suscripcion.PlanNombre || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(suscripcion.SuscripcionFechaFin)}
                      </td>
                      <td
                        className={`px-4 py-3 ${getEstadoColor(diasRestantes)}`}
                      >
                        {diasRestantes === 0
                          ? "Vence hoy"
                          : diasRestantes === 1
                          ? "1 día"
                          : `${diasRestantes} días`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
