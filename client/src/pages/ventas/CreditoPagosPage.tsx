import { useState, useEffect } from "react";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";
import { formatCurrency, formatMiles } from "../../utils/utils";
import { getVentasPendientesPorCliente } from "../../services/venta.service";

interface Cliente {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
}

interface VentaPendiente {
  VentaId: number;
  VentaFecha: string;
  Total: number;
  VentaEntrega: number;
  Saldo: number;
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
  const [ventasPendientes, setVentasPendientes] = useState<VentaPendiente[]>(
    []
  );
  const [tipoPago, setTipoPago] = useState<string>("CO");
  const [montoPago, setMontoPago] = useState<number>(0);
  const [fecha, setFecha] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [totalDeuda, setTotalDeuda] = useState<number>(0);

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
    setVentasPendientes([]);
    setTotalDeuda(0);

    if (!clienteId) {
      return;
    }

    try {
      const response = await getVentasPendientesPorCliente(Number(clienteId));
      const ventasPendientes = response.data || [];

      // Calcular el total de la deuda asegurando que los valores sean números
      const totalDeuda = ventasPendientes.reduce(
        (sum: number, venta: VentaPendiente) => sum + Number(venta.Saldo),
        0
      );

      setVentasPendientes(ventasPendientes);
      setTotalDeuda(totalDeuda);
    } catch (error) {
      console.error("Error al cargar ventas pendientes:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (montoPago <= 0) {
      alert("Ingrese un monto a cobrar");
      return;
    }
    if (montoPago > totalDeuda) {
      alert("El monto a cobrar no puede ser mayor al saldo total");
      return;
    }
    // Aquí irá la lógica para procesar el pago
    console.log({
      clienteId: selectedCliente,
      tipoPago,
      montoPago,
      fecha,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">COBRO de Créditos</h1>

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

        {/* Tabla de ventas pendientes */}
        <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venta Id
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
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
              {ventasPendientes.map((venta) => (
                <tr key={venta.VentaId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {venta.VentaId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(venta.VentaFecha).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(venta.Total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(venta.VentaEntrega)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(venta.Saldo)}
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
