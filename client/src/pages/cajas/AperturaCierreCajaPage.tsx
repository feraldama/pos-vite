import { useEffect, useState } from "react";
import { getCajas } from "../../services/cajas.service";
import ActionButton from "../../components/common/Button/ActionButton";
import {
  aperturaCierreCaja,
  getEstadoAperturaPorUsuario,
} from "../../services/registrodiariocaja.service";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";
import { formatMiles } from "../../utils/utils";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  CajaGastoCantidad: number;
}

export default function AperturaCierreCajaPage() {
  const [tipo, setTipo] = useState<"0" | "1">("0");
  const [tipoDisabled, setTipoDisabled] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaId, setCajaId] = useState<string | number>("");
  const [monto, setMonto] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

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

  useEffect(() => {
    // Lógica para detectar si el usuario tiene una caja aperturada
    const checkCajaAperturada = async () => {
      if (!user) return;
      try {
        const data = await getEstadoAperturaPorUsuario(user.id);
        // Si apertura > cierre, forzar cierre y deshabilitar el select
        if (data.aperturaId > data.cierreId) {
          setTipo("1"); // Cierre
          setTipoDisabled(true);
          if (data.cajaId) setCajaId(data.cajaId);
        } else {
          setTipo("0");
          setTipoDisabled(false);
        }
      } catch {
        // Si hay error, no forzar nada
      }
    };
    checkCajaAperturada();
  }, [user]);

  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: "warning",
        title: "Aviso",
        text: error,
        confirmButtonColor: "#2563eb",
      });
      setError(null);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await aperturaCierreCaja({
        apertura: tipo === "0" ? 0 : 1,
        CajaId: cajaId,
        Monto: monto,
      });
      setSuccess(result.message || "Operación realizada correctamente");
    } catch (err) {
      setError(
        (err as { message?: string })?.message || "Error en la operación"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Cargando cajas...</div>;

  return (
    <div className="container mx-auto px-4 max-w-xl">
      <h1 className="text-2xl font-medium mb-6">Apertura/Cierre de Caja</h1>
      {user && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-gray-700">
          <span className="font-semibold">Usuario:</span> {user.nombre} (
          {user.id})
          {tipoDisabled && cajaId && (
            <span className="ml-2 text-sm text-gray-600">
              | Caja:{" "}
              {cajas.find((c) => c.CajaId == cajaId)?.CajaDescripcion || ""}
            </span>
          )}
        </div>
      )}
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
              className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${
                tipoDisabled ? "bg-gray-200 text-gray-500" : ""
              }`}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "0" | "1")}
              required
              disabled={tipoDisabled}
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
              className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${
                tipoDisabled ? "bg-gray-200 text-gray-500" : ""
              }`}
              value={cajaId}
              onChange={(e) => setCajaId(e.target.value)}
              required
              disabled={tipoDisabled}
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
              type="text"
              inputMode="numeric"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              value={monto ? formatMiles(monto) : ""}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/\./g, "")
                  .replace(/\s/g, "");
                const num = Number(raw);
                if (!isNaN(num)) setMonto(num);
              }}
              min={0}
              required
            />
          </div>
        </div>
        <div className="flex justify-end">
          <ActionButton
            onClick={handleSubmit}
            label="CONFIRMAR"
            disabled={submitting}
          />
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
