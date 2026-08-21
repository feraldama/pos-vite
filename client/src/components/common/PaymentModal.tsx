import React, { useState, useEffect } from "react";
import { formatMiles } from "../../utils/formato";

interface PaymentModalProps {
  show: boolean;
  handleClose: () => void;
  totalCost: number;
  totalRest: number;
  setTotalRest: (v: number) => void;
  efectivo: number;
  setEfectivo: (v: number) => void;
  banco: number;
  setBanco: (v: number) => void;
  bancoDebito: number;
  setBancoDebito: (v: number) => void;
  bancoCredito: number;
  setBancoCredito: (v: number) => void;
  cuentaCliente: number;
  setCuentaCliente: (v: number) => void;
  sendRequest: () => Promise<void>;
  setPrintTicket: (v: boolean) => void;
  printTicket: boolean;
  voucher: number;
  setVoucher: (v: number) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  handleClose,
  totalCost,
  totalRest,
  setTotalRest,
  efectivo,
  setEfectivo,
  banco,
  setBanco,
  bancoDebito,
  setBancoDebito,
  bancoCredito,
  setBancoCredito,
  cuentaCliente,
  setCuentaCliente,
  sendRequest,
  setPrintTicket,
  printTicket,
  voucher,
  setVoucher,
}) => {
  const [pagoTipo, setPagoTipoLocal] = useState<
    "E" | "B" | "D" | "CR" | "C" | "V"
  >("E");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Al enfocar un medio de pago el campo se autocompleta con el saldo y se
  // selecciona, que es la señal de "escribí para reemplazar". Con el teclado
  // físico eso funciona solo, pero el teclado en pantalla escribía sobre el
  // state y concatenaba: enfocar Débito (103.000) y tocar "1" daba 1.030.001.
  // Esta bandera hace que la primera tecla reemplace, igual que el físico.
  const [reemplazarAlTeclear, setReemplazarAlTeclear] = useState(true);

  useEffect(() => {
    if (show) {
      setEfectivo(0);
      setBanco(0);
      setBancoDebito(0);
      setBancoCredito(0);
      setCuentaCliente(0);
      setTotalRest(totalCost);
      setTimeout(() => {
        const efectivoInput = document.getElementById("efectivo-input");
        if (efectivoInput) {
          efectivoInput.focus();
        }
      }, 100);
    }
  }, [
    show,
    setEfectivo,
    setBanco,
    setBancoDebito,
    setBancoCredito,
    setCuentaCliente,
    setTotalRest,
    totalCost,
  ]);

  // Recargo que paga el cliente por pagar con tarjeta. Sólo afecta lo que se
  // cobra y lo que se imprime, no cuánto cubre de la venta.
  const RECARGO_DEBITO = 1.03;
  const RECARGO_CREDITO = 1.05;

  /** Lo que hay que pasar por el posnet: el importe base más el recargo. */
  const conRecargo = (base: number, recargo: number) =>
    Math.round(base * recargo);

  /**
   * Saldo pendiente de la venta. Única fórmula del componente: antes cada
   * medio de pago recalculaba el saldo por su cuenta y sólo las ramas de
   * débito y crédito aplicaban el recargo, así que el saldo cambiaba según qué
   * campo estuviera seleccionado (con débito 50.000 sobre 100.000 decía 48.500
   * parado en Débito y 50.000 parado en Efectivo).
   *
   * El monto que se carga en Tarjeta Débito/Crédito es el importe BASE, que es
   * lo que cubre de la venta. El 3% / 5% es un recargo que paga el cliente por
   * encima y que imprime el ticket (ver `ticketAlquiler.ts`, que muestra
   * `base * 1,03`), así que no entra en este cálculo: si entrara, la venta se
   * daría por saldada cobrando menos de lo que vale.
   */
  const calcularResto = (cambios: {
    efectivo?: number;
    banco?: number;
    bancoDebito?: number;
    bancoCredito?: number;
    cuentaCliente?: number;
    voucher?: number;
  } = {}) => {
    const e = cambios.efectivo ?? efectivo;
    const b = cambios.banco ?? banco;
    const d = cambios.bancoDebito ?? bancoDebito;
    const c = cambios.bancoCredito ?? bancoCredito;
    const cc = cambios.cuentaCliente ?? cuentaCliente;
    const v = cambios.voucher ?? voucher;
    const resto = totalCost - e - b - d - c - cc - v;
    // El guaraní no tiene centavos: un residuo menor a 1 Gs es la venta saldada
    return Math.abs(resto) < 1 ? 0 : Math.round(resto);
  };

  const onNumberClickModal = (label: string | number) => {
    const append = (val: number) => {
      // Primera tecla despues de enfocar: reemplaza en vez de concatenar
      const base = reemplazarAlTeclear ? 0 : val;
      if (base === 0) return Number(label);
      return Number(`${base}${label}`);
    };
    setReemplazarAlTeclear(false);

    if (pagoTipo === "E") {
      const v = append(efectivo);
      setEfectivo(v);
      setTotalRest(calcularResto({ efectivo: v }));
    } else if (pagoTipo === "B") {
      const v = append(banco);
      setBanco(v);
      setTotalRest(calcularResto({ banco: v }));
    } else if (pagoTipo === "D") {
      const v = append(bancoDebito);
      setBancoDebito(v);
      setTotalRest(calcularResto({ bancoDebito: v }));
    } else if (pagoTipo === "CR") {
      const v = append(bancoCredito);
      setBancoCredito(v);
      setTotalRest(calcularResto({ bancoCredito: v }));
    } else if (pagoTipo === "C") {
      const v = append(cuentaCliente);
      setCuentaCliente(v);
      setTotalRest(calcularResto({ cuentaCliente: v }));
    } else if (pagoTipo === "V") {
      const v = append(voucher);
      setVoucher(v);
      setTotalRest(calcularResto({ voucher: v }));
    }
  };

  /** Borra el monto del medio de pago seleccionado. */
  const cerarCantidadModal = () => {
    setReemplazarAlTeclear(true);
    if (pagoTipo === "E") {
      setEfectivo(0);
      setTotalRest(calcularResto({ efectivo: 0 }));
    } else if (pagoTipo === "B") {
      setBanco(0);
      setTotalRest(calcularResto({ banco: 0 }));
    } else if (pagoTipo === "D") {
      setBancoDebito(0);
      setTotalRest(calcularResto({ bancoDebito: 0 }));
    } else if (pagoTipo === "CR") {
      setBancoCredito(0);
      setTotalRest(calcularResto({ bancoCredito: 0 }));
    } else if (pagoTipo === "C") {
      setCuentaCliente(0);
      setTotalRest(calcularResto({ cuentaCliente: 0 }));
    } else if (pagoTipo === "V") {
      setVoucher(0);
      setTotalRest(calcularResto({ voucher: 0 }));
    }
  };

  const handleSendRequest = async () => {
    setIsSubmitting(true);
    try {
      await sendRequest();
    } finally {
      setIsSubmitting(false);
    }
  };

  // onKeyDown en vez del onKeyPress deprecado, y Escape para cerrar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting && totalRest <= 0) {
      handleSendRequest();
    }
    if (e.key === "Escape" && !isSubmitting) {
      handleClose();
    }
  };

  const buttonsPago = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ["00", 0, "000"],
  ];

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15,23,42,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Cobro"
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: 800,
          maxWidth: "98vw",
          boxShadow: "0 8px 32px #0002",
          padding: 32,
          position: "relative",
        }}
      >
        <button
          onClick={handleClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            fontSize: 28,
            lineHeight: 1,
            color: "#475569",
            background: "none",
            border: "none",
            cursor: "pointer",
            minWidth: 44,
            minHeight: 44,
          }}
        >
          ×
        </button>
        <h2
          style={{
            fontWeight: 700,
            fontSize: 26,
            marginBottom: 24,
            color: "#2d3748",
          }}
        >
          Seleccione un método de pago
        </h2>
        <div style={{ display: "flex", gap: 24 }}>
          {/* Columna izquierda */}
          <div style={{ flex: 1 }}>
            {/* TOTAL */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  background: "#e9eef7",
                  borderRadius: 6,
                  padding: "8px 22px",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#3b4256",
                  marginRight: 8,
                }}
              >
                Total
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 28,
                  color: "#2ecc40",
                  background: "#f7fafc",
                  borderRadius: 6,
                  padding: "8px 22px",
                }}
              >
                Gs. {formatMiles(totalCost)}
              </div>
            </div>
            {/* Efectivo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
                htmlFor="efectivo-input"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#444",
                  textAlign: "right",
                  marginRight: 8,
                }}
              >
                Efectivo:
              </label>
              <input
                id="efectivo-input"
                type="text"
                value={formatMiles(efectivo)}
                onFocus={(e) => {
                  setPagoTipoLocal("E");
                  setReemplazarAlTeclear(true);
                  // if (efectivo == 0) {
                  //   setEfectivo(totalRest);
                  // setTotalRest(0);
                  // }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setEfectivo(newValue);
                  setTotalRest(calcularResto({ efectivo: newValue }));
                }}
                style={{
                  width: 120,
                  padding: "6px 10px",
                  border:
                    pagoTipo === "E"
                      ? "2px solid #a5b4fc"
                      : "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 16,
                  textAlign: "right",
                  background: pagoTipo === "E" ? "#f0f6ff" : "#f9fafb",
                  outline: "none",
                }}
              />
            </div>
            {/* Transferencia */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
                htmlFor="banco-input"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#444",
                  textAlign: "right",
                  marginRight: 8,
                }}
              >
                Transferencia:
              </label>
              <input
                id="banco-input"
                type="text"
                value={formatMiles(banco)}
                onFocus={(e) => {
                  setPagoTipoLocal("B");
                  setReemplazarAlTeclear(true);
                  if (banco === 0 && totalRest > 0) {
                    setBanco(totalRest);
                    setTotalRest(calcularResto({ banco: totalRest }));
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setBanco(newValue);
                  setTotalRest(calcularResto({ banco: newValue }));
                }}
                style={{
                  width: 120,
                  padding: "6px 10px",
                  border:
                    pagoTipo === "B"
                      ? "2px solid #a5b4fc"
                      : "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 16,
                  textAlign: "right",
                  background: pagoTipo === "B" ? "#f0f6ff" : "#f9fafb",
                  outline: "none",
                }}
              />
            </div>
            {/* Tarjeta Débito */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
                htmlFor="debito-input"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#444",
                  textAlign: "right",
                  marginRight: 8,
                }}
              >
                Tarjeta Débito (3% adicional):
              </label>
              <input
                id="debito-input"
                aria-describedby={
                  bancoDebito > 0 ? "debito-recargo" : undefined
                }
                type="text"
                value={formatMiles(bancoDebito)}
                onFocus={(e) => {
                  setPagoTipoLocal("D");
                  setReemplazarAlTeclear(true);
                  if (bancoDebito === 0 && totalRest > 0) {
                    // La base que cubre el saldo es el saldo mismo; el 3% se le
                    // suma al cliente en el ticket
                    setBancoDebito(totalRest);
                    setTotalRest(calcularResto({ bancoDebito: totalRest }));
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setBancoDebito(newValue);
                  setTotalRest(calcularResto({ bancoDebito: newValue }));
                }}
                style={{
                  width: 120,
                  padding: "6px 10px",
                  border:
                    pagoTipo === "D"
                      ? "2px solid #a5b4fc"
                      : "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 16,
                  textAlign: "right",
                  background: pagoTipo === "D" ? "#f0f6ff" : "#f9fafb",
                  outline: "none",
                }}
              />
            </div>
            {bancoDebito > 0 && (
              <p id="debito-recargo" style={{
                margin: "-4px 0 10px",
                fontSize: 13,
                fontWeight: 600,
                color: "#b45309",
                textAlign: "right",
              }}>
                Se cobra Gs.{" "}
                {formatMiles(conRecargo(bancoDebito, RECARGO_DEBITO))} con el 3%
                adicional
              </p>
            )}
            {/* Tarjeta Crédito */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
                htmlFor="credito-input"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#444",
                  textAlign: "right",
                  marginRight: 8,
                }}
              >
                Tarjeta Crédito (5% adicional):
              </label>
              <input
                id="credito-input"
                aria-describedby={
                  bancoCredito > 0 ? "credito-recargo" : undefined
                }
                type="text"
                value={formatMiles(bancoCredito)}
                onFocus={(e) => {
                  setPagoTipoLocal("CR");
                  setReemplazarAlTeclear(true);
                  if (bancoCredito === 0 && totalRest > 0) {
                    setBancoCredito(totalRest);
                    setTotalRest(calcularResto({ bancoCredito: totalRest }));
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setBancoCredito(newValue);
                  setTotalRest(calcularResto({ bancoCredito: newValue }));
                }}
                style={{
                  width: 120,
                  padding: "6px 10px",
                  border:
                    pagoTipo === "CR"
                      ? "2px solid #a5b4fc"
                      : "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 16,
                  textAlign: "right",
                  background: pagoTipo === "CR" ? "#f0f6ff" : "#f9fafb",
                  outline: "none",
                }}
              />
            </div>
            {bancoCredito > 0 && (
              <p id="credito-recargo" style={{
                margin: "-4px 0 10px",
                fontSize: 13,
                fontWeight: 600,
                color: "#b45309",
                textAlign: "right",
              }}>
                Se cobra Gs.{" "}
                {formatMiles(conRecargo(bancoCredito, RECARGO_CREDITO))} con el
                5% adicional
              </p>
            )}
            {/* Cuenta Cliente */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
                htmlFor="cuenta-input"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#444",
                  textAlign: "right",
                  marginRight: 8,
                }}
              >
                Cuenta de cliente:
              </label>
              <input
                id="cuenta-input"
                type="text"
                value={formatMiles(cuentaCliente)}
                onFocus={(e) => {
                  setPagoTipoLocal("C");
                  setReemplazarAlTeclear(true);
                  if (cuentaCliente === 0 && totalRest > 0) {
                    setCuentaCliente(totalRest);
                    setTotalRest(calcularResto({ cuentaCliente: totalRest }));
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setCuentaCliente(newValue);
                  setTotalRest(calcularResto({ cuentaCliente: newValue }));
                }}
                style={{
                  width: 120,
                  padding: "6px 10px",
                  border:
                    pagoTipo === "C"
                      ? "2px solid #a5b4fc"
                      : "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 16,
                  textAlign: "right",
                  background: pagoTipo === "C" ? "#f0f6ff" : "#f9fafb",
                  outline: "none",
                }}
              />
            </div>
            {/* Voucher */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
                htmlFor="voucher-input"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#444",
                  textAlign: "right",
                  marginRight: 8,
                }}
              >
                Voucher:
              </label>
              <input
                id="voucher-input"
                type="text"
                value={formatMiles(voucher)}
                onFocus={(e) => {
                  setPagoTipoLocal("V");
                  setReemplazarAlTeclear(true);
                  if (voucher === 0 && totalRest > 0) {
                    setVoucher(totalRest);
                    setTotalRest(calcularResto({ voucher: totalRest }));
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setVoucher(newValue);
                  setTotalRest(calcularResto({ voucher: newValue }));
                }}
                style={{
                  width: 120,
                  padding: "6px 10px",
                  border:
                    pagoTipo === "V"
                      ? "2px solid #a5b4fc"
                      : "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 16,
                  textAlign: "right",
                  background: pagoTipo === "V" ? "#f0f6ff" : "#f9fafb",
                  outline: "none",
                }}
              />
            </div>
            {/* Total a cobrar por posnet, que es lo que el cajero tiene que
                tipear en la terminal */}
            {(bancoDebito > 0 || bancoCredito > 0) && (
              <div
                style={{
                  marginTop: 16,
                  padding: "8px 12px",
                  border: "1px solid #fcd34d",
                  background: "#fffbeb",
                  borderRadius: 8,
                  fontSize: 15,
                  color: "#92400e",
                }}
              >
                A pasar por posnet:{" "}
                <b>
                  Gs.{" "}
                  {formatMiles(
                    conRecargo(bancoDebito, RECARGO_DEBITO) +
                      conRecargo(bancoCredito, RECARGO_CREDITO)
                  )}
                </b>
              </div>
            )}
            {/* Vuelto */}
            <div
              style={{
                fontWeight: 700,
                fontSize: 28,
                color: "#374151",
                marginTop: 24,
              }}
            >
              Vuelto:{" "}
              <span style={{ color: totalRest < 0 ? "red" : "#000" }}>
                {totalRest < 0 ? formatMiles(totalRest * -1) : "0"}
              </span>
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={printTicket}
                onChange={(e) => setPrintTicket(e.target.checked)}
                id="imprimir"
              />
              <label
                htmlFor="imprimir"
                style={{ fontSize: 17, color: "#6b7280", fontWeight: 500 }}
              >
                Imprimir ticket
              </label>
            </div>
          </div>
          {/* Columna derecha: Pad numérico */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 10,
              }}
            >
              {buttonsPago.flat().map((label, idx) => (
                <button
                  key={idx}
                  style={{
                    height: 54,
                    fontSize: 22,
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onClick={() => onNumberClickModal(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              style={{
                height: 48,
                fontSize: 18,
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
              }}
              onClick={cerarCantidadModal}
            >
              Borrar
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 32,
          }}
        >
          <button
            style={{
              background: "#e5e7eb",
              color: "#374151",
              fontWeight: 600,
              fontSize: 18,
              borderRadius: 8,
              padding: "10px 32px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            className={`px-8 py-2.5 rounded-lg font-bold text-lg border-none transition-colors duration-200
              ${
                isSubmitting || totalRest > 0
                  ? "bg-blue-200 text-white cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              }
            `}
            onClick={handleSendRequest}
            disabled={isSubmitting || totalRest > 0}
          >
            Facturar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
