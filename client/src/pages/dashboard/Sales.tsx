import { useState, useEffect } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import { getProductosAll } from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import PaymentModal from "../../components/common/PaymentModal";
import Swal from "sweetalert2";
import axios from "axios";
import { js2xml } from "xml-js";
import logo from "../../assets/img/logo.jpg";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";
import ClienteModal from "../../components/common/ClienteModal";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";
import { getLocalById } from "../../services/locales.service";
import { useNavigate } from "react-router-dom";
import ActionButton from "../../components/common/Button/ActionButton";
import PagoModal from "../../components/common/PagoModal";
import { getCombos } from "../../services/combos.service";

interface Cliente {
  ClienteId: number;
  ClienteRUC: string;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteDireccion: string;
  ClienteTelefono: string;
  ClienteTipo: string;
  UsuarioId: string;
}

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

interface Combo {
  ComboId: number;
  ComboDescripcion: string;
  ProductoId: number;
  ComboCantidad: number;
  ComboPrecio: number;
  [key: string]: unknown;
}

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
      ProductoPrecioVentaMayorista: number;
      LocalId: string | number;
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
  const [voucher, setVoucher] = useState(0);
  const [printTicket, setPrintTicket] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>({
      ClienteId: 1,
      ClienteNombre: "Sin Nombre minorista",
      ClienteRUC: "",
      ClienteTelefono: "",
      ClienteTipo: "MI",
      UsuarioId: "",
      ClienteApellido: "",
      ClienteDireccion: "",
    });
  useState<Cliente | null>(null);
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);
  const [localNombre, setLocalNombre] = useState("");
  const navigate = useNavigate();
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [combos, setCombos] = useState<Combo[]>([]);

  const agregarProducto = (producto: {
    id: number;
    nombre: string;
    precio: number;
    precioMayorista?: number;
    imagen: string;
    stock: number;
  }) => {
    // Determinar el precio según el tipo de cliente
    const tipo = clienteSeleccionado?.ClienteTipo || "MI";
    const precioFinal =
      tipo === "MA" && producto.precioMayorista !== undefined
        ? producto.precioMayorista
        : producto.precio;

    const precioSeguro = precioFinal ?? 0;

    const existe = carrito.find((p) => p.id === producto.id);
    if (existe) {
      setCarrito(
        carrito.map((p) =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
        )
      );
    } else {
      setCarrito([
        ...carrito,
        { ...producto, precio: precioSeguro, cantidad: 1 },
      ]);
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

  const total = carrito.reduce((acc, p) => {
    const productoOriginal = productos.find((prod) => prod.ProductoId === p.id);
    const precioUnitario = productoOriginal?.ProductoPrecioVenta ?? p.precio;
    return acc + calcularPrecioConCombo(p.id, p.cantidad, precioUnitario);
  }, 0);

  useEffect(() => {
    setLoading(true);
    getProductosAll()
      .then((data) => {
        setProductos(data.data || []);
      })
      .finally(() => setLoading(false));
    // Traer todos los clientes sin paginación
    getAllClientesSinPaginacion()
      .then((data) => {
        setClientes(data.data || []);
      })
      .catch(() =>
        setClientes([
          {
            ClienteId: 1,
            ClienteRUC: "",
            ClienteNombre: "SIN NOMBRE MINORISTA",
            ClienteApellido: "",
            ClienteDireccion: "",
            ClienteTelefono: "",
            ClienteTipo: "MI",
            UsuarioId: "",
          },
        ])
      );
    // Traer combos
    getCombos(1, 1000).then((data) => setCombos(data.data || []));
  }, []);

  useEffect(() => {
    if (!clienteSeleccionado) return;
    setCarrito((carritoActual) =>
      carritoActual.map((item) => {
        const productoOriginal = productos.find(
          (p) => p.ProductoId === item.id
        );
        if (!productoOriginal) return item;
        const tipo = clienteSeleccionado.ClienteTipo;
        const nuevoPrecio =
          tipo === "MA"
            ? productoOriginal.ProductoPrecioVentaMayorista
            : productoOriginal.ProductoPrecioVenta;
        return { ...item, precio: nuevoPrecio ?? 0 };
      })
    );
  }, [clienteSeleccionado, productos]);

  // Simulación de items y cliente seleccionados (ajusta según tu lógica real)
  const cartItems = carrito.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    quantity: p.cantidad,
    salePrice: p.precio,
    price: p.precio,
    unidad: "U",
    totalPrice: p.precio * p.cantidad,
  }));

  function getSubtotal(items: Array<{ totalPrice: number }>): number {
    return items.reduce(
      (acc: number, item: { totalPrice: number }) => acc + item.totalPrice,
      0
    );
  }

  function calcularPrecioConCombo(
    productoId: number,
    cantidad: number,
    precioUnitario: number
  ) {
    const combo = combos.find(
      (c) => Number(c.ProductoId) === Number(productoId)
    );
    if (!combo) return cantidad * precioUnitario;
    const comboCantidad = Number(combo.ComboCantidad);
    const comboPrecio = Number(combo.ComboPrecio);
    if (cantidad < comboCantidad) {
      return cantidad * precioUnitario;
    }
    const cantidadCombos = Math.floor(cantidad / comboCantidad);
    const cantidadRestante = cantidad % comboCantidad;
    return cantidadCombos * comboPrecio + cantidadRestante * precioUnitario;
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
      ClienteId: clienteSeleccionado?.ClienteId,
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
            _attributes: { xmlns: "WinnersTemple" },
            Sdtproducto: {
              SDTProductoItem: SDTProductoItem,
            },
            Ventafechastring: fechaFormateada,
            Almacenorigenid: user?.LocalId,
            Clientetipo: clienteSeleccionado?.ClienteTipo,
            Cajaid: cajaAperturada?.CajaId,
            Usuarioid: user?.id,
            Efectivo: efectivo,
            Total2: getSubtotal(cartItems),
            Ventatipo: "CO",
            Pagotipo: "E",
            Clienteid: clienteSeleccionado?.ClienteId,
            Efectivoreact: Number(efectivo) + Number(totalRest),
            Bancoreact: Number(bancoDebito) + Number(bancoCredito),
            Clientecuentareact: cuentaCliente,
            Voucherreact: voucher,
            Transferreact: Number(banco),
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
      if (printTicket) {
        generateTicketPDF();
      }
      // Swal.fire("SweetAlert2 is working!");
      let timerInterval: ReturnType<typeof setInterval>;
      Swal.fire({
        title: "Venta realizada con éxito!",
        html: "Nueva venta en <b></b> segundos.",
        timer: 3000,
        timerProgressBar: true,
        width: "90%",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
          const popup = Swal.getPopup();
          if (popup) {
            const timer = popup.querySelector("b");
            if (timer) {
              timerInterval = setInterval(() => {
                const timerLeft = Swal.getTimerLeft();
                const secondsLeft = timerLeft ? Math.ceil(timerLeft / 1000) : 0;
                timer.textContent = `${secondsLeft}`;
              }, 100);
            }
          }
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
          window.location.reload();
        }
      });
    } catch (error) {
      console.error(error);
    }
    // Limpiar estados de pago
    setEfectivo(0);
    setBanco(0);
    setBancoDebito(0);
    setBancoCredito(0);
    setCuentaCliente(0);
    setVoucher(0);
    setTotalRest(0);
    setPrintTicket(false);
    setShowModal(false);
  };

  const generateTicketPDF = () => {
    // Crear una instancia de jsPDF con un tamaño personalizado (80mm de ancho)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297], // 80mm de ancho y 297mm de alto (A4 cortado)
    });

    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, "0");
    const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
    const año = fechaActual.getFullYear().toString().slice(-2);
    const horas = String(fechaActual.getHours()).padStart(2, "0");
    const minutos = String(fechaActual.getMinutes()).padStart(2, "0");
    const segundos = String(fechaActual.getSeconds()).padStart(2, "0");

    const fechaFormateada = `${dia}/${mes}/${año}`;
    const horaFormateada = `${horas}:${minutos}:${segundos}`;

    // Configuración inicial
    doc.setFontSize(8); // Tamaño de fuente más pequeño
    doc.setFont("helvetica", "normal");

    // Encabezado del ticket
    doc.text("Winners", 0, 15);
    doc.text("PADEL", 0, 20);
    doc.text("Carmen de Peña, Itauguá", 0, 25);
    doc.text("Teléfono: +595 981 123456", 0, 30);
    doc.text(`Fecha: ${fechaFormateada} - Hora: ${horaFormateada}`, 0, 35);
    doc.text(
      clienteSeleccionado?.ClienteRUC
        ? "RUC: " + clienteSeleccionado.ClienteRUC
        : "RUC: SIN RUC",
      0,
      40
    );
    doc.text("Cliente: " + (clienteSeleccionado?.ClienteNombre || ""), 0, 45);

    // Línea separadora
    doc.setLineWidth(0.2); // Línea más delgada
    doc.line(0, 48, 75, 48); // Ajustar el ancho de la línea

    // Encabezados de la tabla
    const headers = [["Desc.", "Cant", "Precio", "Total"]];

    // Datos de la tabla
    const tableData = cartItems.map((item) => [
      item.nombre || item.id.toString(),
      item.quantity,
      item.unidad === "U"
        ? item.salePrice.toLocaleString("es-ES")
        : item.price.toLocaleString("es-ES"),
      `Gs. ${item.totalPrice.toLocaleString("es-ES")}`,
    ]);

    // Agregar la tabla al PDF
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 50,
      theme: "plain",
      styles: {
        fontSize: 7,
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
      },
      // headStyles: { fillColor: [200, 200, 200] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 9 },
        2: { cellWidth: 14 },
        3: { cellWidth: 20 },
      },
      margin: { left: 0 }, // Margen izquierdo
    });

    // Total de la compra
    const totalCost = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const lastAutoTable = (
      doc as unknown as { lastAutoTable: { finalY: number } }
    ).lastAutoTable;
    doc.text(
      `Total a Pagar Gs. ${totalCost.toLocaleString("es-ES")}`,
      0,
      lastAutoTable.finalY + 5
    );

    // Pie de página
    doc.text("--GRACIAS POR SU PREFERENCIA--", 0, lastAutoTable.finalY + 10);

    // Guardar el PDF
    doc.save("ticket_venta.pdf");
  };

  useEffect(() => {
    const fetchCaja = async () => {
      if (!user?.id) return;
      try {
        const estado = await getEstadoAperturaPorUsuario(user.id);
        if (estado.cajaId && estado.aperturaId > estado.cierreId) {
          const caja = await getCajaById(estado.cajaId);
          setCajaAperturada(caja);
        } else {
          Swal.fire({
            icon: "warning",
            title: "Caja no aperturada",
            text: "Debes aperturar una caja antes de realizar ventas.",
            confirmButtonColor: "#2563eb",
          }).then(() => {
            navigate("/apertura-cierre-caja");
          });
          setCajaAperturada(null);
        }
      } catch {
        setCajaAperturada(null);
      }
    };
    fetchCaja();
  }, [user, navigate]);

  useEffect(() => {
    if (user?.LocalId) {
      getLocalById(user.LocalId)
        .then((data) => {
          setLocalNombre(data.LocalNombre || "");
        })
        .catch(() => setLocalNombre(""));
    } else {
      setLocalNombre("");
    }
  }, [user?.LocalId]);

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
                {carrito.map((p, idx) => {
                  const productoOriginal = productos.find(
                    (prod) => prod.ProductoId === p.id
                  );
                  const precioUnitario =
                    productoOriginal?.ProductoPrecioVenta ?? p.precio;
                  const precioTotal = calcularPrecioConCombo(
                    p.id,
                    p.cantidad,
                    precioUnitario
                  );
                  return (
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
                      <td
                        style={{ padding: "20px 0", verticalAlign: "middle" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <button
                            onClick={() =>
                              cambiarCantidad(p.id, p.cantidad - 1)
                            }
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
                            onClick={() =>
                              cambiarCantidad(p.id, p.cantidad + 1)
                            }
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
                        {p.id === 1 ? (
                          <input
                            type="number"
                            value={p.precio}
                            min={0}
                            style={{
                              width: 80,
                              height: 32,
                              textAlign: "right",
                              border: "1px solid #d1d5db",
                              borderRadius: 6,
                              background: "#f9fafb",
                              fontSize: 16,
                              fontWeight: 600,
                              color: "#222",
                            }}
                            onChange={(e) => {
                              const nuevoPrecio = Number(e.target.value);
                              setCarrito(
                                carrito.map((item) =>
                                  item.id === 1
                                    ? { ...item, precio: nuevoPrecio }
                                    : item
                                )
                              );
                            }}
                          />
                        ) : (
                          <>Gs. {p.precio.toLocaleString()}</>
                        )}
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
                        Gs. {precioTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pad numérico y botón pagar - NUEVO DISEÑO TAILWIND */}
        <div className="bg-white rounded-xl shadow p-4">
          {/* Total */}
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-lg">Total</span>
            <span className="text-blue-500 font-semibold text-lg">
              Gs. {total.toLocaleString()}
            </span>
          </div>
          {/* Grid de botones */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {/* Botón Pagar grande */}
            <button
              className="row-span-4 bg-blue-500 text-white font-semibold rounded-lg flex items-center justify-center text-lg h-[200px] col-span-1 border-2 border-blue-500 hover:bg-blue-600 transition"
              style={{ minHeight: 215 }}
              onClick={() => setShowModal(true)}
            >
              Pagar
            </button>
            {/* Números y símbolos */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0, ","].map((n) => (
              <button
                key={n}
                className="bg-white border border-gray-200 rounded-lg text-gray-700 font-medium text-lg h-12 flex items-center justify-center hover:bg-gray-100 transition"
                style={{ minWidth: 60 }}
              >
                {n}
              </button>
            ))}
          </div>
          {/* Recuadro inferior para el nombre del cliente */}
          <div className="mt-2">
            <button
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 text-center text-gray-700 font-semibold text-base tracking-wide hover:bg-blue-100 transition cursor-pointer"
              onClick={() => setShowClienteModal(true)}
            >
              {clienteSeleccionado?.ClienteNombre ||
                clientes[0]?.ClienteNombre ||
                "SIN NOMBRE MINORISTA"}
            </button>
            <ClienteModal
              show={showClienteModal}
              onClose={() => setShowClienteModal(false)}
              clientes={clientes}
              onSelect={(cliente: Cliente) => {
                setClienteSeleccionado(cliente);
                setShowClienteModal(false);
              }}
            />
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
            hideButton={true}
          />
          {user && (
            <div
              style={{
                marginLeft: 24,
                fontWeight: 600,
                color: "#222",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>
                {user.nombre + " "}
                <span style={{ color: "#888", fontWeight: 400 }}>
                  ({user.id})
                </span>
              </span>
              {localNombre && (
                <span style={{ color: "#e53935", fontWeight: 500 }}>
                  | Local: {localNombre}
                </span>
              )}
              {cajaAperturada && (
                <span style={{ color: "#2563eb", fontWeight: 500 }}>
                  | Caja: {cajaAperturada.CajaDescripcion}
                </span>
              )}
              <ActionButton
                label="Apertura/Cierre"
                onClick={() => navigate("/apertura-cierre-caja")}
                className="bg-blue-500 hover:bg-blue-700 text-white"
              />
              <ActionButton
                label="Pagos"
                onClick={() => setShowPagoModal(true)}
                className="bg-green-500 hover:bg-green-700 text-white"
              />
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
                .filter(
                  (p) =>
                    p.ProductoNombre.toLowerCase().includes(
                      busqueda.toLowerCase()
                    ) &&
                    (Number(p.LocalId) === 0 ||
                      Number(p.LocalId) === Number(cajaAperturada?.CajaId))
                )
                .map((p) => (
                  <ProductCard
                    key={p.ProductoId}
                    // id={p.ProductoId}
                    nombre={p.ProductoNombre}
                    precio={p.ProductoPrecioVenta}
                    precioMayorista={p.ProductoPrecioVentaMayorista}
                    clienteTipo={clienteSeleccionado?.ClienteTipo || "MI"}
                    imagen={
                      p.ProductoImagen
                        ? `data:image/jpeg;base64,${p.ProductoImagen}`
                        : logo //"https://via.placeholder.com/80x120?text=Sin+Imagen"
                    }
                    stock={p.ProductoStock}
                    onAdd={() =>
                      agregarProducto({
                        id: p.ProductoId,
                        nombre: p.ProductoNombre,
                        precio: p.ProductoPrecioVenta,
                        precioMayorista: p.ProductoPrecioVentaMayorista,
                        imagen: p.ProductoImagen
                          ? `data:image/jpeg;base64,${p.ProductoImagen}`
                          : logo, //"https://via.placeholder.com/80x120?text=Sin+Imagen",
                        stock: p.ProductoStock,
                      })
                    }
                  />
                ))
            )}
          </div>
        </div>
        <PagoModal
          show={showPagoModal}
          handleClose={() => setShowPagoModal(false)}
          cajaAperturada={cajaAperturada}
          usuario={user}
        />
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
        voucher={voucher}
        setVoucher={setVoucher}
      />
    </div>
  );
}
