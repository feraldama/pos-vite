import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/useAuth";
import { getEstadoAperturaPorUsuario } from "../../../services/registrodiariocaja.service";
import { getCajaById, getCajas } from "../../../services/cajas.service";
import { createRegistroDiarioCaja } from "../../../services/registros.service";
import { getTiposGasto } from "../../../services/tipogasto.service";
import { getTiposGastoGrupo } from "../../../services/tipogastogrupo.service";
import { updateCajaMonto } from "../../../services/cajas.service";
import Swal from "sweetalert2";
import { formatMiles } from "../../../utils/utils";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

interface TipoGasto {
  TipoGastoId: number;
  TipoGastoDescripcion: string;
}

interface TipoGastoGrupo {
  TipoGastoGrupoId: number;
  TipoGastoGrupoDescripcion: string;
  TipoGastoId: number;
}

export default function PagosTab() {
  const { user } = useAuth();
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [tiposGastoGrupo, setTiposGastoGrupo] = useState<TipoGastoGrupo[]>([]);

  // Formulario
  const [cajaId, setCajaId] = useState<string | number>("");
  const [fecha, setFecha] = useState("");
  const [tipoGastoId, setTipoGastoId] = useState<number | "">("");
  const [tipoGastoGrupoId, setTipoGastoGrupoId] = useState<number | "">("");
  const [cambioDolar, setCambioDolar] = useState<number | "">("");
  const [detalle, setDetalle] = useState("");
  const [mtcn, setMtcn] = useState<number | "">("");
  const [cargoEnvio, setCargoEnvio] = useState<number | "">("");
  const [monto, setMonto] = useState<number | "">("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        // Obtener caja aperturada
        const estado = await getEstadoAperturaPorUsuario(user.id);
        if (estado.cajaId && estado.aperturaId > estado.cierreId) {
          const caja = await getCajaById(estado.cajaId);
          setCajaAperturada(caja);
          setCajaId(estado.cajaId);
        } else {
          setCajaAperturada(null);
        }

        // Obtener todas las cajas
        const cajasData = await getCajas(1, 1000);
        setCajas(cajasData.data);

        // Obtener tipos de gasto y grupos
        const tiposGastoData = await getTiposGasto();
        setTiposGasto(tiposGastoData);
        const tiposGastoGrupoData = await getTiposGastoGrupo();
        setTiposGastoGrupo(tiposGastoGrupoData);

        // Inicializar fecha actual
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, "0");
        const dd = String(hoy.getDate()).padStart(2, "0");
        const hh = String(hoy.getHours()).padStart(2, "0");
        const min = String(hoy.getMinutes()).padStart(2, "0");
        setFecha(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };
    fetchData();
  }, [user]);

  const gruposFiltrados = tiposGastoGrupo.filter(
    (g) => g.TipoGastoId === tipoGastoId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaAperturada || !user) {
      Swal.fire({
        icon: "warning",
        title: "Caja no aperturada",
        text: "Debes aperturar una caja antes de realizar pagos.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    try {
      await createRegistroDiarioCaja({
        CajaId: cajaId,
        RegistroDiarioCajaFecha: fecha,
        TipoGastoId: tipoGastoId,
        TipoGastoGrupoId: tipoGastoGrupoId,
        RegistroDiarioCajaDetalle: detalle,
        RegistroDiarioCajaMonto: monto,
        UsuarioId: user.id,
        RegistroDiarioCajaCambio: cambioDolar || 0,
        RegistroDiarioCajaMTCN: mtcn || 0,
        RegistroDiarioCajaCargoEnvio: cargoEnvio || 0,
      });

      // Actualizar monto de la caja
      const estado = await getEstadoAperturaPorUsuario(user.id);
      const cajaAperturadaId = estado.cajaId;
      const cajaActualizada = await getCajaById(cajaAperturadaId);
      const cajaMontoActual = cajaActualizada.CajaMonto;
      if (tipoGastoId === 1) {
        // Restar el monto
        await updateCajaMonto(
          cajaAperturadaId,
          Number(cajaMontoActual) - Number(monto)
        );
      } else if (tipoGastoId === 2) {
        // Sumar el monto
        await updateCajaMonto(
          cajaAperturadaId,
          Number(cajaMontoActual) + Number(monto)
        );
      }

      Swal.fire(
        "Pago registrado",
        "El pago fue registrado correctamente",
        "success"
      );

      // Limpiar formulario
      setTipoGastoId("");
      setTipoGastoGrupoId("");
      setCambioDolar("");
      setDetalle("");
      setMtcn("");
      setCargoEnvio("");
      setMonto("");

      // Resetear fecha a actual
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      const hh = String(hoy.getHours()).padStart(2, "0");
      const min = String(hoy.getMinutes()).padStart(2, "0");
      setFecha(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "No se pudo registrar el pago";
      Swal.fire("Error", errorMsg, "error");
    }
  };

  const handleCancel = () => {
    setTipoGastoId("");
    setTipoGastoGrupoId("");
    setCambioDolar("");
    setDetalle("");
    setMtcn("");
    setCargoEnvio("");
    setMonto("");
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    const hh = String(hoy.getHours()).padStart(2, "0");
    const min = String(hoy.getMinutes()).padStart(2, "0");
    setFecha(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-green-800 mb-6 border-b-2 border-green-500 pb-2">
          REGISTRO DIARIO CAJA
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Caja */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caja
              </label>
              <select
                value={cajaId}
                onChange={(e) => setCajaId(e.target.value)}
                required
                disabled={!!cajaAperturada}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccione una caja</option>
                {cajas.map((caja) => (
                  <option key={caja.CajaId} value={caja.CajaId}>
                    {caja.CajaDescripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Gasto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gasto
              </label>
              <select
                value={tipoGastoId}
                onChange={(e) => {
                  setTipoGastoId(Number(e.target.value));
                  setTipoGastoGrupoId(""); // Reset grupo cuando cambia gasto
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccione...</option>
                {tiposGasto.map((tg) => (
                  <option key={tg.TipoGastoId} value={tg.TipoGastoId}>
                    {tg.TipoGastoDescripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* Grupo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grupo
              </label>
              <select
                value={tipoGastoGrupoId}
                onChange={(e) => setTipoGastoGrupoId(Number(e.target.value))}
                required
                disabled={!tipoGastoId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Seleccione...</option>
                {gruposFiltrados.map((gg) => (
                  <option key={gg.TipoGastoGrupoId} value={gg.TipoGastoGrupoId}>
                    {gg.TipoGastoGrupoDescripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* Cambio Dolar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cambio Dolar
              </label>
              <input
                type="number"
                step="0.01"
                value={cambioDolar}
                onChange={(e) =>
                  setCambioDolar(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* MTCN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MTCN
              </label>
              <input
                type="number"
                value={mtcn}
                onChange={(e) =>
                  setMtcn(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Cargo Envio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo Envio
              </label>
              <input
                type="text"
                value={cargoEnvio !== "" ? formatMiles(cargoEnvio) : ""}
                onChange={(e) => {
                  const raw = e.target.value
                    .replace(/\./g, "")
                    .replace(/,/g, ".");
                  const num = Number(raw);
                  setCargoEnvio(isNaN(num) ? "" : num);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                inputMode="numeric"
              />
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto
              </label>
              <input
                type="text"
                value={monto !== "" ? formatMiles(monto) : ""}
                onChange={(e) => {
                  const raw = e.target.value
                    .replace(/\./g, "")
                    .replace(/,/g, ".");
                  const num = Number(raw);
                  setMonto(isNaN(num) ? "" : num);
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                inputMode="numeric"
              />
            </div>

            {/* Usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={user?.nombre || ""}
                readOnly
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          {/* Detalle - Textarea largo */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Detalle
            </label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Ingrese el detalle del registro..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
            >
              CONFIRMAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
