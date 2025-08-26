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
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import { getRegistrosDiariosCaja } from "../../services/registros.service";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
}

interface RegistroDiarioCaja {
  RegistroDiarioCajaId: number;
  CajaId: number;
  UsuarioId: string;
  RegistroDiarioCajaFecha: string;
  RegistroDiarioCajaMonto: number;
  TipoGastoId: number;
  TipoGastoGrupoId: number;
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
  const [registrosCaja, setRegistrosCaja] = useState<RegistroDiarioCaja[]>([]);
  const [descargarPDF, setDescargarPDF] = useState(false);

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

  // Obtener registros de la caja al cerrar
  const fetchRegistrosCaja = async () => {
    try {
      // Traer todos los registros de la caja seleccionada (puedes filtrar por caja y usuario si lo deseas)
      const data = await getRegistrosDiariosCaja(1, 1000, undefined, "desc");
      setRegistrosCaja(
        data.data.filter((r: RegistroDiarioCaja) => r.CajaId == cajaId)
      );
    } catch {
      setRegistrosCaja([]);
    }
  };

  // Función para generar el PDF
  function generarResumenCierrePDF() {
    if (!user || !cajaId) return;
    const cajaDescripcion =
      cajas.find((c) => c.CajaId == cajaId)?.CajaDescripcion || "";
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();
    // --- Nueva lógica: buscar última apertura y cierre del usuario ---
    const registros = registrosCaja.filter((r) => r.UsuarioId == user.id);
    // Buscar la última apertura del usuario
    const aperturaReg = registros.find(
      (reg) => reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 2
    );
    if (!aperturaReg) {
      Swal.fire({
        icon: "warning",
        title: "No se encontró apertura",
        text: "No se encontró una apertura de caja para este usuario.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }
    // Buscar el primer cierre posterior a la apertura
    const cierreReg = registros.find(
      (reg) =>
        reg.TipoGastoId === 1 &&
        reg.TipoGastoGrupoId === 2 &&
        reg.RegistroDiarioCajaId > aperturaReg.RegistroDiarioCajaId
    );
    if (!cierreReg) {
      Swal.fire({
        icon: "warning",
        title: "No se encontró cierre",
        text: "No se encontró un cierre de caja posterior a la apertura para este usuario.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }
    // Filtrar los registros entre apertura y cierre (inclusive)
    const registrosFiltrados = registrosCaja.filter(
      (reg) =>
        reg.UsuarioId == user.id &&
        reg.RegistroDiarioCajaId >= aperturaReg.RegistroDiarioCajaId &&
        reg.RegistroDiarioCajaId <= cierreReg.RegistroDiarioCajaId
    );
    // Calcular totales
    const apertura = aperturaReg.RegistroDiarioCajaMonto;
    const cierre = cierreReg.RegistroDiarioCajaMonto;
    let egresos = 0;
    let ingresos = 0;
    let ingresosPOS = 0;
    let ingresosVoucher = 0;
    let ingresosTransfer = 0;
    for (const reg of registrosFiltrados) {
      if (
        reg.TipoGastoId === 2 &&
        reg.TipoGastoGrupoId !== 2 &&
        reg.TipoGastoGrupoId !== 4 &&
        reg.TipoGastoGrupoId !== 5 &&
        reg.TipoGastoGrupoId !== 6
      ) {
        ingresos += reg.RegistroDiarioCajaMonto;
      }
      if (reg.TipoGastoId === 1 && reg.TipoGastoGrupoId !== 2) {
        egresos += reg.RegistroDiarioCajaMonto;
      }
      if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 4) {
        ingresosPOS += reg.RegistroDiarioCajaMonto;
      }
      if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 5) {
        ingresosVoucher += reg.RegistroDiarioCajaMonto;
      }
      if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 6) {
        ingresosTransfer += reg.RegistroDiarioCajaMonto;
      }
    }
    const sobranteFaltante = ingresos + apertura - (cierre + egresos);
    let txtSobranteFaltante = "";
    if (sobranteFaltante > 0) {
      txtSobranteFaltante = `Sobrante de: Gs. ${formatMiles(sobranteFaltante)}`;
    } else if (sobranteFaltante < 0) {
      txtSobranteFaltante = `Faltante de: Gs. ${formatMiles(
        Math.abs(sobranteFaltante)
      )}`;
    } else {
      txtSobranteFaltante = `Sobrante/Faltante: Gs. 0`;
    }
    // --- Generar PDF ---
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
    // Línea nueva para Total Egresos
    doc.text(`Total Egresos: ${formatMiles(egresos)}`, 10, y);
    y += 8;
    // Línea nueva para Diferencia
    const diferencia = totalIngresos - egresos;
    doc.text(`Diferencia: ${formatMiles(diferencia)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    doc.text(txtSobranteFaltante, 10, y);
    y += 12;
    doc.text("--GRACIAS POR SU PREFERENCIA--", 10, y);
    doc.save(`ResumenCierreCaja_${fecha.replace(/\//g, "-")}.pdf`);
  }

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
      if (tipo === "0") {
        await Swal.fire({
          icon: "success",
          title: "Apertura exitosa",
          text: result.message || "La caja se aperturó correctamente",
          confirmButtonText: "Ir a ventas",
          confirmButtonColor: "#2563eb",
        });
        navigate("/ventas");
      } else {
        setSuccess(result.message || "Operación realizada correctamente");
        await fetchRegistrosCaja();
        setDescargarPDF(true);
      }
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
                cajaDisabled ? "bg-gray-200 text-gray-500" : ""
              }`}
              value={cajaId}
              onChange={(e) => setCajaId(e.target.value)}
              required
              disabled={cajaDisabled}
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
      {success && tipo === "1" && descargarPDF && (
        <div className="flex justify-center mt-4">
          <ActionButton
            label="Descargar Resumen PDF"
            onClick={generarResumenCierrePDF}
          />
        </div>
      )}
    </div>
  );
}
