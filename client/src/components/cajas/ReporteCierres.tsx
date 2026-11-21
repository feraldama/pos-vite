import React, { useEffect, useState } from "react";
import {
  getCierresCaja,
  type CierreCaja,
  type MovimientoCierre,
} from "../../services/registrodiariocaja.service";
import { getUsuarios } from "../../services/usuarios.service";
import { getCajas } from "../../services/cajas.service";
import { formatMiles } from "../../utils/formato";

interface UsuarioOpcion {
  UsuarioId: string;
  UsuarioNombre: string;
  UsuarioApellido?: string;
}

interface CajaOpcion {
  CajaId: number;
  CajaDescripcion: string;
}

// aaaa-mm-dd en hora local (toISOString usaría UTC y puede cambiar el día)
const fechaLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const formatearFecha = (fecha: string | null) => {
  if (!fecha) return "-";
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
};

const montoONada = (n: number | null) => (n === null ? "-" : formatMiles(n));

// Texto de la diferencia: negativa es faltante, positiva sobrante
const textoDiferencia = (dif: number | null) => {
  if (dif === null) return "Sin apertura";
  if (dif < 0) return `Faltante ${formatMiles(Math.abs(dif))}`;
  if (dif > 0) return `Sobrante ${formatMiles(dif)}`;
  return "Cuadra";
};

const medioMovimiento = (m: MovimientoCierre) => {
  if (m.TipoGastoId === 1)
    return m.TipoGastoGrupoId === 6 ? "Egreso Transfer" : "Egreso";
  if (m.TipoGastoGrupoId === 4) return "Ingreso POS";
  if (m.TipoGastoGrupoId === 6) return "Ingreso Transfer";
  // No suma al efectivo, igual que en el PDF de cierre
  if (m.TipoGastoGrupoId === 5) return "Ingreso Voucher";
  return "Ingreso Efectivo";
};

