import { useEffect, useState } from "react";
import { getCajas } from "../../services/cajas.service";
import ActionButton from "../../components/common/Button/ActionButton";
import {
  aperturaCierreCaja,
  getEstadoAperturaPorUsuario,
  getMiUltimoCierre,
  type CierreCaja,
} from "../../services/registrodiariocaja.service";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";
import { formatMiles } from "../../utils/formato";
import { useNavigate, useLocation } from "react-router-dom";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
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
  const navigate = useNavigate();
  const location = useLocation();
  const [cajaDisabled, setCajaDisabled] = useState(false);
  const [descargarPDF, setDescargarPDF] = useState(false);
  const [operacionCompletada, setOperacionCompletada] = useState(false);

  useEffect(() => {
    const fetchCajas = async () => {
      try {
        setLoading(true);
        const data = await getCajas(1, 100);
        setCajas(data.data);
        // No establecer caja por defecto, el usuario debe seleccionar
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
        // Si apertura > cierre, forzar cierre y deshabilitar el select de tipo y de caja
        if (data.aperturaId > data.cierreId) {
          setTipo("1"); // Cierre
          setTipoDisabled(true);
          setCajaDisabled(true); // Solo puede cerrar la caja que tiene abierta
          if (data.cajaId) setCajaId(data.cajaId);
        } else {
          // No tiene ninguna caja abierta, forzar apertura y deshabilitar solo el select de tipo
          setTipo("0");
          setTipoDisabled(true);
          setCajaDisabled(false); // Puede elegir la caja que desee
        }
      } catch {
        // Si hay error, no forzar nada
      }
    };
    checkCajaAperturada();
  }, [user, location.pathname]);

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

  // Resumen del último cierre del usuario. La cuenta la hace la API (la
  // misma del reporte de cierres), acá solo se arma el PDF
  async function generarResumenCierrePDF() {
    if (!user) return;

    let resumen: CierreCaja;
    try {
      resumen = await getMiUltimoCierre();
    } catch (err) {
      Swal.fire({
        icon: "warning",
        title: "No se encontró cierre",
        text:
          (err as { message?: string })?.message ||
          "No se encontró un cierre de caja para este usuario.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }
    if (resumen.AperturaId === null || resumen.Diferencia === null) {
      Swal.fire({
        icon: "warning",
        title: "No se encontró apertura",
        text: "El último cierre de este usuario no tiene una apertura anterior.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const cajaDescripcion = resumen.CajaDescripcion;
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();
    const apertura = resumen.Apertura ?? 0;
    const cierre = resumen.Cierre;
    // Egresos en efectivo (los que salen del cajón) y por transferencia
    const egresos = resumen.Egresos;
    const egresosTransfer = resumen.EgresosTransfer;
    const ingresos = resumen.IngresosEfectivo;
    const ingresosPOS = resumen.IngresosPOS;
    const ingresosVoucher = resumen.IngresosVoucher;
    const ingresosTransfer = resumen.IngresosTransfer;
    // Diferencia negativa = faltante, positiva = sobrante
    const dif = resumen.Diferencia;
    let txtSobranteFaltante = "";
    if (dif < 0) {
      txtSobranteFaltante = `Faltante de: Gs. ${formatMiles(Math.abs(dif))}`;
    } else if (dif > 0) {
      txtSobranteFaltante = `Sobrante de: Gs. ${formatMiles(dif)}`;
    } else {
      txtSobranteFaltante = `Sobrante/Faltante: Gs. 0`;
    }
    // --- Generar PDF ---
    // jspdf pesa ~350 KB: se carga acá y no al abrir la pantalla
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 200], // 80mm de ancho, 200mm de alto
    });
    doc.setFontSize(16);
    doc.text("RESUMEN CIERRE CAJA", 40, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha} - Hora: ${hora}`, 10, 30);
    doc.text(`Usuario: ${user.nombre}`, 10, 38);
    doc.text(`Caja: ${cajaDescripcion}`, 10, 46);
    doc.line(10, 50, 200, 50);
    let y = 58;
    doc.text(`Apertura: ${formatMiles(apertura)}`, 10, y);
    y += 8;
    doc.text(`Cierre: ${formatMiles(cierre)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    doc.text(`Egresos: ${formatMiles(egresos)}`, 10, y);
    y += 8;
    doc.text(`Egresos Transfer: ${formatMiles(egresosTransfer)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    doc.text(`Ingresos Efectivo: ${formatMiles(ingresos)}`, 10, y);
    y += 8;
    doc.text(`Ingresos POS: ${formatMiles(ingresosPOS)}`, 10, y);
    y += 8;
    doc.text(`Ingresos Voucher: ${formatMiles(ingresosVoucher)}`, 10, y);
    y += 8;
    doc.text(`Ingresos Transfer: ${formatMiles(ingresosTransfer)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    const totalIngresos =
      ingresos + ingresosPOS + ingresosVoucher + ingresosTransfer;
    doc.text(`Total Ingresos: ${formatMiles(totalIngresos)}`, 10, y);
    y += 8;
    const totalEgresos = egresos + egresosTransfer;
    doc.text(`Total Egresos: ${formatMiles(totalEgresos)}`, 10, y);
    y += 8;
    const diferencia = totalIngresos - totalEgresos;
    doc.text(`Diferencia: ${formatMiles(diferencia)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    doc.text(txtSobranteFaltante, 10, y);
    y += 12;
    doc.text("--GRACIAS POR SU PREFERENCIA--", 10, y);

    // Generar el PDF y abrirlo automáticamente
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Crear un enlace temporal para descargar el PDF
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `ResumenCierreCaja_${fecha.replace(/\//g, "-")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Abrir el PDF automáticamente en una nueva pestaña
    setTimeout(() => {
      const openLink = document.createElement("a");
      openLink.href = pdfUrl;
      openLink.target = "_blank";
      document.body.appendChild(openLink);
      openLink.click();
      document.body.removeChild(openLink);
    }, 500);

    // Limpiar la URL del objeto después de un tiempo
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 2000);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    setOperacionCompletada(true); // Deshabilitar el botón inmediatamente
    try {
      const result = await aperturaCierreCaja({
        apertura: tipo === "0" ? 0 : 1,
        CajaId: cajaId,
        Monto: monto,
      });
      if (tipo === "0") {
        await Swal.fire({
          icon: "success",
          title: "Apertura exitosa",
          text: result.message || "La caja se aperturó correctamente",
          confirmButtonText: "Ir a alquileres",
          confirmButtonColor: "#2563eb",
        });
        navigate("/alquileres-venta");
      } else {
        setSuccess(result.message || "Operación realizada correctamente");
        setDescargarPDF(true);
        // Descarga automática del resumen del cierre recién hecho. Si el PDF
        // falla, el cierre ya está hecho: el botón sigue deshabilitado y
        // queda "Descargar Resumen PDF" para reintentar
        try {
          await generarResumenCierrePDF();
        } catch {
          Swal.fire({
            icon: "warning",
            title: "Cierre realizado",
            text: "No se pudo generar el resumen PDF. Use el botón Descargar Resumen PDF.",
            confirmButtonColor: "#2563eb",
          });
        }
      }
    } catch (err) {
      setError(
        (err as { message?: string })?.message || "Error en la operación"
      );
      setOperacionCompletada(false); // Rehabilitar el botón si hay error
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
            <label
                htmlFor="aperturacierrecajapage-tipo-de-operacion" className="block mb-2 text-sm font-medium text-gray-900">
              Tipo de operación
            </label>
            <select
                id="aperturacierrecajapage-tipo-de-operacion"
              className={`block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 ${
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
            <label
                htmlFor="aperturacierrecajapage-caja" className="block mb-2 text-sm font-medium text-gray-900">
              Caja
            </label>
            <select
                id="aperturacierrecajapage-caja"
              className={`block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 ${
                cajaDisabled ? "bg-gray-200 text-gray-500" : ""
              }`}
              value={cajaId}
              onChange={(e) => setCajaId(e.target.value)}
              required
              disabled={cajaDisabled}
            >
              <option value="">Seleccione una caja</option>
              {cajas.map((caja) => (
                <option key={caja.CajaId} value={caja.CajaId}>
                  {caja.CajaDescripcion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
                htmlFor="aperturacierrecajapage-monto-de-apertura" className="block mb-2 text-sm font-medium text-gray-900">
              Monto de apertura
            </label>
            <input
                id="aperturacierrecajapage-monto-de-apertura"
              type="text"
              inputMode="numeric"
              className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
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
            disabled={submitting || operacionCompletada}
          />
        </div>
        {success && (
          <div className="text-green-600 text-center font-medium mt-2">
            {success}
          </div>
        )}
      </form>
      {success && tipo === "1" && descargarPDF && (
        <div className="flex justify-center mt-4">
          <ActionButton
            label="Descargar Resumen PDF"
            onClick={() => generarResumenCierrePDF()}
          />
        </div>
      )}
    </div>
  );
}
