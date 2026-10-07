import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { PlusIcon } from "@heroicons/react/24/outline";
import ActionButton from "../../components/common/Button/ActionButton";
import { usePermiso } from "../../hooks/usePermiso";
import { getProductosAll } from "../../services/productos.service";
import {
  createPromocion,
  deletePromocion,
  describirPromocion,
  getPromociones,
  mensajeApi,
  updatePromocion,
  type Promocion,
} from "../../services/promociones.service";

interface Producto {
  ProductoId: number;
  ProductoNombre: string;
  ProductoPrecioVenta: number;
}

const NUEVA: Promocion = {
  PromocionNombre: "",
  PromocionTipo: "FR",
  PromocionBeneficio: "R",
  PromocionDescuento: 0,
  PromocionCantidad: 4,
  PromocionVigenciaDias: 0,
  PromocionDiasAntes: 0,
  PromocionDiasDespues: 7,
  PromocionActiva: 1,
  PromocionMensaje: "",
  productosCuentan: [],
  productosBeneficio: [],
};

const INPUT =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";
const LABEL = "block mb-2 text-sm font-medium text-gray-900";

/** Lista de productos con casillas, para elegir cuáles cuentan o se ofrecen. */
function SelectorProductos({
  productos,
  seleccionados,
  onChange,
  idPrefijo,
}: {
  productos: Producto[];
  seleccionados: number[];
  onChange: (ids: number[]) => void;
  idPrefijo: string;
}) {
  const alternar = (id: number) =>
    onChange(
      seleccionados.includes(id)
        ? seleccionados.filter((x) => x !== id)
        : [...seleccionados, id]
    );
  return (
    <div className="border border-gray-300 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
      {productos.map((p) => {
        const id = `${idPrefijo}-${p.ProductoId}`;
        return (
          <label
            key={p.ProductoId}
            htmlFor={id}
            className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
          >
            <input
              id={id}
              type="checkbox"
              checked={seleccionados.includes(p.ProductoId)}
              onChange={() => alternar(p.ProductoId)}
              className="w-4 h-4"
            />
            <span className="flex-1">{p.ProductoNombre}</span>
            <span className="text-gray-500 font-mono">
              Gs. {Number(p.ProductoPrecioVenta || 0).toLocaleString("es-PY")}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function PromocionesPage() {
  const puedeLeer = usePermiso("PROMOCIONES", "leer");
  const puedeCrear = usePermiso("PROMOCIONES", "crear");
  const puedeEditar = usePermiso("PROMOCIONES", "editar");
  const puedeEliminar = usePermiso("PROMOCIONES", "eliminar");

  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Promocion | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setPromociones(await getPromociones());
    } catch (e) {
      Swal.fire("Error", mensajeApi(e, "No se pudieron cargar las promociones"), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!puedeLeer) return;
    cargar();
    getProductosAll().then((d) => setProductos(d.data || []));
  }, [cargar, puedeLeer]);

  const nombreProducto = useMemo(() => {
    const m = new Map(productos.map((p) => [p.ProductoId, p.ProductoNombre]));
    return (id: number) => m.get(id) || `#${id}`;
  }, [productos]);

  if (!puedeLeer) return <div>No tienes permiso para ver las promociones</div>;

  const cambiar = <K extends keyof Promocion>(campo: K, valor: Promocion[K]) =>
    setForm((f) => (f ? { ...f, [campo]: valor } : f));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setGuardando(true);
    try {
      if (form.PromocionId) await updatePromocion(form.PromocionId, form);
      else await createPromocion(form);
      setForm(null);
      await cargar();
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Promoción guardada",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      Swal.fire("No se pudo guardar", mensajeApi(err, "Revisá los datos"), "error");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p: Promocion) => {
    const r = await Swal.fire({
      title: `¿Eliminar "${p.PromocionNombre}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed || !p.PromocionId) return;
    try {
      await deletePromocion(p.PromocionId);
      await cargar();
    } catch (err) {
      Swal.fire("No se pudo eliminar", mensajeApi(err, "Intentá de nuevo"), "error");
    }
  };

  const alternarActiva = async (p: Promocion) => {
    if (!p.PromocionId) return;
    try {
      await updatePromocion(p.PromocionId, {
        ...p,
        PromocionActiva: p.PromocionActiva ? 0 : 1,
      });
      await cargar();
    } catch (err) {
      Swal.fire("No se pudo cambiar", mensajeApi(err, "Intentá de nuevo"), "error");
    }
  };

  const esFR = form?.PromocionTipo === "FR";

  return (
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Promociones</h1>
          <p className="text-gray-600 text-sm mt-1">
            Configurá los beneficios por cumpleaños y por frecuencia (por
            ejemplo, el 5.º lavado gratis). En la pantalla de venta se avisa al
            cajero cuando el cliente los tiene disponibles.
          </p>
        </div>
        {puedeCrear && (
          <ActionButton
            label="Nueva promoción"
            icon={PlusIcon}
            onClick={() => setForm({ ...NUEVA })}
          />
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : promociones.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Todavía no hay promociones. Creá la primera con “Nueva promoción”.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {promociones.map((p) => (
            <div
              key={p.PromocionId}
              className={`bg-white rounded-xl shadow p-5 border-l-4 ${
                p.PromocionActiva ? "border-green-500" : "border-gray-300 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {p.PromocionTipo === "CU" ? "🎂 Cumpleaños" : "🔁 Frecuencia"} ·{" "}
                    {p.PromocionBeneficio === "R" ? "Regalo" : "Descuento"}
                  </div>
                  <h2 className="text-lg font-semibold mt-1">{p.PromocionNombre}</h2>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                    p.PromocionActiva
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {p.PromocionActiva ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-2">{describirPromocion(p)}.</p>
              {p.PromocionTipo === "FR" && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Cuentan:</span>{" "}
                  {p.productosCuentan.map(nombreProducto).join(", ")}
                  {p.PromocionVigenciaDias > 0 &&
                    ` (de los últimos ${p.PromocionVigenciaDias} días)`}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Se ofrece:</span>{" "}
                {p.productosBeneficio.length
                  ? p.productosBeneficio.map(nombreProducto).join(", ")
                  : "cualquier producto"}
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">
                  Usada {p.usos || 0} {p.usos === 1 ? "vez" : "veces"}
                </span>
                <div className="flex gap-2">
                  {puedeEditar && (
                    <>
                      <button
                        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                        onClick={() => alternarActiva(p)}
                      >
                        {p.PromocionActiva ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => setForm({ ...p })}
                      >
                        Editar
                      </button>
                    </>
                  )}
                  {puedeEliminar && !p.usos && (
                    <button
                      className="text-sm px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      onClick={() => eliminar(p)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                {form.PromocionId ? "Editar promoción" : "Nueva promoción"}
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

            <div className="p-6 space-y-5">
              <div>
                <label htmlFor="PromocionNombre" className={LABEL}>
                  Nombre
                </label>
                <input
                  id="PromocionNombre"
                  className={INPUT}
                  maxLength={60}
                  required
                  placeholder="Ej.: 5.º lavado gratis"
                  value={form.PromocionNombre}
                  onChange={(e) => cambiar("PromocionNombre", e.target.value)}
                />
              </div>

              <fieldset>
                <legend className={LABEL}>Tipo de promoción</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(
                    [
                      ["FR", "🔁 Cada N servicios", "Ej.: cada 4 lavados, el 5.º gratis"],
                      ["CU", "🎂 Cumpleaños", "Beneficio en la fecha del cumpleaños"],
                    ] as const
                  ).map(([valor, titulo, ayuda]) => (
                    <label
                      key={valor}
                      className={`border rounded-lg p-3 cursor-pointer ${
                        form.PromocionTipo === valor
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="PromocionTipo"
                        className="mr-2"
                        checked={form.PromocionTipo === valor}
                        onChange={() => cambiar("PromocionTipo", valor)}
                      />
                      <span className="font-medium">{titulo}</span>
                      <span className="block text-xs text-gray-500 mt-1 ml-6">{ayuda}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {esFR ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="PromocionCantidad" className={LABEL}>
                      Servicios a juntar
                    </label>
                    <input
                      id="PromocionCantidad"
                      type="number"
                      min={1}
                      required
                      className={INPUT}
                      value={form.PromocionCantidad}
                      onChange={(e) => cambiar("PromocionCantidad", Number(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Con {form.PromocionCantidad || "N"} servicios pagos, el siguiente
                      tiene el beneficio.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="PromocionVigenciaDias" className={LABEL}>
                      Vencen a los (días)
                    </label>
                    <input
                      id="PromocionVigenciaDias"
                      type="number"
                      min={0}
                      className={INPUT}
                      value={form.PromocionVigenciaDias}
                      onChange={(e) =>
                        cambiar("PromocionVigenciaDias", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      0 = no vencen. Ej.: 180 = solo cuentan los últimos 6 meses.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className={LABEL}>Servicios que cuentan</span>
                    <SelectorProductos
                      idPrefijo="cuenta"
                      productos={productos}
                      seleccionados={form.productosCuentan}
                      onChange={(ids) => cambiar("productosCuentan", ids)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="PromocionDiasAntes" className={LABEL}>
                      Días antes del cumpleaños
                    </label>
                    <input
                      id="PromocionDiasAntes"
                      type="number"
                      min={0}
                      className={INPUT}
                      value={form.PromocionDiasAntes}
                      onChange={(e) => cambiar("PromocionDiasAntes", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label htmlFor="PromocionDiasDespues" className={LABEL}>
                      Días después del cumpleaños
                    </label>
                    <input
                      id="PromocionDiasDespues"
                      type="number"
                      min={0}
                      className={INPUT}
                      value={form.PromocionDiasDespues}
                      onChange={(e) =>
                        cambiar("PromocionDiasDespues", Number(e.target.value))
                      }
                    />
                  </div>
                  <p className="sm:col-span-2 text-xs text-gray-500 -mt-2">
                    0 y 0 = solo el día del cumpleaños. Se puede usar una vez por
                    cumpleaños. El cliente tiene que tener la fecha de nacimiento
                    cargada en su ficha.
                  </p>
                </div>
              )}

              <fieldset>
                <legend className={LABEL}>Beneficio</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(
                    [
                      ["R", "🎁 Regalo", "El producto elegido va sin cargo"],
                      ["D", "💲 Descuento", "Un % menos sobre el producto elegido"],
                    ] as const
                  ).map(([valor, titulo, ayuda]) => (
                    <label
                      key={valor}
                      className={`border rounded-lg p-3 cursor-pointer ${
                        form.PromocionBeneficio === valor
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="PromocionBeneficio"
                        className="mr-2"
                        checked={form.PromocionBeneficio === valor}
                        onChange={() => cambiar("PromocionBeneficio", valor)}
                      />
                      <span className="font-medium">{titulo}</span>
                      <span className="block text-xs text-gray-500 mt-1 ml-6">{ayuda}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.PromocionBeneficio === "D" && (
                <div className="max-w-xs">
                  <label htmlFor="PromocionDescuento" className={LABEL}>
                    Descuento (%)
                  </label>
                  <input
                    id="PromocionDescuento"
                    type="number"
                    min={1}
                    max={100}
                    step="0.5"
                    required
                    className={INPUT}
                    value={form.PromocionDescuento}
                    onChange={(e) => cambiar("PromocionDescuento", Number(e.target.value))}
                  />
                </div>
              )}

              <div>
                <span className={LABEL}>
                  Qué se puede ofrecer{" "}
                  <span className="font-normal text-gray-500">
                    (si no marcás ninguno, vale para cualquier producto)
                  </span>
                </span>
                <SelectorProductos
                  idPrefijo="beneficio"
                  productos={productos}
                  seleccionados={form.productosBeneficio}
                  onChange={(ids) => cambiar("productosBeneficio", ids)}
                />
              </div>

              <div>
                <label htmlFor="PromocionMensaje" className={LABEL}>
                  Mensaje para el cajero{" "}
                  <span className="font-normal text-gray-500">(opcional)</span>
                </label>
                <input
                  id="PromocionMensaje"
                  className={INPUT}
                  maxLength={200}
                  placeholder="Ej.: Saludar al cliente por su cumpleaños 🎉"
                  value={form.PromocionMensaje}
                  onChange={(e) => cambiar("PromocionMensaje", e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={!!form.PromocionActiva}
                  onChange={(e) => cambiar("PromocionActiva", e.target.checked ? 1 : 0)}
                />
                Activa
              </label>

              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                <span className="font-semibold">Resumen:</span>{" "}
                {describirPromocion(form)}.
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
