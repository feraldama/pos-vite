import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  getCumpleanos,
  type CumpleanosRow,
} from "../../services/promociones.service";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Número para wa.me: solo dígitos, 09xx... de Paraguay -> 5959xx... */
function numeroWhatsApp(telefono: string) {
  const digitos = (telefono || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("595")) return digitos;
  if (digitos.startsWith("0")) return `595${digitos.slice(1)}`;
  return digitos;
}

const nombreCompleto = (c: CumpleanosRow) =>
  `${c.ClienteNombre || ""} ${c.ClienteApellido || ""}`.trim();

/** Clientes que cumplen años en el mes elegido, con acceso directo a WhatsApp. */
const CumpleanosReport: React.FC = () => {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [filas, setFilas] = useState<CumpleanosRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generar = async () => {
    setLoading(true);
    setError(null);
    try {
      setFilas(await getCumpleanos(mes));
    } catch {
      setError("Error al cargar los cumpleaños");
      setFilas(null);
    } finally {
      setLoading(false);
    }
  };

  const anio = hoy.getFullYear();
  const esHoy = (c: CumpleanosRow) =>
    mes === hoy.getMonth() + 1 && c.dia === hoy.getDate();
  const cumple = (c: CumpleanosRow) =>
    anio - Number(c.ClienteFechaNacimiento.slice(0, 4));

  const exportarExcel = () => {
    if (!filas?.length) return;
    const hoja = XLSX.utils.aoa_to_sheet([
      [`Cumpleaños de ${MESES[mes - 1]}`],
      [],
      ["Día", "Cliente", "Teléfono", "Vehículo", "Cumple (años)"],
      ...filas.map((c) => [
        c.dia,
        nombreCompleto(c),
        c.ClienteTelefono || "",
        c.ClienteVehiculo || "",
        cumple(c),
      ]),
    ]);
    hoja["!cols"] = [{ wch: 6 }, { wch: 36 }, { wch: 16 }, { wch: 28 }, { wch: 14 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Cumpleaños");
    XLSX.writeFile(libro, `cumpleanos_${String(mes).padStart(2, "0")}.xlsx`);
  };

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">🎂 Cumpleaños de clientes</h2>
      <p className="text-gray-600 text-sm mb-4">
        Clientes con fecha de nacimiento cargada que cumplen años en el mes.
        Desde acá se les puede escribir por WhatsApp para saludarlos o
        invitarlos a usar su beneficio.
      </p>
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label
            htmlFor="mesCumpleanos"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Mes
          </label>
          <select
            id="mesCumpleanos"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition disabled:opacity-50"
          onClick={generar}
          disabled={loading}
        >
          {loading ? "Cargando…" : "Ver cumpleaños"}
        </button>
        {!!filas?.length && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition"
            onClick={exportarExcel}
          >
            Exportar a Excel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}
      {filas && filas.length === 0 && (
        <p className="text-gray-500">
          Nadie cumple años en {MESES[mes - 1].toLowerCase()} (o todavía no hay
          fechas de nacimiento cargadas).
        </p>
      )}

      {!!filas?.length && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100">
              <tr className="border-b border-slate-300">
                <th className="text-left py-2 px-2 font-semibold">Día</th>
                <th className="text-left py-2 px-2 font-semibold">Cliente</th>
                <th className="text-left py-2 px-2 font-semibold">Teléfono</th>
                <th className="text-left py-2 px-2 font-semibold">Vehículo</th>
                <th className="text-right py-2 px-2 font-semibold">Cumple</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => {
                const wa = numeroWhatsApp(c.ClienteTelefono);
                const texto = encodeURIComponent(
                  `¡Feliz cumpleaños, ${c.ClienteNombre.trim()}! 🎉 Te esperamos en Decorpar para celebrarlo con un beneficio especial.`
                );
                return (
                  <tr
                    key={c.ClienteId}
                    className={`border-b border-slate-200 ${
                      esHoy(c) ? "bg-amber-50 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2 px-2 whitespace-nowrap">
                      {String(c.dia).padStart(2, "0")}/{String(mes).padStart(2, "0")}
                      {esHoy(c) && " 🎉 hoy"}
                    </td>
                    <td className="py-2 px-2">{nombreCompleto(c)}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {c.ClienteTelefono || "-"}
                    </td>
                    <td className="py-2 px-2">{c.ClienteVehiculo || "-"}</td>
                    <td className="py-2 px-2 text-right">{cumple(c)} años</td>
                    <td className="py-2 px-2 text-right">
                      {wa && (
                        <a
                          href={`https://wa.me/${wa}?text=${texto}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1"
                        >
                          WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CumpleanosReport;