const ReporteCierres: React.FC = () => {
  const [desde, setDesde] = useState(() => {
    const hoy = new Date();
    return fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  });
  const [hasta, setHasta] = useState(() => fechaLocal(new Date()));
  const [usuarioId, setUsuarioId] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [cajas, setCajas] = useState<CajaOpcion[]>([]);
  const [cierres, setCierres] = useState<CierreCaja[] | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsuarios(1, 1000)
      .then((r) => setUsuarios(r.data || []))
      .catch(() => setUsuarios([]));
    getCajas(1, 1000)
      .then((r) => setCajas(r.data || []))
      .catch(() => setCajas([]));
  }, []);

  const buscar = async () => {
    setCargando(true);
    setError(null);
    setAbierto(null);
    try {
      setCierres(await getCierresCaja({ desde, hasta, usuarioId, cajaId }));
    } catch (err) {
      setCierres(null);
      setError(
        (err as { message?: string })?.message ||
          "Error al obtener los cierres de caja"
      );
    } finally {
      setCargando(false);
    }
  };

  const lista = cierres || [];
  const conFaltante = lista.filter((c) => (c.Diferencia ?? 0) < 0);
  const totalFaltante = conFaltante.reduce(
    (acc, c) => acc + Math.abs(c.Diferencia as number),
    0
  );
  const totalSobrante = lista
    .filter((c) => (c.Diferencia ?? 0) > 0)
    .reduce((acc, c) => acc + (c.Diferencia as number), 0);

  const nombreFiltro = (valor: string, opciones: { id: string; texto: string }[]) =>
    valor ? opciones.find((o) => o.id === valor)?.texto || valor : "TODOS";

  const exportarPDF = async () => {
    if (!lista.length) return;
    // jspdf pesa ~350 KB: se carga recién al exportar
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    const finalY = () =>
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY;

    doc.setFontSize(16);
    doc.text("Reporte de Cierres de Caja", 14, 16);
    doc.setFontSize(10);
    doc.text(
      `Del ${formatearFecha(desde)} al ${formatearFecha(hasta)}  -  Usuario: ${nombreFiltro(
        usuarioId,
        usuarios.map((u) => ({ id: u.UsuarioId, texto: u.UsuarioId }))
      )}  -  Caja: ${nombreFiltro(
        cajaId,
        cajas.map((c) => ({ id: String(c.CajaId), texto: c.CajaDescripcion }))
      )}`,
      14,
      23
    );
    doc.text(
      `Cierres: ${lista.length}  -  Con faltante: ${conFaltante.length}  -  Total faltante: Gs. ${formatMiles(
        totalFaltante
      )}  -  Total sobrante: Gs. ${formatMiles(totalSobrante)}`,
      14,
      29
    );

    autoTable(doc, {
      head: [
        [
          "FECHA",
          "USUARIO",
          "CAJA",
          "APERTURA",
          "EFECTIVO",
          "POS",
          "TRANSFER",
          "EGRESOS",
          "EGR. TRANSF.",
          "ESPERADO",
          "CIERRE",
          "DIFERENCIA",
        ],
      ],
      body: lista.map((c) => [
        formatearFecha(c.Fecha),
        c.UsuarioId,
        c.CajaDescripcion,
        montoONada(c.Apertura),
        formatMiles(c.IngresosEfectivo),
        formatMiles(c.IngresosPOS),
        formatMiles(c.IngresosTransfer),
        formatMiles(c.Egresos),
        formatMiles(c.EgresosTransfer),
        montoONada(c.EfectivoEsperado),
        formatMiles(c.Cierre),
        textoDiferencia(c.Diferencia),
      ]),
      startY: 34,
      theme: "grid",
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 11) return;
        const dif = lista[data.row.index].Diferencia;
        if (dif !== null && dif < 0) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // Detalle de movimientos de cada cierre con faltante, para el seguimiento
    for (const c of conFaltante) {
      let y = finalY() + 10;
      if (y > 180) {
        doc.addPage();
        y = 16;
      }
      doc.setFontSize(11);
      doc.text(
        `${formatearFecha(c.Fecha)} - ${c.UsuarioId} - ${c.CajaDescripcion}: ${textoDiferencia(
          c.Diferencia
        )}`,
        14,
        y
      );
      autoTable(doc, {
        head: [["FECHA", "TIPO", "DETALLE", "MONTO"]],
        body: c.Movimientos.length
          ? c.Movimientos.map((m) => [
              formatearFecha(m.Fecha),
              medioMovimiento(m),
              m.RegistroDiarioCajaDetalle,
              formatMiles(m.RegistroDiarioCajaMonto),
            ])
          : [["", "", "Sin movimientos", ""]],
        startY: y + 3,
        theme: "grid",
        headStyles: { fillColor: [185, 28, 28] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`cierres_caja_${desde}_${hasta}.pdf`);
    doc.output("dataurlnewwindow");
  };

  const claseInput =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent";

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-1">Cierres de Caja</h2>
      <p className="text-gray-600 text-sm mb-4">
        Detalle de cada cierre con su apertura, ingresos por medio de pago,
        egresos y el faltante o sobrante de efectivo. Hacé clic en un cierre
        para ver sus movimientos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label htmlFor="cierres-desde" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Desde
          </label>
          <input
            id="cierres-desde"
            type="date"
            className={claseInput}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            disabled={cargando}
          />
        </div>
        <div>
          <label htmlFor="cierres-hasta" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Hasta
          </label>
          <input
            id="cierres-hasta"
            type="date"
            className={claseInput}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            disabled={cargando}
          />
        </div>
        <div>
          <label htmlFor="cierres-usuario" className="block text-sm font-medium text-gray-700 mb-1">
            Usuario
          </label>
          <select
            id="cierres-usuario"
            className={claseInput}
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            disabled={cargando}
          >
            <option value="">TODOS</option>
            {usuarios.map((u) => (
              <option key={u.UsuarioId} value={u.UsuarioId}>
                {u.UsuarioId}
                {u.UsuarioNombre ? ` - ${u.UsuarioNombre} ${u.UsuarioApellido || ""}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cierres-caja" className="block text-sm font-medium text-gray-700 mb-1">
            Caja
          </label>
          <select
            id="cierres-caja"
            className={claseInput}
            value={cajaId}
            onChange={(e) => setCajaId(e.target.value)}
            disabled={cargando}
          >
            <option value="">TODAS</option>
            {cajas.map((c) => (
              <option key={c.CajaId} value={c.CajaId}>
                {c.CajaDescripcion}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <button
          className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg shadow transition disabled:opacity-50"
          onClick={buscar}
          disabled={cargando}
        >
          {cargando ? "BUSCANDO..." : "BUSCAR CIERRES"}
        </button>
        <button
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition disabled:opacity-50"
          onClick={exportarPDF}
          disabled={cargando || !lista.length}
        >
          EXPORTAR PDF
        </button>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</div>
      )}

      {cierres && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Cierres</div>
              <div className="text-xl font-bold">{lista.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-red-700">Con faltante</div>
              <div className="text-xl font-bold text-red-700">{conFaltante.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-red-700">Total faltante</div>
              <div className="text-xl font-bold text-red-700">
                Gs. {formatMiles(totalFaltante)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-green-700">Total sobrante</div>
              <div className="text-xl font-bold text-green-700">
                Gs. {formatMiles(totalSobrante)}
              </div>
            </div>
          </div>

          {lista.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              No hay cierres con esos filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-2 py-2 text-left">Fecha</th>
                    <th className="px-2 py-2 text-left">Usuario</th>
                    <th className="px-2 py-2 text-left">Caja</th>
                    <th className="px-2 py-2 text-right">Apertura</th>
                    <th className="px-2 py-2 text-right">Efectivo</th>
                    <th className="px-2 py-2 text-right">POS</th>
                    <th className="px-2 py-2 text-right">Transfer</th>
                    <th className="px-2 py-2 text-right">Egresos</th>
                    <th className="px-2 py-2 text-right">Egr. Transfer</th>
                    <th className="px-2 py-2 text-right">Esperado</th>
                    <th className="px-2 py-2 text-right">Cierre</th>
                    <th className="px-2 py-2 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c) => {
                    const dif = c.Diferencia;
                    const colorDif =
                      dif === null
                        ? "text-gray-500"
                        : dif < 0
                        ? "text-red-700 font-bold"
                        : dif > 0
                        ? "text-green-700 font-semibold"
                        : "text-gray-700";
                    return (
                      <React.Fragment key={c.CierreId}>
                        <tr
                          className={`border-b cursor-pointer hover:bg-gray-50 ${
                            dif !== null && dif < 0 ? "bg-red-50" : ""
                          }`}
                          onClick={() =>
                            setAbierto(abierto === c.CierreId ? null : c.CierreId)
                          }
                          title="Ver movimientos"
                        >
                          <td className="px-2 py-2 whitespace-nowrap">
                            {abierto === c.CierreId ? "▾ " : "▸ "}
                            {formatearFecha(c.Fecha)}
                          </td>
                          <td className="px-2 py-2">{c.UsuarioId}</td>
                          <td className="px-2 py-2">{c.CajaDescripcion}</td>
                          <td className="px-2 py-2 text-right">{montoONada(c.Apertura)}</td>
                          <td className="px-2 py-2 text-right">{formatMiles(c.IngresosEfectivo)}</td>
                          <td className="px-2 py-2 text-right">{formatMiles(c.IngresosPOS)}</td>
                          <td className="px-2 py-2 text-right">{formatMiles(c.IngresosTransfer)}</td>
                          <td className="px-2 py-2 text-right">{formatMiles(c.Egresos)}</td>
                          <td className="px-2 py-2 text-right">{formatMiles(c.EgresosTransfer)}</td>
                          <td className="px-2 py-2 text-right">{montoONada(c.EfectivoEsperado)}</td>
                          <td className="px-2 py-2 text-right">{formatMiles(c.Cierre)}</td>
                          <td className={`px-2 py-2 text-right whitespace-nowrap ${colorDif}`}>
                            {textoDiferencia(dif)}
                          </td>
                        </tr>
                        {abierto === c.CierreId && (
                          <tr className="bg-gray-50">
                            <td colSpan={12} className="px-4 py-3">
                              <div className="text-xs text-gray-500 mb-2">
                                Apertura: {formatearFecha(c.AperturaFecha)} - Cierre:{" "}
                                {formatearFecha(c.Fecha)}
                              </div>
                              {c.Movimientos.length === 0 ? (
                                <div className="text-gray-500">Sin movimientos.</div>
                              ) : (
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-600">
                                      <th className="px-2 py-1 text-left">Fecha</th>
                                      <th className="px-2 py-1 text-left">Tipo</th>
                                      <th className="px-2 py-1 text-left">Detalle</th>
                                      <th className="px-2 py-1 text-right">Monto</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {c.Movimientos.map((m) => (
                                      <tr key={m.RegistroDiarioCajaId} className="border-t">
                                        <td className="px-2 py-1">{formatearFecha(m.Fecha)}</td>
                                        <td
                                          className={`px-2 py-1 ${
                                            m.TipoGastoId === 1 ? "text-red-700" : ""
                                          }`}
                                        >
                                          {medioMovimiento(m)}
                                        </td>
                                        <td className="px-2 py-1">{m.RegistroDiarioCajaDetalle}</td>
                                        <td className="px-2 py-1 text-right">
                                          {formatMiles(m.RegistroDiarioCajaMonto)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReporteCierres;
