import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { PlusIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import ActionButton from "../../components/common/Button/ActionButton";
import { usePermiso } from "../../hooks/usePermiso";
import { useAuth } from "../../contexts/useAuth";
import { formatMiles } from "../../utils/utils";
import { mensajeApi } from "../../services/promociones.service";
import { getTipoGastoGrupoByTipoGastoId } from "../../services/tipogastogrupo.service";
import {
  createPagoTransferencia,
  deletePagoTransferencia,
  getPagosTransferencia,
  getSugerenciasPago,
  leerComprobante,
  updatePagoTransferencia,
  verComprobante,
  MAX_COMPROBANTE_MB,
  TIPOS_COMPROBANTE,
  type ComprobanteNuevo,
  type PagoTransferencia,
  type SugerenciasPago,
} from "../../services/pagosTransferencia.service";

interface Categoria {
  TipoGastoGrupoId: number;
  TipoGastoGrupoDescripcion: string;
}

interface FormPago {
  PagoTransferenciaId?: number;
  PagoFecha: string;
  PagoMonto: string;
  PagoBeneficiario: string;
  PagoConcepto: string;
  TipoGastoGrupoId: number | "";
  PagoCuentaOrigen: string;
  PagoNumeroOperacion: string;
  /** Nombre del comprobante que ya tiene guardado ("" si no tiene) */
  comprobanteActual: string;
  /** undefined = no se toca, null = se quita */
  comprobante?: ComprobanteNuevo | null;
}

const GRUPO_CIERRE = 2;
const INPUT =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";
const LABEL = "block mb-2 text-sm font-medium text-gray-900";

const pad = (n: number) => String(n).padStart(2, "0");
const aISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aDDMMYYYY = (iso: string) => iso.split("-").reverse().join("/");
const soloDigitos = (v: string) => v.replace(/\D/g, "");

const nuevoForm = (): FormPago => ({
  PagoFecha: aISO(new Date()),
  PagoMonto: "",
  PagoBeneficiario: "",
  PagoConcepto: "",
  TipoGastoGrupoId: "",
  PagoCuentaOrigen: "",
  PagoNumeroOperacion: "",
  comprobanteActual: "",
});

export default function PagosTransferenciaPage() {
  const puedeLeer = usePermiso("PAGOS TRANSFERENCIA", "leer");
  const puedeCrear = usePermiso("PAGOS TRANSFERENCIA", "crear");
  const puedeEditar = usePermiso("PAGOS TRANSFERENCIA", "editar");
  const puedeEliminar = usePermiso("PAGOS TRANSFERENCIA", "eliminar");
  const { user } = useAuth();
  const esAdmin = user?.isAdmin === "S";

  const [desde, setDesde] = useState(() => {
    const hoy = new Date();
    return aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  });
  const [hasta, setHasta] = useState(() => aISO(new Date()));
  const [pagos, setPagos] = useState<PagoTransferencia[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sugerencias, setSugerencias] = useState<SugerenciasPago>({
    beneficiarios: [],
    cuentas: [],
  });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormPago | null>(null);
  const [guardando, setGuardando] = useState(false);

  const buscar = useCallback(async () => {
    if (desde > hasta) {
      Swal.fire("Fechas inválidas", "La fecha desde no puede ser mayor que la fecha hasta", "warning");
      return;
    }
    setLoading(true);
    try {
      setPagos(await getPagosTransferencia(desde, hasta));
    } catch (e) {
      Swal.fire("Error", mensajeApi(e, "No se pudieron cargar los pagos"), "error");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    if (!puedeLeer) return;
    buscar();
    getTipoGastoGrupoByTipoGastoId(1)
      .then((grupos: Categoria[]) =>
        setCategorias(grupos.filter((g) => g.TipoGastoGrupoId !== GRUPO_CIERRE))
      )
      .catch(() => setCategorias([]));
    getSugerenciasPago().then(setSugerencias).catch(() => undefined);
    // Solo al entrar: después se recarga con "Buscar", no con cada cambio de fecha
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeLeer]);

  const resumen = useMemo(
    () => ({
      total: pagos.reduce((acc, p) => acc + p.PagoMonto, 0),
      sinComprobante: pagos.filter((p) => !p.TieneComprobante).length,
    }),
    [pagos]
  );

  if (!puedeLeer) return <div>No tienes permiso para ver los pagos por transferencia</div>;

  const cambiar = <K extends keyof FormPago>(campo: K, valor: FormPago[K]) =>
    setForm((f) => (f ? { ...f, [campo]: valor } : f));

  const editar = (p: PagoTransferencia) =>
    setForm({
      PagoTransferenciaId: p.PagoTransferenciaId,
      PagoFecha: p.PagoFecha,
      PagoMonto: String(p.PagoMonto),
      PagoBeneficiario: p.PagoBeneficiario,
      PagoConcepto: p.PagoConcepto,
      TipoGastoGrupoId: p.TipoGastoGrupoId,
      PagoCuentaOrigen: p.PagoCuentaOrigen,
      PagoNumeroOperacion: p.PagoNumeroOperacion,
      comprobanteActual: p.TieneComprobante ? p.PagoComprobanteNombre || "comprobante" : "",
    });

  const elegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      cambiar("comprobante", await leerComprobante(archivo));
    } catch (err) {
      Swal.fire("Archivo no válido", (err as Error).message, "warning");
    }
  };

  const tendraComprobante = (f: FormPago) =>
    f.comprobante ? true : f.comprobante === null ? false : !!f.comprobanteActual;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!tendraComprobante(form)) {
      const r = await Swal.fire({
        title: "¿Guardar sin comprobante?",
        text: "Adjuntar la captura de la transferencia ayuda a saber después en qué se gastó.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Guardar igual",
        cancelButtonText: "Adjuntar comprobante",
      });
      if (!r.isConfirmed) return;
    }
    setGuardando(true);
    try {
      const datos = {
        PagoFecha: form.PagoFecha,
        PagoMonto: Number(form.PagoMonto),
        PagoBeneficiario: form.PagoBeneficiario,
        PagoConcepto: form.PagoConcepto,
        TipoGastoGrupoId: Number(form.TipoGastoGrupoId),
        PagoCuentaOrigen: form.PagoCuentaOrigen,
        PagoNumeroOperacion: form.PagoNumeroOperacion,
        comprobante: form.comprobante,
      };
      if (form.PagoTransferenciaId) {
        await updatePagoTransferencia(form.PagoTransferenciaId, datos);
      } else {
        await createPagoTransferencia(datos);
      }
      setForm(null);
      await buscar();
      getSugerenciasPago().then(setSugerencias).catch(() => undefined);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Pago guardado",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      Swal.fire("No se pudo guardar", mensajeApi(err, "Revisá los datos"), "error");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p: PagoTransferencia) => {
    const r = await Swal.fire({
      title: "¿Eliminar el pago?",
      text: `${p.PagoBeneficiario} - Gs. ${formatMiles(p.PagoMonto)} (${aDDMMYYYY(p.PagoFecha)})`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      await deletePagoTransferencia(p.PagoTransferenciaId);
      await buscar();
    } catch (err) {
      Swal.fire("No se pudo eliminar", mensajeApi(err, "Intentá de nuevo"), "error");
    }
  };

  const abrirComprobante = async (id: number) => {
    try {
      await verComprobante(id);
    } catch (err) {
      Swal.fire("No se pudo abrir", mensajeApi(err, "Intentá de nuevo"), "error");
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pagos por transferencia</h1>
          <p className="text-gray-600 text-sm mt-1">
            Cargá cada pago apenas lo hagas: a quién, en qué se gastó y la
            captura de la transferencia. Estos pagos no pasan por la caja.
          </p>
        </div>
        {puedeCrear && (
          <ActionButton label="Nuevo pago" icon={PlusIcon} onClick={() => setForm(nuevoForm())} />
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="pagos-desde" className="block text-sm font-medium text-gray-700 mb-1">
            Desde
          </label>
          <input
            id="pagos-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="pagos-hasta" className="block text-sm font-medium text-gray-700 mb-1">
            Hasta
          </label>
          <input
            id="pagos-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition disabled:opacity-50"
          onClick={buscar}
          disabled={loading}
        >
          {loading ? "Cargando…" : "Buscar"}
        </button>
        <div className="flex gap-6 ml-auto text-sm">
          <div>
            <div className="text-gray-500">Pagos</div>
            <div className="text-lg font-semibold">{pagos.length}</div>
          </div>
          <div>
            <div className="text-gray-500">Total</div>
            <div className="text-lg font-semibold font-mono">Gs. {formatMiles(resumen.total)}</div>
          </div>
          {resumen.sinComprobante > 0 && (
            <div>
              <div className="text-gray-500">Sin comprobante</div>
              <div className="text-lg font-semibold text-amber-600">{resumen.sinComprobante}</div>
            </div>
          )}
        </div>
      </div>

      {!esAdmin && (
        <p className="text-xs text-gray-500 mb-3">Se muestran solo los pagos que cargaste vos.</p>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : pagos.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          No hay pagos cargados en el período.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                <th className="text-left py-2 px-3 font-semibold">Fecha</th>
                <th className="text-left py-2 px-3 font-semibold">Beneficiario</th>
                <th className="text-left py-2 px-3 font-semibold">Concepto</th>
                <th className="text-left py-2 px-3 font-semibold">Categoría</th>
                <th className="text-left py-2 px-3 font-semibold">Cuenta / N° op.</th>
                <th className="text-right py-2 px-3 font-semibold">Monto (Gs.)</th>
                <th className="text-left py-2 px-3 font-semibold">Comprobante</th>
                {esAdmin && <th className="text-left py-2 px-3 font-semibold">Cargó</th>}
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.PagoTransferenciaId} className="border-t border-slate-200 align-top">
                  <td className="py-2 px-3 whitespace-nowrap">{aDDMMYYYY(p.PagoFecha)}</td>
                  <td className="py-2 px-3">{p.PagoBeneficiario}</td>
                  <td className="py-2 px-3 max-w-xs">{p.PagoConcepto}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {p.TipoGastoGrupoDescripcion || "-"}
                  </td>
                  <td className="py-2 px-3">
                    <div>{p.PagoCuentaOrigen || "-"}</div>
                    {p.PagoNumeroOperacion && (
                      <div className="text-xs text-gray-500">N° {p.PagoNumeroOperacion}</div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                    {formatMiles(p.PagoMonto)}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {p.TieneComprobante ? (
                      <button
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        onClick={() => abrirComprobante(p.PagoTransferenciaId)}
                      >
                        <PaperClipIcon className="h-4 w-4" /> Ver
                      </button>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        Sin comprobante
                      </span>
                    )}
                  </td>
                  {esAdmin && <td className="py-2 px-3">{p.UsuarioId}</td>}
                  <td className="py-2 px-3 whitespace-nowrap text-right">
                    {puedeEditar && (
                      <button
                        className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => editar(p)}
                      >
                        Editar
                      </button>
                    )}
                    {puedeEliminar && (
                      <button
                        className="text-sm px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 ml-1"
                        onClick={() => eliminar(p)}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setForm(null)}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <form
            onSubmit={guardar}
            className="relative z-10 bg-white rounded-lg shadow w-full max-w-2xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold">
                {form.PagoTransferenciaId ? "Editar pago" : "Nuevo pago por transferencia"}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-900 text-2xl leading-none px-2"
                onClick={() => setForm(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-6 grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="PagoFecha" className={LABEL}>
                  Fecha del pago
                </label>
                <input
                  id="PagoFecha"
                  type="date"
                  required
                  className={INPUT}
                  value={form.PagoFecha}
                  onChange={(e) => cambiar("PagoFecha", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="PagoMonto" className={LABEL}>
                  Monto (Gs.)
                </label>
                <input
                  id="PagoMonto"
                  inputMode="numeric"
                  required
                  className={`${INPUT} font-mono`}
                  placeholder="0"
                  value={form.PagoMonto ? formatMiles(Number(form.PagoMonto)) : ""}
                  onChange={(e) => cambiar("PagoMonto", soloDigitos(e.target.value))}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="PagoBeneficiario" className={LABEL}>
                  ¿A quién se le pagó?
                </label>
                <input
                  id="PagoBeneficiario"
                  list="pagos-beneficiarios"
                  required
                  maxLength={100}
                  className={INPUT}
                  placeholder="Ej.: Ferretería Central, Juan Pérez, ANDE"
                  value={form.PagoBeneficiario}
                  onChange={(e) => cambiar("PagoBeneficiario", e.target.value)}
                />
                <datalist id="pagos-beneficiarios">
                  {sugerencias.beneficiarios.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="PagoConcepto" className={LABEL}>
                  ¿En qué se gastó?
                </label>
                <textarea
                  id="PagoConcepto"
                  required
                  minLength={5}
                  maxLength={250}
                  rows={3}
                  className={INPUT}
                  placeholder="Detallá qué se compró o pagó. Ej.: 2 bidones de shampoo para autos y 1 caja de paños"
                  value={form.PagoConcepto}
                  onChange={(e) => cambiar("PagoConcepto", e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {form.PagoConcepto.length}/250
                </p>
              </div>

              <div>
                <label htmlFor="TipoGastoGrupoId" className={LABEL}>
                  Categoría
                </label>
                <select
                  id="TipoGastoGrupoId"
                  required
                  className={INPUT}
                  value={form.TipoGastoGrupoId}
                  onChange={(e) =>
                    cambiar("TipoGastoGrupoId", e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">Elegí una categoría</option>
                  {categorias.map((c) => (
                    <option key={c.TipoGastoGrupoId} value={c.TipoGastoGrupoId}>
                      {c.TipoGastoGrupoDescripcion}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="PagoCuentaOrigen" className={LABEL}>
                  Cuenta / banco de origen
                </label>
                <input
                  id="PagoCuentaOrigen"
                  list="pagos-cuentas"
                  maxLength={60}
                  className={INPUT}
                  placeholder="Ej.: Itaú cta. cte."
                  value={form.PagoCuentaOrigen}
                  onChange={(e) => cambiar("PagoCuentaOrigen", e.target.value)}
                />
                <datalist id="pagos-cuentas">
                  {sugerencias.cuentas.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="PagoNumeroOperacion" className={LABEL}>
                  N° de operación{" "}
                  <span className="font-normal text-gray-500">(opcional)</span>
                </label>
                <input
                  id="PagoNumeroOperacion"
                  maxLength={60}
                  className={INPUT}
                  value={form.PagoNumeroOperacion}
                  onChange={(e) => cambiar("PagoNumeroOperacion", e.target.value)}
                />
              </div>

              <div>
                <span className={LABEL}>Comprobante</span>
                {form.comprobante ? (
                  <div className="flex items-center gap-2 text-sm">
                    <PaperClipIcon className="h-4 w-4 text-gray-500" />
                    <span className="truncate">{form.comprobante.nombre}</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline ml-auto"
                      onClick={() => cambiar("comprobante", undefined)}
                    >
                      Quitar
                    </button>
                  </div>
                ) : form.comprobanteActual && form.comprobante !== null ? (
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate"
                      onClick={() =>
                        form.PagoTransferenciaId && abrirComprobante(form.PagoTransferenciaId)
                      }
                    >
                      <PaperClipIcon className="h-4 w-4" /> {form.comprobanteActual}
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline ml-auto"
                      onClick={() => cambiar("comprobante", null)}
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                    <PaperClipIcon className="h-4 w-4" />
                    Adjuntar captura o PDF
                    <input
                      type="file"
                      className="hidden"
                      accept={TIPOS_COMPROBANTE.join(",")}
                      onChange={elegirArchivo}
                    />
                  </label>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, WEBP o PDF, hasta {MAX_COMPROBANTE_MB} MB.
                </p>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                type="submit"
                disabled={guardando}
                className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                className="text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5"
                onClick={() => setForm(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
