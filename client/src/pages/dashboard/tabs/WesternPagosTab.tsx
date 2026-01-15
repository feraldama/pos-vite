import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/useAuth";
import { getEstadoAperturaPorUsuario } from "../../../services/registrodiariocaja.service";
import { getCajaById } from "../../../services/cajas.service";
import { createRegistroDiarioCaja } from "../../../services/registros.service";
import { getTiposGasto } from "../../../services/tipogasto.service";
import { getTiposGastoGrupo } from "../../../services/tipogastogrupo.service";
import { updateCajaMonto } from "../../../services/cajas.service";
import { getCajaGastosByTipoGastoAndGrupo } from "../../../services/cajagasto.service";
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

export default function WesternPagosTab() {
  const { user } = useAuth();
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [tiposGastoGrupo, setTiposGastoGrupo] = useState<TipoGastoGrupo[]>([]);

  // Formulario Pagos (tipogastoid = 1)
  const [cajaIdPagos, setCajaIdPagos] = useState<string | number>("");
  const [fechaPagos, setFechaPagos] = useState("");
  const tipoGastoIdPagos = 1; // Fijo en 1
  const [tipoGastoGrupoIdPagos, setTipoGastoGrupoIdPagos] = useState<
    number | ""
  >("");
  const [cambioDolarPagos, setCambioDolarPagos] = useState<number | "">("");
  const [detallePagos, setDetallePagos] = useState("");
  const [mtcnPagos, setMtcnPagos] = useState<number | "">("");
  const [cargoEnvioPagos, setCargoEnvioPagos] = useState<number | "">("");
  const [montoPagos, setMontoPagos] = useState<number | "">("");

  // Formulario Envíos (tipogastoid = 2)
  const [cajaIdEnvios, setCajaIdEnvios] = useState<string | number>("");
  const [fechaEnvios, setFechaEnvios] = useState("");
  const tipoGastoIdEnvios = 2; // Fijo en 2
  const [tipoGastoGrupoIdEnvios, setTipoGastoGrupoIdEnvios] = useState<
    number | ""
  >("");
  const [cambioDolarEnvios, setCambioDolarEnvios] = useState<number | "">("");
  const [detalleEnvios, setDetalleEnvios] = useState("");
  const [mtcnEnvios, setMtcnEnvios] = useState<number | "">("");
  const [cargoEnvioEnvios, setCargoEnvioEnvios] = useState<number | "">("");
  const [montoEnvios, setMontoEnvios] = useState<number | "">("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        // Obtener caja aperturada
        const estado = await getEstadoAperturaPorUsuario(user.id);
        if (estado.cajaId && estado.aperturaId > estado.cierreId) {
          const caja = await getCajaById(estado.cajaId);
          setCajaAperturada(caja);
          setCajaIdPagos(estado.cajaId);
          setCajaIdEnvios(estado.cajaId);
        } else {
          setCajaAperturada(null);
        }

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
        const fechaInicial = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
        setFechaPagos(fechaInicial);
        setFechaEnvios(fechaInicial);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };
    fetchData();
  }, [user]);

  // Filtrar grupos: solo los que tienen "western" en TipoGastoGrupoDescripcion y coinciden con el tipoGastoId
  const gruposFiltradosPagos = tiposGastoGrupo
    .filter(
      (g) =>
        g.TipoGastoId === tipoGastoIdPagos &&
        g.TipoGastoGrupoDescripcion.toLowerCase().includes("western")
    )
    .sort((a, b) =>
      a.TipoGastoGrupoDescripcion.localeCompare(b.TipoGastoGrupoDescripcion)
    );

  const gruposFiltradosEnvios = tiposGastoGrupo
    .filter(
      (g) =>
        g.TipoGastoId === tipoGastoIdEnvios &&
        g.TipoGastoGrupoDescripcion.toLowerCase().includes("western")
    )
    .sort((a, b) =>
      a.TipoGastoGrupoDescripcion.localeCompare(b.TipoGastoGrupoDescripcion)
    );

  const handleSubmitPagos = async (e: React.FormEvent) => {
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
      // Obtener todas las cajas que tengan este TipoGastoId y TipoGastoGrupoId asignado
      const todasLasCajasConGasto = await getCajaGastosByTipoGastoAndGrupo(
        tipoGastoIdPagos,
        tipoGastoGrupoIdPagos
      );

      // Crear el registro diario de caja
      await createRegistroDiarioCaja({
        CajaId: cajaIdPagos,
        RegistroDiarioCajaFecha: fechaPagos,
        TipoGastoId: tipoGastoIdPagos,
        TipoGastoGrupoId: tipoGastoGrupoIdPagos,
        RegistroDiarioCajaDetalle: detallePagos,
        RegistroDiarioCajaMonto: montoPagos,
        UsuarioId: user.id,
        RegistroDiarioCajaCambio: cambioDolarPagos || 0,
        RegistroDiarioCajaMTCN: 0, // No se usa en Pagos
        RegistroDiarioCajaCargoEnvio: 0, // No se usa en Pagos
      });

      // Obtener IDs únicos de todas las cajas a actualizar
      const cajasIdsParaActualizar = new Set<number>();

      // Agregar todas las cajas que tengan el gasto asignado
      todasLasCajasConGasto.forEach((cajaGasto: { CajaId: number }) => {
        cajasIdsParaActualizar.add(Number(cajaGasto.CajaId));
      });

      // Agregar también la caja aperturada
      cajasIdsParaActualizar.add(Number(cajaIdPagos));

      // Actualizar el monto de todas las cajas
      if (cajasIdsParaActualizar.size > 0) {
        const montoNumero = Number(montoPagos);
        const actualizaciones = Array.from(cajasIdsParaActualizar).map(
          async (cajaIdParaActualizar: number) => {
            const cajaActual = await getCajaById(cajaIdParaActualizar);
            const cajaMontoActual = Number(cajaActual.CajaMonto);

            // tipoGastoIdPagos siempre es 1 (Egreso): restar el monto
            await updateCajaMonto(
              cajaIdParaActualizar,
              cajaMontoActual - montoNumero
            );
          }
        );

        await Promise.all(actualizaciones);
      }

      Swal.fire(
        "Pago registrado",
        "El pago fue registrado correctamente",
        "success"
      );

      // Limpiar formulario
      setTipoGastoGrupoIdPagos("");
      setCambioDolarPagos("");
      setDetallePagos("");
      setMtcnPagos("");
      setCargoEnvioPagos("");
      setMontoPagos("");

      // Resetear fecha a actual
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      const hh = String(hoy.getHours()).padStart(2, "0");
      const min = String(hoy.getMinutes()).padStart(2, "0");
      setFechaPagos(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "No se pudo registrar el pago";
      Swal.fire("Error", errorMsg, "error");
    }
  };

  const handleSubmitEnvios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaAperturada || !user) {
      Swal.fire({
        icon: "warning",
        title: "Caja no aperturada",
        text: "Debes aperturar una caja antes de realizar envíos.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    try {
      // Obtener todas las cajas que tengan este TipoGastoId y TipoGastoGrupoId asignado
      const todasLasCajasConGasto = await getCajaGastosByTipoGastoAndGrupo(
        tipoGastoIdEnvios,
        tipoGastoGrupoIdEnvios
      );

      // Crear el registro diario de caja
      await createRegistroDiarioCaja({
        CajaId: cajaIdEnvios,
        RegistroDiarioCajaFecha: fechaEnvios,
        TipoGastoId: tipoGastoIdEnvios,
        TipoGastoGrupoId: tipoGastoGrupoIdEnvios,
        RegistroDiarioCajaDetalle: detalleEnvios,
        RegistroDiarioCajaMonto: montoEnvios,
        UsuarioId: user.id,
        RegistroDiarioCajaCambio: cambioDolarEnvios || 0,
        RegistroDiarioCajaMTCN: mtcnEnvios || 0,
        RegistroDiarioCajaCargoEnvio: cargoEnvioEnvios || 0,
      });

      // Obtener IDs únicos de todas las cajas a actualizar
      const cajasIdsParaActualizar = new Set<number>();

      // Agregar todas las cajas que tengan el gasto asignado
      todasLasCajasConGasto.forEach((cajaGasto: { CajaId: number }) => {
        cajasIdsParaActualizar.add(Number(cajaGasto.CajaId));
      });

      // Agregar también la caja aperturada
      cajasIdsParaActualizar.add(Number(cajaIdEnvios));

      // Actualizar el monto de todas las cajas
      if (cajasIdsParaActualizar.size > 0) {
        const montoNumero = Number(montoEnvios);
        const actualizaciones = Array.from(cajasIdsParaActualizar).map(
          async (cajaIdParaActualizar: number) => {
            const cajaActual = await getCajaById(cajaIdParaActualizar);
            const cajaMontoActual = Number(cajaActual.CajaMonto);

            // tipoGastoIdEnvios siempre es 2 (Ingreso): sumar el monto
            await updateCajaMonto(
              cajaIdParaActualizar,
              cajaMontoActual + montoNumero
            );
          }
        );

        await Promise.all(actualizaciones);
      }

      Swal.fire(
        "Envío registrado",
        "El envío fue registrado correctamente",
        "success"
      );

      // Limpiar formulario
      setTipoGastoGrupoIdEnvios("");
      setCambioDolarEnvios("");
      setDetalleEnvios("");
      setMtcnEnvios("");
      setCargoEnvioEnvios("");
      setMontoEnvios("");

      // Resetear fecha a actual
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      const hh = String(hoy.getHours()).padStart(2, "0");
      const min = String(hoy.getMinutes()).padStart(2, "0");
      setFechaEnvios(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "No se pudo registrar el envío";
      Swal.fire("Error", errorMsg, "error");
    }
  };

  const handleCancelPagos = () => {
    setTipoGastoGrupoIdPagos("");
    setCambioDolarPagos("");
    setDetallePagos("");
    setMtcnPagos("");
    setCargoEnvioPagos("");
    setMontoPagos("");
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    const hh = String(hoy.getHours()).padStart(2, "0");
    const min = String(hoy.getMinutes()).padStart(2, "0");
    setFechaPagos(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  const handleCancelEnvios = () => {
    setTipoGastoGrupoIdEnvios("");
    setCambioDolarEnvios("");
    setDetalleEnvios("");
    setMtcnEnvios("");
    setCargoEnvioEnvios("");
    setMontoEnvios("");
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    const hh = String(hoy.getHours()).padStart(2, "0");
    const min = String(hoy.getMinutes()).padStart(2, "0");
    setFechaEnvios(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  const renderForm = (
    titulo: string,
    fecha: string,
    setFecha: (value: string) => void,
    tipoGastoId: number,
    tipoGastoGrupoId: number | "",
    setTipoGastoGrupoId: (value: number | "") => void,
    cambioDolar: number | "",
    setCambioDolar: (value: number | "") => void,
    detalle: string,
    setDetalle: (value: string) => void,
    mtcn: number | "",
    setMtcn: (value: number | "") => void,
    cargoEnvio: number | "",
    setCargoEnvio: (value: number | "") => void,
    monto: number | "",
    setMonto: (value: number | "") => void,
    gruposFiltrados: TipoGastoGrupo[],
    onSubmit: (e: React.FormEvent) => void,
    onCancel: () => void,
    mostrarMTCNYCargoEnvio: boolean = true
  ) => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-green-800 mb-6 border-b-2 border-green-500 pb-2">
        {titulo.toUpperCase()}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Gasto - Solo lectura ya que está fijo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gasto
            </label>
            <input
              type="text"
              value={
                tiposGasto.find((tg) => tg.TipoGastoId === tipoGastoId)
                  ?.TipoGastoDescripcion || ""
              }
              readOnly
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

          {/* MTCN - Solo para Envíos */}
          {mostrarMTCNYCargoEnvio && (
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
          )}

          {/* Cargo Envio - Solo para Envíos */}
          {mostrarMTCNYCargoEnvio && (
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
          )}

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
              value={user?.id || ""}
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
            onClick={onCancel}
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
  );

  return (
    <div className="space-y-6">
      {/* Formularios de Pagos y Envíos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda - Pagos */}
        <div>
          {renderForm(
            "Western Pagos",
            fechaPagos,
            setFechaPagos,
            tipoGastoIdPagos,
            tipoGastoGrupoIdPagos,
            setTipoGastoGrupoIdPagos,
            cambioDolarPagos,
            setCambioDolarPagos,
            detallePagos,
            setDetallePagos,
            mtcnPagos,
            setMtcnPagos,
            cargoEnvioPagos,
            setCargoEnvioPagos,
            montoPagos,
            setMontoPagos,
            gruposFiltradosPagos,
            handleSubmitPagos,
            handleCancelPagos,
            false // No mostrar MTCN y Cargo Envío para Pagos
          )}
        </div>

        {/* Columna Derecha - Envíos */}
        <div>
          {renderForm(
            "Western Envíos",
            fechaEnvios,
            setFechaEnvios,
            tipoGastoIdEnvios,
            tipoGastoGrupoIdEnvios,
            setTipoGastoGrupoIdEnvios,
            cambioDolarEnvios,
            setCambioDolarEnvios,
            detalleEnvios,
            setDetalleEnvios,
            mtcnEnvios,
            setMtcnEnvios,
            cargoEnvioEnvios,
            setCargoEnvioEnvios,
            montoEnvios,
            setMontoEnvios,
            gruposFiltradosEnvios,
            handleSubmitEnvios,
            handleCancelEnvios,
            true // Mostrar MTCN y Cargo Envío para Envíos
          )}
        </div>
      </div>
    </div>
  );
}
