import React, { useState, useEffect } from "react";
import { getTiposGasto } from "../../services/tipogasto.service";
import { getTiposGastoGrupo } from "../../services/tipogastogrupo.service";
import { createRegistroDiarioCaja } from "../../services/registros.service";
import Swal from "sweetalert2";
import { formatMiles } from "../../utils/utils";
import axios from "axios";
import { js2xml } from "xml-js";

interface TipoGasto {
  TipoGastoId: number;
  TipoGastoDescripcion: string;
}
interface TipoGastoGrupo {
  TipoGastoGrupoId: number;
  TipoGastoGrupoDescripcion: string;
  TipoGastoId: number;
}

interface PagoSOAPData {
  Registrodiariocajaid: number;
  Tipogastoid: number;
  Tipogastogrupoid: number;
  Registrodiariocajamonto: number;
  Tipo: number;
  Cajaid: number;
  Registrodiariocajafecha: string;
  Registrodiariocajadetalle: string;
  Registrodiariocajacambio: number;
  Usuarioid: string;
}

interface PagoModalProps {
  show: boolean;
  handleClose: () => void;
  cajaAperturada: { CajaId: number | string } | null;
  usuario: { id: number | string } | null;
}

const PagoModal: React.FC<PagoModalProps> = ({
  show,
  handleClose,
  cajaAperturada,
  usuario,
}) => {
  const [fecha, setFecha] = useState("");
  const [tipoGastoId, setTipoGastoId] = useState<number | "">("");
  const [tipoGastoGrupoId, setTipoGastoGrupoId] = useState<number | "">("");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState<number | "">("");
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [tiposGastoGrupo, setTiposGastoGrupo] = useState<TipoGastoGrupo[]>([]);
  const [cambio, setCambio] = useState<number>(0);

  useEffect(() => {
    if (show) {
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      setFecha(`${yyyy}-${mm}-${dd}`);
      getTiposGasto().then(setTiposGasto);
      getTiposGastoGrupo().then(setTiposGastoGrupo);
    }
  }, [show]);

  const gruposFiltrados = tiposGastoGrupo.filter(
    (g) => g.TipoGastoId === tipoGastoId
  );

  const sendRequestSOAP = async (pagoData: PagoSOAPData) => {
    const json = {
      Envelope: {
        _attributes: { xmlns: "http://schemas.xmlsoap.org/soap/envelope/" },
        Body: {
          "PBorrarRegistoDiarioWS.VENTACONFIRMAR": {
            _attributes: { xmlns: "Cobranza" },
            Registrodiariocajaid: pagoData.Registrodiariocajaid,
            Tipogastoid: pagoData.Tipogastoid,
            Tipogastogrupoid: pagoData.Tipogastogrupoid,
            Registrodiariocajamonto: pagoData.Registrodiariocajamonto,
            Tipo: 1,
            Cajaid: pagoData.Cajaid,
            Fechastring: pagoData.Registrodiariocajafecha,
            Registrodiariocajadetalle: pagoData.Registrodiariocajadetalle,
            Registrodiariocajacambio: pagoData.Registrodiariocajacambio,
            Usuarioid: pagoData.Usuarioid,
          },
        },
      },
    };

    const xml = js2xml(json, { compact: true, ignoreComment: true, spaces: 4 });
    const config = {
      headers: {
        "Content-Type": "text/xml",
      },
    };

    try {
      await axios.post(
        "http://localhost:8080/CobranzaAmimar/servlet/com.cobranza.apborrarregistodiariows",
        xml,
        config
      );

      return true;
    } catch (error) {
      console.error("Error en llamada SOAP:", error);
      throw new Error("Error al procesar el pago SOAP");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaAperturada || !usuario) return;

    // Validar que la caja tenga un ID válido
    if (!cajaAperturada.CajaId) {
      Swal.fire(
        "Error",
        "No se pudo obtener el ID de la caja aperturada",
        "error"
      );
      return;
    }

    try {
      // Validar datos básicos antes de enviar
      const errores = [];
      if (!tipoGastoId || Number(tipoGastoId) <= 0) {
        errores.push("ID de tipo de gasto es requerido y debe ser mayor a 0");
      }
      if (!tipoGastoGrupoId || Number(tipoGastoGrupoId) <= 0) {
        errores.push("ID de grupo de gasto es requerido y debe ser mayor a 0");
      }
      if (!monto || Number(monto) <= 0) {
        errores.push("Monto es requerido y debe ser mayor a 0");
      }
      if (!detalle || detalle.trim() === "") {
        errores.push("Detalle es requerido");
      }

      if (errores.length > 0) {
        Swal.fire("Error de validación", errores.join("\n"), "error");
        return;
      }

      // Formatear fecha para la base de datos (YYYY-MM-DD)
      const fechaDate = new Date(fecha + "T00:00:00");
      const fechaISO = fechaDate.toISOString().split("T")[0];

      // Primero guardar en la base de datos
      const registroData = {
        TipoGastoId: Number(tipoGastoId), // Cambié Tipogastoid por TipoGastoId
        TipoGastoGrupoId: Number(tipoGastoGrupoId), // Cambié Tipogastogrupoid por TipoGastoGrupoId
        RegistroDiarioCajaMonto: Number(monto),
        Tipo: 1, // Siempre 1 para este caso
        CajaId: Number(cajaAperturada.CajaId), // Cambié Cajaid por CajaId para que coincida con el modelo
        Registrodiariocajafecha: fechaISO,
        RegistroDiarioCajaDetalle: detalle,
        RegistroDiarioCajaCambio: cambio,
        Usuarioid: String(usuario.id),
      };

      // Crear registro en la base de datos
      const registroCreado = await createRegistroDiarioCaja(registroData);

      // El ID está en registroCreado.data.RegistroDiarioCajaId según la respuesta de la API
      const nuevoRegistroId =
        registroCreado.data?.RegistroDiarioCajaId ||
        registroCreado.RegistroDiarioCajaId ||
        registroCreado.id ||
        registroCreado.Registrodiariocajaid;

      if (!nuevoRegistroId) {
        console.error(
          "No se pudo obtener el ID. Respuesta completa:",
          registroCreado
        );
        throw new Error("No se pudo obtener el ID del registro creado");
      }

      // Formatear fecha para SOAP (DD/MM/YY)
      const dia = fechaDate.getDate();
      const mes = fechaDate.getMonth() + 1;
      const año = fechaDate.getFullYear() % 100;
      const diaStr = dia < 10 ? `0${dia}` : dia.toString();
      const mesStr = mes < 10 ? `0${mes}` : mes.toString();
      const añoStr = año < 10 ? `0${año}` : año.toString();
      const fechaFormateada = `${diaStr}/${mesStr}/${añoStr}`;

      // Ahora enviar a SOAP con el ID real generado
      const pagoSOAPData = {
        Registrodiariocajaid: nuevoRegistroId,
        Tipogastoid: Number(tipoGastoId),
        Tipogastogrupoid: Number(tipoGastoGrupoId),
        Registrodiariocajamonto: Number(monto),
        Tipo: 1,
        Cajaid: Number(cajaAperturada.CajaId),
        Registrodiariocajafecha: fechaFormateada,
        Registrodiariocajadetalle: detalle,
        Registrodiariocajacambio: cambio,
        Usuarioid: String(usuario.id),
      };

      await sendRequestSOAP(pagoSOAPData);
      Swal.fire(
        "Pago registrado",
        "El pago fue registrado correctamente",
        "success"
      );

      handleClose();
      resetForm();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "No se pudo registrar el pago";
      Swal.fire("Error", errorMsg, "error");
    }
  };

  const resetForm = () => {
    setFecha("");
    setTipoGastoId("");
    setTipoGastoGrupoId("");
    setDetalle("");
    setMonto("");
    setCambio(0);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          onClick={handleClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Nuevo Pago
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Tipo de Gasto
              </label>
              <select
                value={tipoGastoId}
                onChange={(e) => setTipoGastoId(Number(e.target.value))}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Seleccione...</option>
                {tiposGasto.map((tg) => (
                  <option key={tg.TipoGastoId} value={tg.TipoGastoId}>
                    {tg.TipoGastoDescripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Grupo de Gasto
              </label>
              <select
                value={tipoGastoGrupoId}
                onChange={(e) => setTipoGastoGrupoId(Number(e.target.value))}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Seleccione...</option>
                {gruposFiltrados.map((gg) => (
                  <option key={gg.TipoGastoGrupoId} value={gg.TipoGastoGrupoId}>
                    {gg.TipoGastoGrupoDescripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Monto
              </label>
              <input
                type="text"
                value={monto !== "" ? formatMiles(monto) : ""}
                onChange={(e) => {
                  // Eliminar puntos y formatear correctamente
                  const raw = e.target.value
                    .replace(/\./g, "")
                    .replace(/,/g, ".");
                  const num = Number(raw);
                  setMonto(isNaN(num) ? "" : num);
                }}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Cambio
              </label>
              <input
                type="number"
                value={cambio}
                onChange={(e) => setCambio(Number(e.target.value))}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Guardar Pago
            </button>
            <button
              type="button"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
              onClick={handleClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PagoModal;
