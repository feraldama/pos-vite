import { useEffect, useState } from "react";
import { getCajas } from "../../services/cajas.service";
import ActionButton from "../../components/common/Button/ActionButton";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  CajaGastoCantidad: number;
}

export default function AperturaCierreCajaPage() {
  const [tipo, setTipo] = useState<"0" | "1">("0");
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaId, setCajaId] = useState<string | number>("");
  const [monto, setMonto] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchCajas = async () => {
      try {
        setLoading(true);
        const data = await getCajas(1, 100);
        setCajas(data.data);
        if (data.data.length > 0) setCajaId(data.data[0].CajaId);
      } catch {
        setError("Error al cargar cajas");
      } finally {
        setLoading(false);
      }
    };
    fetchCajas();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para confirmar la apertura/cierre
    setSuccess(
      `Se ha ${
        tipo === "0" ? "aperturado" : "cerrado"
      } la caja ${cajaId} con monto ${monto}`
    );
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) return <div>Cargando cajas...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4 max-w-xl">
      <h1 className="text-2xl font-medium mb-6">Apertura/Cierre de Caja</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-6"
      >
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Tipo de operación
            </label>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "0" | "1")}
              required
            >
              <option value="0">Apertura</option>
              <option value="1">Cierre</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Caja
            </label>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              value={cajaId}
              onChange={(e) => setCajaId(e.target.value)}
              required
            >
              {cajas.map((caja) => (
                <option key={caja.CajaId} value={caja.CajaId}>
                  {caja.CajaDescripcion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Monto de apertura
            </label>
            <input
              type="number"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              min={0}
              required
            />
          </div>
        </div>
        <div className="flex justify-end">
          <ActionButton label="CONFIRMAR" />
        </div>
        {success && (
          <div className="text-green-600 text-center font-medium mt-2">
            {success}
          </div>
        )}
      </form>
    </div>
  );
}
