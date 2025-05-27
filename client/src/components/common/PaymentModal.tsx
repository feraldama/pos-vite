import React, { useState, useEffect } from "react";

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
}) => {
  const [pagoTipo, setPagoTipoLocal] = useState<"E" | "B" | "D" | "CR" | "C">(
    "E"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setEfectivo(0);
      setBanco(0);
      setBancoDebito(0);
      setBancoCredito(0);
      setCuentaCliente(0);
      setTotalRest(totalCost);
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

  const onNumberClickModal = (label: string | number) => {
    let efe = efectivo;
    let ban = banco;
    let deb = bancoDebito;
    let cred = bancoCredito;
    let cuentaCli = cuentaCliente;
    let totalResto = 0;

    const append = (val: number, label: string | number) => {
      if (val === 0) return Number(label);
      return Number(`${val}${label}`);
    };

    if (pagoTipo === "E") {
      efe = append(efectivo, label);
      totalResto =
        totalCost - efe - banco - bancoDebito - bancoCredito - cuentaCliente;
      setEfectivo(efe);
    } else if (pagoTipo === "B") {
      ban = append(banco, label);
      totalResto =
        totalCost - efectivo - ban - bancoDebito - bancoCredito - cuentaCliente;
      setBanco(ban);
    } else if (pagoTipo === "D") {
      deb = append(bancoDebito, label);
      totalResto =
        totalCost -
        efectivo -
        banco -
        bancoCredito -
        cuentaCliente -
        deb * 1.03;
      setBancoDebito(deb);
    } else if (pagoTipo === "CR") {
      cred = append(bancoCredito, label);
      totalResto =
        totalCost -
        efectivo -
        banco -
        bancoDebito -
        cuentaCliente -
        cred * 1.05;
      setBancoCredito(cred);
    } else if (pagoTipo === "C") {
      cuentaCli = append(cuentaCliente, label);
      totalResto =
        totalCost - efectivo - banco - bancoDebito - bancoCredito - cuentaCli;
      setCuentaCliente(cuentaCli);
    }
    setTotalRest(totalResto);
  };

  const cerarCantidadModal = () => {
    let totalResto = 0;
    if (pagoTipo === "E") {
      totalResto =
        totalCost - banco - bancoDebito - bancoCredito - cuentaCliente;
      setEfectivo(0);
    } else if (pagoTipo === "B") {
      totalResto =
        totalCost - efectivo - bancoDebito - bancoCredito - cuentaCliente;
      setBanco(0);
    } else if (pagoTipo === "D") {
      totalResto = totalCost - efectivo - banco - bancoCredito - cuentaCliente;
      setBancoDebito(0);
    } else if (pagoTipo === "CR") {
      totalResto = totalCost - efectivo - banco - bancoDebito - cuentaCliente;
      setBancoCredito(0);
    } else if (pagoTipo === "C") {
      totalResto = totalCost - efectivo - banco - bancoDebito - bancoCredito;
      setCuentaCliente(0);
    }
    setTotalRest(totalResto);
  };

  const handleSendRequest = async () => {
    setIsSubmitting(true);
    try {
      await sendRequest();
    } finally {
      setIsSubmitting(false);
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
        background: "rgba(0,0,0,0.15)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
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
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            fontSize: 28,
            color: "#888",
            background: "none",
            border: "none",
            cursor: "pointer",
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
                Gs. {new Intl.NumberFormat("es-ES").format(totalCost)}
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
                type="text"
                value={new Intl.NumberFormat("es-ES").format(efectivo)}
                onFocus={(e) => {
                  setPagoTipoLocal("E");
                  // if (efectivo == 0) {
                  //   setEfectivo(totalRest);
                  // setTotalRest(0);
                  // }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setEfectivo(newValue);
                  const totalResto =
                    totalCost -
                    newValue -
                    banco -
                    bancoDebito -
                    bancoCredito -
                    cuentaCliente;
                  setTotalRest(totalResto);
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
                type="text"
                value={new Intl.NumberFormat("es-ES").format(banco)}
                onFocus={(e) => {
                  setPagoTipoLocal("B");
                  if (banco === 0) {
                    setBanco(totalRest);
                    setTotalRest(0);
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setBanco(newValue);
                  const totalResto =
                    totalCost -
                    efectivo -
                    newValue -
                    bancoDebito -
                    bancoCredito -
                    cuentaCliente;
                  setTotalRest(totalResto);
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
                type="text"
                value={new Intl.NumberFormat("es-ES").format(bancoDebito)}
                onFocus={(e) => {
                  setPagoTipoLocal("D");
                  if (bancoDebito === 0) {
                    setBancoDebito(Number((totalRest * 1.03).toFixed(0)));
                    setTotalRest(0);
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setBancoDebito(newValue);
                  const totalResto =
                    totalCost -
                    efectivo -
                    banco -
                    bancoCredito -
                    cuentaCliente -
                    newValue * 1.03;
                  setTotalRest(totalResto);
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
            {/* Tarjeta Crédito */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
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
                type="text"
                value={new Intl.NumberFormat("es-ES").format(bancoCredito)}
                onFocus={(e) => {
                  setPagoTipoLocal("CR");
                  if (bancoCredito === 0) {
                    setBancoCredito(Number((totalRest * 1.05).toFixed(0)));
                    setTotalRest(0);
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setBancoCredito(newValue);
                  const totalResto =
                    totalCost -
                    efectivo -
                    banco -
                    bancoDebito -
                    cuentaCliente -
                    newValue * 1.05;
                  setTotalRest(totalResto);
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
            {/* Cuenta Cliente */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <label
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
                type="text"
                value={new Intl.NumberFormat("es-ES").format(cuentaCliente)}
                onFocus={(e) => {
                  setPagoTipoLocal("C");
                  if (cuentaCliente === 0) {
                    setCuentaCliente(totalRest);
                    setTotalRest(0);
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setCuentaCliente(newValue);
                  const totalResto =
                    totalCost -
                    efectivo -
                    banco -
                    bancoDebito -
                    bancoCredito -
                    newValue;
                  setTotalRest(totalResto);
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
                {totalRest < 0
                  ? new Intl.NumberFormat("es-ES").format(totalRest * -1)
                  : "0"}
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
              Cerar
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
            style={{
              background: "#93c5fd",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              borderRadius: 8,
              padding: "10px 32px",
              border: "none",
              cursor: "pointer",
            }}
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
