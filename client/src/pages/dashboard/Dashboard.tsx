import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { getSuscripcionesProximasAVencer } from "../../services/suscripciones.service";
import { createPago } from "../../services/pagos.service";
import CrearPagoModal from "../../components/pagos/CrearPagoModal";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import Swal from "sweetalert2";

interface Suscripcion {
  SuscripcionId: string | number;
  ClienteId?: string | number;
  PlanId?: string | number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  PlanNombre?: string;
  PlanPrecio?: number;
  SuscripcionFechaInicio?: string;
  SuscripcionFechaFin: string;
  EstadoPago?: string;
  [key: string]: unknown;
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cajaAperturada, setCajaAperturada] = useState<boolean | null>(null);
  const [suscripcionesProximas, setSuscripcionesProximas] = useState<
    Suscripcion[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [suscripcionParaPago, setSuscripcionParaPago] =
    useState<Suscripcion | null>(null);

  const cargarSuscripcionesProximas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSuscripcionesProximasAVencer(9);
      setSuscripcionesProximas(response.data || []);
    } catch (error) {
      console.error("Error al cargar suscripciones próximas:", error);
      setSuscripcionesProximas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSuscripcionesProximas();
  }, [cargarSuscripcionesProximas]);

  useEffect(() => {
    const verificarCaja = async () => {
      if (!user?.id) return;
      try {
        const estado = await getEstadoAperturaPorUsuario(user.id);
        setCajaAperturada(
          !!(estado.cajaId && estado.aperturaId > estado.cierreId)
        );
      } catch {
        setCajaAperturada(false);
      }
    };
    verificarCaja();
  }, [user?.id]);

  const handleClickSuscripcion = (suscripcion: Suscripcion) => {
    if (!cajaAperturada) {
      Swal.fire({
        icon: "warning",
        title: "Caja no aperturada",
        text: "Debes aperturar una caja antes de crear un pago.",
        confirmButtonColor: "#2563eb",
      }).then(() => {
        navigate("/apertura-cierre-caja");
      });
      return;
    }
    setSuscripcionParaPago(suscripcion);
    setShowPagoModal(true);
  };

  const esPendiente = (s: Suscripcion) =>
    (s.EstadoPago || "PENDIENTE") === "PENDIENTE";

  const handleSubmitPago = async (
    pagoData: Record<string, unknown> | Record<string, unknown>[]
  ) => {
    try {
      const pagos = Array.isArray(pagoData) ? pagoData : [pagoData];
      let suscripcionId: string | number | undefined;

      for (let i = 0; i < pagos.length; i++) {
        const pago = pagos[i];
        const payload =
          i > 0 && suscripcionId
            ? { ...pago, SuscripcionId: suscripcionId }
            : pago;
        const response = await createPago(payload);
        const created = response?.data;
        if (created?.SuscripcionId) {
          suscripcionId = created.SuscripcionId;
        }
      }

      setShowPagoModal(false);
      setSuscripcionParaPago(null);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title:
          pagos.length > 1
            ? `${pagos.length} pagos creados exitosamente`
            : "Pago creado exitosamente",
        showConfirmButton: false,
        timer: 2000,
      });
      cargarSuscripcionesProximas();
    } catch (error) {
      const err = error as { message?: string };
      Swal.fire({
        icon: "error",
        title: "Error al crear pago",
        text: err?.message || "No se pudo crear el pago",
      });
    }
  };

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
    if (diasRestantes < 0) return "text-red-600 font-semibold";
    if (diasRestantes <= 7) return "text-red-600 font-semibold";
    if (diasRestantes <= 15) return "text-orange-600 font-semibold";
    return "text-yellow-600";
  };

  // Mostrar solo la suscripción más reciente por cliente (la que tiene la fecha de vencimiento más lejana)
  // Ordenar por fecha de vencimiento: primero las más próximas a vencer
  const suscripcionesUnicasPorCliente = useMemo(() => {
    const porCliente = new Map<string, Suscripcion>();
    for (const s of suscripcionesProximas) {
      const clienteKey = String(
        s.ClienteId ?? `${s.ClienteNombre || ""}-${s.ClienteApellido || ""}`,
      );
      const actual = porCliente.get(clienteKey);
      if (
        !actual ||
        new Date(s.SuscripcionFechaFin) > new Date(actual.SuscripcionFechaFin)
      ) {
        porCliente.set(clienteKey, s);
      }
    }
    return Array.from(porCliente.values()).sort(
      (a, b) =>
        new Date(a.SuscripcionFechaFin).getTime() -
        new Date(b.SuscripcionFechaFin).getTime(),
    );
  }, [suscripcionesProximas]);

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
        ) : suscripcionesUnicasPorCliente.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No hay suscripciones próximas a vencer (10 días) ni vencidas en
              los últimos 7 días
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
                    Fecha Inicio
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Fecha de Vencimiento
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Días Restantes
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Estado Pago
                  </th>
                </tr>
              </thead>
              <tbody>
                {suscripcionesUnicasPorCliente.map((suscripcion) => {
                  const diasRestantes = calcularDiasRestantes(
                    suscripcion.SuscripcionFechaFin,
                  );
                  const nombreCompleto = `${suscripcion.ClienteNombre || ""} ${
                    suscripcion.ClienteApellido || ""
                  }`.trim();

                  return (
                    <tr
                      key={suscripcion.SuscripcionId}
                      onClick={() => handleClickSuscripcion(suscripcion)}
                      className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {nombreCompleto || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {suscripcion.PlanNombre || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(suscripcion.SuscripcionFechaInicio || "")}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(suscripcion.SuscripcionFechaFin)}
                      </td>
                      <td
                        className={`px-4 py-3 ${getEstadoColor(diasRestantes)}`}
                      >
                        {diasRestantes < 0
                          ? diasRestantes === -1
                            ? "Vencida hace 1 día"
                            : `Vencida hace ${Math.abs(diasRestantes)} días`
                          : diasRestantes === 0
                            ? "Vence hoy"
                            : diasRestantes === 1
                              ? "1 día"
                              : `${diasRestantes} días`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            (suscripcion.EstadoPago || "PENDIENTE") === "PAGADA"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {suscripcion.EstadoPago || "PENDIENTE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <CrearPagoModal
        show={showPagoModal}
        onClose={() => {
          setShowPagoModal(false);
          setSuscripcionParaPago(null);
        }}
        onSubmit={handleSubmitPago}
        initialSuscripcion={suscripcionParaPago}
        modoInicial={
          suscripcionParaPago && esPendiente(suscripcionParaPago)
            ? "existente"
            : "nueva"
        }
      />
    </main>
  );
}

export default Dashboard;
