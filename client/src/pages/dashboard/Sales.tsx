import React, { useState, useEffect } from "react";
import ActionButton from "../../components/common/Button/ActionButton";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import { getProductosAll } from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import PaymentModal from "../../components/common/PaymentModal";
import Swal from "sweetalert2";
import axios from "axios";
import { js2xml } from "xml-js";

export default function Sales() {
  const [carrito, setCarrito] = useState<
    {
      id: number;
      nombre: string;
      precio: number;
      imagen: string;
      stock: number;
      cantidad: number;
    }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<
    {
      ProductoId: number;
      ProductoNombre: string;
      ProductoPrecioVenta: number;
      ProductoStock: number;
      ProductoImagen?: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  // const [modalPago, setModalPago] = useState(false);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [totalRest, setTotalRest] = useState(0);
  const [efectivo, setEfectivo] = useState(0);
  const [banco, setBanco] = useState(0);
  const [bancoDebito, setBancoDebito] = useState(0);
  const [bancoCredito, setBancoCredito] = useState(0);
  const [cuentaCliente, setCuentaCliente] = useState(0);
  // const [voucher, setVoucher] = useState(0);
  const [printTicket, setPrintTicket] = useState(false);

  const agregarProducto = (producto: {
    id: number;
    nombre: string;
    precio: number;
    imagen: string;
    stock: number;
  }) => {
    const existe = carrito.find((p) => p.id === producto.id);
    if (existe) {
      setCarrito(
        carrito.map((p) =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const quitarProducto = (id: number) => {
    setCarrito(carrito.filter((p) => p.id !== id));
  };

  const cambiarCantidad = (id: number, cantidad: number) => {
    setCarrito(
      carrito.map((p) =>
        p.id === id ? { ...p, cantidad: Math.max(1, cantidad) } : p
      )
    );
  };

  const total = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);

  useEffect(() => {
    setLoading(true);
    getProductosAll()
      .then((data) => {
        setProductos(data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Simulación de items y cliente seleccionados (ajusta según tu lógica real)
  const cartItems = carrito.map((p) => ({
    id: p.id,
    quantity: p.cantidad,
    salePrice: p.precio,
    price: p.precio,
    unidad: "U",
    totalPrice: p.precio * p.cantidad,
  }));
  const selectedCustomer = { ClienteId: 1, ClienteTipo: "NORMAL" };

  function getSubtotal(items: Array<{ totalPrice: number }>): number {
    return items.reduce(
      (acc: number, item: { totalPrice: number }) => acc + item.totalPrice,
      0
    );
  }

  const sendRequest = async () => {
    const fecha = new Date();
    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    const año = fecha.getFullYear() % 100;
    const diaStr = dia < 10 ? `0${dia}` : dia.toString();
    const mesStr = mes < 10 ? `0${mes}` : mes.toString();
    const añoStr = año < 10 ? `0${año}` : año.toString();
    const fechaFormateada = `${diaStr}/${mesStr}/${añoStr}`;

    const SDTProductoItem = cartItems.map((producto) => ({
      ClienteId: selectedCustomer.ClienteId,
      Producto: {
        ProductoId: producto.id,
        VentaProductoCantidad: producto.quantity,
        ProductoPrecioVenta: producto.salePrice,
        ProductoUnidad: producto.unidad,
        VentaProductoPrecioTotal: producto.totalPrice,
        Combo: "N",
        ComboPrecio: 0,
      },
    }));

    const json = {
      Envelope: {
        _attributes: { xmlns: "http://schemas.xmlsoap.org/soap/envelope/" },
        Body: {
          "PVentaConfirmarWS.VENTACONFIRMAR": {
            _attributes: { xmlns: "PosViteAlonso" },
            Sdtproducto: {
              SDTProductoItem: SDTProductoItem,
            },
            Ventafechastring: fechaFormateada,
            Almacenorigenid: 1,
            Clientetipo: selectedCustomer.ClienteTipo,
            Cajaid: 1,
            Usuarioid: "vendedor",
            Efectivo: efectivo,
            Total2: getSubtotal(cartItems),
            Ventatipo: "CO",
            Pagotipo: "E",
            Clienteid: selectedCustomer.ClienteId,
            Efectivoreact: Number(efectivo) + Number(totalRest),
            Bancoreact:
              Number(banco) + Number(bancoDebito) + Number(bancoCredito),
            Clientecuentareact: cuentaCliente,
            // Voucherreact: voucher,
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
        import.meta.env.VITE_APP_URL +
          import.meta.env.VITE_APP_URL_GENEXUS +
          "apventaconfirmarws",
        xml,
        config
      );
      Swal.fire("SweetAlert2 is working!");
      // let timerInterval: ReturnType<typeof setInterval>;
      // Swal.fire({
      //   title: "Venta realizada con éxito!",
      //   html: "Nueva venta en <b></b> segundos.",
      //   timer: 3000,
      //   timerProgressBar: true,
      //   width: "90%",
      //   allowOutsideClick: false,
      //   allowEscapeKey: false,
      //   didOpen: () => {
      //     Swal.showLoading();
      //     const popup = Swal.getPopup();
      //     if (popup) {
      //       // Verificación de null
      //       const timer = popup.querySelector("b");
      //       if (timer) {
      //         // Verificación adicional por si querySelector no encuentra el elemento
      //         timerInterval = setInterval(() => {
      //           const secondsLeft = Math.ceil(Swal?.getTimerLeft() / 1000);
      //           if (timer) timer.textContent = `${secondsLeft}`;
      //         }, 100);
      //       }
      //     }
      //   },
      //   willClose: () => {
      //     clearInterval(timerInterval);
      //   },
      // }).then((result) => {
      //   if (result.dismiss === Swal.DismissReason.timer) {
      //     window.location.reload();
      //   }
      // });
    } catch (error) {
      console.error(error);
    }
    // Limpiar estados de pago
    setEfectivo(0);
    setBanco(0);
    setBancoDebito(0);
    setBancoCredito(0);
    setCuentaCliente(0);
    // setVoucher(0);
    setTotalRest(0);
    setPrintTicket(false);
    setShowModal(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f8ff" }}>
      {/* Lado Izquierdo */}
      <div
        style={{
          flex: 1,
          background: "#f5f8ff",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 16px #0001",
            padding: 0,
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            maxHeight: "80vh",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", background: "#f5f8ff" }}>
                  <th
                    style={{
                      padding: "16px 0 16px 24px",
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    Nombre
                  </th>
                  <th
                    style={{ padding: "16px 0", fontWeight: 600, fontSize: 15 }}
                  >
                    Cantidad
                  </th>
                  <th
                    style={{ padding: "16px 0", fontWeight: 600, fontSize: 15 }}
                  >
                    Precio Uni.
                  </th>
                  <th
                    style={{
                      padding: "16px 24px 16px 0",
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((p, idx) => (
                  <tr
                    key={p.id}
                    style={{
                      background: "#fff",
                      borderBottom:
                        idx !== carrito.length - 1
                          ? "1px solid #e5e7eb"
                          : "none",
                    }}
                  >
                    <td
                      style={{
                        padding: "20px 0 20px 24px",
                        verticalAlign: "middle",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: "contain",
                            borderRadius: 8,
                            background: "#f5f8ff",
                            boxShadow: "0 1px 4px #0001",
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 17,
                              color: "#222",
                              lineHeight: 1.2,
                            }}
                          >
                            {p.nombre}
                          </div>
                          <div
                            style={{
                              color: "#e53935",
                              fontSize: 14,
                              marginTop: 4,
                              cursor: "pointer",
                            }}
                            onClick={() => quitarProducto(p.id)}
                          >
                            Eliminar
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "20px 0", verticalAlign: "middle" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          onClick={() => cambiarCantidad(p.id, p.cantidad - 1)}
                          style={{
                            width: 32,
                            height: 32,
                            border: "1px solid #d1d5db",
                            borderRadius: 6,
                            background: "#f9fafb",
                            color: "#374151",
                            fontSize: 18,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={p.cantidad}
                          min={1}
                          style={{
                            width: 40,
                            height: 32,
                            textAlign: "center",
                            border: "1px solid #d1d5db",
                            borderRadius: 6,
                            background: "#f9fafb",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#222",
                            margin: "0 2px",
                          }}
                          readOnly
                        />
                        <button
                          onClick={() => cambiarCantidad(p.id, p.cantidad + 1)}
                          style={{
                            width: 32,
                            height: 32,
                            border: "1px solid #d1d5db",
                            borderRadius: 6,
                            background: "#f9fafb",
                            color: "#374151",
                            fontSize: 18,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "20px 0",
                        verticalAlign: "middle",
                        textAlign: "right",
                        fontWeight: 500,
                        fontSize: 17,
                        color: "#374151",
                      }}
                    >
                      Gs. {p.precio.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "20px 24px 20px 0",
                        verticalAlign: "middle",
                        textAlign: "right",
                        fontWeight: 500,
                        fontSize: 17,
                        color: "#374151",
                      }}
                    >
                      Gs. {(p.precio * p.cantidad).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pad numérico y botón pagar */}
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 2px 8px #0001",
            padding: 16,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 16 }}
          >
            <ActionButton
              label="Pagar"
              onClick={() => setShowModal(true)}
              className="text-white rounded-lg flex-shrink-0"
            />
            <div style={{ marginLeft: 24, fontSize: 24 }}>
              Total: <b>Gs. {total.toLocaleString()}</b>
            </div>
          </div>
          {/* Pad numérico simple */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 60px)",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, ","].map((n) => (
              <button key={n} style={{ height: 48, fontSize: 20 }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1 }}>Cant.</button>
            <button style={{ flex: 1 }}>% de desc.</button>
            <button style={{ flex: 1 }}>Borrar</button>
          </div>
        </div>
      </div>
      {/* Lado Derecho */}
      <div style={{ flex: 2, padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
            justifyContent: "space-between",
          }}
        >
          <SearchButton
            searchTerm={busqueda}
            onSearch={setBusqueda}
            onSearchSubmit={() => {}}
            placeholder="Buscar productos"
          />
          {user && (
            <div
              style={{
                marginLeft: 24,
                fontWeight: 600,
                color: "#222",
                fontSize: 16,
              }}
            >
              {user.nombre}{" "}
              <span style={{ color: "#888", fontWeight: 400, fontSize: 14 }}>
                ({user.id})
              </span>
            </div>
          )}
        </div>
        {/* Nuevo contenedor con scroll solo para los productos */}
        <div
          style={{
            height: "calc(100vh - 120px)", // Ajusta este valor si es necesario
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {loading ? (
              <div>Cargando productos...</div>
            ) : (
              productos
                .filter((p) =>
                  p.ProductoNombre.toLowerCase().includes(
                    busqueda.toLowerCase()
                  )
                )
                .map((p) => (
                  <ProductCard
                    key={p.ProductoId}
                    // id={p.ProductoId}
                    nombre={p.ProductoNombre}
                    precio={p.ProductoPrecioVenta}
                    imagen={
                      p.ProductoImagen
                        ? `data:image/jpeg;base64,${p.ProductoImagen}`
                        : "https://via.placeholder.com/80x120?text=Sin+Imagen"
                    }
                    stock={p.ProductoStock}
                    onAdd={() =>
                      agregarProducto({
                        id: p.ProductoId,
                        nombre: p.ProductoNombre,
                        precio: p.ProductoPrecioVenta,
                        imagen: p.ProductoImagen
                          ? `data:image/jpeg;base64,${p.ProductoImagen}`
                          : "https://via.placeholder.com/80x120?text=Sin+Imagen",
                        stock: p.ProductoStock,
                      })
                    }
                  />
                ))
            )}
          </div>
        </div>
      </div>
      <PaymentModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        totalCost={total}
        totalRest={totalRest}
        setTotalRest={setTotalRest}
        efectivo={efectivo}
        setEfectivo={setEfectivo}
        setPrintTicket={setPrintTicket}
        printTicket={printTicket}
        banco={banco}
        setBanco={setBanco}
        bancoDebito={bancoDebito}
        setBancoDebito={setBancoDebito}
        bancoCredito={bancoCredito}
        setBancoCredito={setBancoCredito}
        cuentaCliente={cuentaCliente}
        setCuentaCliente={setCuentaCliente}
        sendRequest={sendRequest}
        // voucher={voucher}
        // setVoucher={setVoucher}
      />
    </div>
  );
}
