import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";
import { formatCurrency, formatMiles } from "../../utils/utils";
import {
  getAlquileresPendientesPorCliente,
  procesarPagoAlquileres,
} from "../../services/alquiler.service";
import { useAuth } from "../../contexts/useAuth";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";

interface Cliente {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
}

interface AlquilerPendiente {
  AlquilerId: number;
  AlquilerFechaAlquiler: string;
  AlquilerFechaEntrega?: string;
  AlquilerFechaDevolucion?: string;
  AlquilerEstado: string;
  AlquilerTotal: number;
  AlquilerEntrega: number;
  Saldo: number;
}

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

const TIPOS_PAGO = [
  { value: "CO", label: "Contado" },
  { value: "CR", label: "Crédito" },
  { value: "PO", label: "POS" },
  { value: "TR", label: "Transfer" },
];

const CreditoPagosPage = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [alquileresPendientes, setAlquileresPendientes] = useState<
    AlquilerPendiente[]
  >([]);
  const [tipoPago, setTipoPago] = useState<string>("CO");
  const [montoPago, setMontoPago] = useState<number>(0);
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [totalDeuda, setTotalDeuda] = useState<number>(0);
  const { user } = useAuth();
  const navigate = useNavigate();
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
          Swal.fire({
            icon: "warning",
            title: "Caja no aperturada",
            text: "Debes aperturar una caja antes de registrar un pago.",
            confirmButtonColor: "#2563eb",
          }).then(() => {
            navigate("/apertura-cierre-caja");
          });
          setCajaAperturada(null);
        }
      } catch {
        setCajaAperturada(null);
      }
    };
    fetchCaja();
  }, [user, navigate]);

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const response = await getAllClientesSinPaginacion();
        const todosLosClientes = response.data || [];

        // Separar el cliente con ID 1 del resto
        const clienteId1 = todosLosClientes.find(
          (c: Cliente) => c.ClienteId === 1
        );
        const otrosClientes = todosLosClientes.filter(
          (c: Cliente) => c.ClienteId !== 1
        );

        // Ordenar el resto alfabéticamente por nombre
        const clientesOrdenados = otrosClientes.sort((a: Cliente, b: Cliente) =>
          a.ClienteNombre.localeCompare(b.ClienteNombre)
        );

        // Combinar el cliente ID 1 con el resto ordenado
        const clientesFinales = clienteId1
          ? [clienteId1, ...clientesOrdenados]
          : clientesOrdenados;

        setClientes(clientesFinales);
      } catch (error) {
        console.error("Error al cargar clientes:", error);
      }
    };

    cargarClientes();
  }, []);

  const handleClienteChange = async (clienteId: string) => {
    setSelectedCliente(clienteId);
    setAlquileresPendientes([]);
    setTotalDeuda(0);

    if (!clienteId) {
      return;
    }

    try {
      const localId = user?.LocalId;
      const response = await getAlquileresPendientesPorCliente(
        Number(clienteId),
        localId
      );
      const alquileresPendientes = response.data || [];

      // Calcular el total de la deuda asegurando que los valores sean números
      const totalDeuda = alquileresPendientes.reduce(
        (sum: number, alquiler: AlquilerPendiente) =>
          sum + Number(alquiler.Saldo),
        0
      );

      setAlquileresPendientes(alquileresPendientes);
      setTotalDeuda(totalDeuda);
    } catch (error) {
      console.error("Error al cargar alquileres pendientes:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) {
      Swal.fire("Error", "Seleccione un cliente.", "error");
      return;
    }
    if (montoPago <= 0) {
      Swal.fire("Error", "Ingrese un monto a cobrar", "error");
      return;
    }
    if (montoPago > totalDeuda) {
      Swal.fire(
        "Error",
        "El monto a cobrar no puede ser mayor al saldo total",
        "error"
      );
      return;
    }
    if (!cajaAperturada) {
      Swal.fire("Error", "No hay una caja aperturada.", "error");
      return;
    }
    if (!user?.id) {
      Swal.fire("Error", "Usuario no identificado.", "error");
      return;
    }

    try {
      await procesarPagoAlquileres({
        clienteId: Number(selectedCliente),
        montoPago: montoPago,
        tipoPago: tipoPago,
        fecha: fecha,
        cajaId: cajaAperturada.CajaId,
        usuarioId: user.id,
      });

      let timerInterval: ReturnType<typeof setInterval>;
      Swal.fire({
        title: "Pago cargado con éxito!",
        html: "Actualizando en <b></b> segundos.",
        timer: 2000,
        timerProgressBar: true,
        width: "90%",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
          const popup = Swal.getPopup();
          if (popup) {
            const timer = popup.querySelector("b");
            if (timer) {
              timerInterval = setInterval(() => {
                const timerLeft = Swal.getTimerLeft();
                const secondsLeft = timerLeft ? Math.ceil(timerLeft / 1000) : 0;
                timer.textContent = `${secondsLeft}`;
              }, 100);
            }
          }
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
          handleClienteChange(selectedCliente);
          setMontoPago(0);
        }
      });
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Hubo un problema al procesar el pago.";
      Swal.fire("Error", errorMessage, "error");
    }
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Cobro de Alquileres</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulario de pago */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cliente
              </label>
              <select
                value={selectedCliente}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Seleccione un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.ClienteId} value={cliente.ClienteId}>
                    {`${cliente.ClienteNombre} ${cliente.ClienteApellido}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Pago
              </label>
              <select
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value)}
                className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                {TIPOS_PAGO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Monto a Cobrar
              </label>
              <input
                type="text"
                value={montoPago ? formatMiles(montoPago) : ""}
                onChange={(e) => {
                  const raw = e.target.value
                    .replace(/\./g, "")
                    .replace(/\s/g, "");
                  const num = Number(raw);
                  if (!isNaN(num)) setMontoPago(num);
                }}
                className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="0"
              />
            </div>

            <div className="pt-4 border-t">
              <p className="text-lg font-semibold text-gray-700">
                Total Deuda: {formatCurrency(totalDeuda)}
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              CARGAR PAGO
            </button>
          </form>
        </div>

        {/* Tabla de alquileres pendientes */}
        <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alquiler Id
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Alquiler
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entrega
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alquileresPendientes.map((alquiler) => (
                <tr key={alquiler.AlquilerId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {alquiler.AlquilerId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(
                      alquiler.AlquilerFechaAlquiler
                    ).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(alquiler.AlquilerTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(alquiler.AlquilerEntrega)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(alquiler.Saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CreditoPagosPage;
