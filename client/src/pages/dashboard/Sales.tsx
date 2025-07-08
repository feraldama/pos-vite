import { useState, useEffect, useRef } from "react";
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
import { formatMiles } from "../../utils/utils";

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
      caja: boolean;
      cartItemId: number;
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
      ProductoPrecioUnitario: number;
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
      ClienteNombre: "SIN NOMBRE MINORISTA",
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
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const cantidadRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (selectedProductId !== null && cantidadRefs.current[selectedProductId]) {
      cantidadRefs.current[selectedProductId]?.focus();
    }
  }, [selectedProductId, carrito.length]);

  const agregarProducto = (producto: {
    id: number;
    nombre: string;
    precio: number;
    precioMayorista?: number;
    imagen: string;
    stock: number;
  }) => {
    const tipo = clienteSeleccionado?.ClienteTipo || "MI";
    const precioFinal =
      tipo === "MA" && producto.precioMayorista !== undefined
        ? producto.precioMayorista
        : producto.precio;

    const precioSeguro = precioFinal ?? 0;

    const nuevoCartItemId = Date.now() + Math.random();
    setCarrito([
      ...carrito,
      {
        ...producto,
        precio: precioSeguro,
        cantidad: 1,
        caja: true, // Por defecto true
        cartItemId: nuevoCartItemId,
      },
    ]);
    setSelectedProductId(nuevoCartItemId); // Focus en el input de cantidad del producto nuevo
  };

  const quitarProducto = (cartItemId: number) => {
    setCarrito(carrito.filter((p) => p.cartItemId !== cartItemId));
  };

  const cambiarCantidad = (cartItemId: number, cantidad: number) => {
    setCarrito(
      carrito.map((p) =>
        p.cartItemId === cartItemId
          ? { ...p, cantidad: Math.max(1, cantidad) }
          : p
      )
    );
  };

  // Función para obtener el precio unitario según el check Caja
  const obtenerPrecio = (p: (typeof carrito)[0]) => {
    const productoOriginal = productos.find((prod) => prod.ProductoId === p.id);
    if (!productoOriginal) return 0;
    if (p.caja) {
      return clienteSeleccionado?.ClienteTipo === "MA"
        ? productoOriginal.ProductoPrecioVentaMayorista
        : productoOriginal.ProductoPrecioVenta;
    } else {
      const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
      if (combo) {
        // El precio unitario se calcula en base al combo
        return (
          calcularPrecioConCombo(
            p.id,
            p.cantidad,
            productoOriginal.ProductoPrecioUnitario
          ) / p.cantidad
        );
      }
      return productoOriginal.ProductoPrecioUnitario;
    }
  };

  // Función para obtener el total según el check Caja
  const obtenerTotal = (p: (typeof carrito)[0]) => {
    const productoOriginal = productos.find((prod) => prod.ProductoId === p.id);
    if (!productoOriginal) return 0;
    if (p.caja) {
      const precio =
        clienteSeleccionado?.ClienteTipo === "MA"
          ? productoOriginal.ProductoPrecioVentaMayorista
          : productoOriginal.ProductoPrecioVenta;
      return precio * p.cantidad;
    } else {
      const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
      if (combo) {
        return calcularPrecioConCombo(
          p.id,
          p.cantidad,
          productoOriginal.ProductoPrecioUnitario
        );
      }
      return productoOriginal.ProductoPrecioUnitario * p.cantidad;
    }
  };

  const total = carrito.reduce((acc, p) => acc + obtenerTotal(p), 0);

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

    const SDTProductoItem = carrito.map((p) => {
      const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
      const productoOriginal = productos.find(
        (prod) => p.id === prod.ProductoId
      );
      const precioUnitario = productoOriginal?.ProductoPrecioVenta ?? p.precio;
      const comboCantidad = combo ? Number(combo.ComboCantidad) : 0;
      const totalCombo = calcularPrecioConCombo(
        p.id,
        p.cantidad,
        precioUnitario
      );
      const esCombo = combo && p.cantidad >= comboCantidad;
      return {
        ClienteId: clienteSeleccionado?.ClienteId,
        Producto: {
          ProductoId: p.id,
          VentaProductoCantidad: p.cantidad,
          ProductoPrecioVenta: p.precio,
          ProductoUnidad: p.caja ? "C" : "U",
          VentaProductoPrecioTotal: obtenerTotal(p),
          Combo: esCombo ? "S" : "N",
          ComboPrecio: esCombo ? totalCombo : 0,
        },
      };
    });

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
    doc.text("Auto Shop Alonso", 0, 15);
    doc.text("BODEGA", 0, 20);
    doc.text("Bernardino Caballero c/ Antequera, Ypacaraí", 0, 25);
    doc.text("Teléfono: +595 892 784989", 0, 30);
    doc.text(`Fecha: ${fechaFormateada} - Hora: ${horaFormateada}`, 0, 35);
    doc.text(
      clienteSeleccionado?.ClienteRUC
        ? "RUC: " + clienteSeleccionado.ClienteRUC
        : "RUC: SIN RUC",
      0,
      40
    );
    doc.text(
      "Cliente: " +
        (clienteSeleccionado?.ClienteNombre +
          " " +
          clienteSeleccionado?.ClienteApellido || ""),
      0,
      45
    );

    // Línea separadora
    doc.setLineWidth(0.2); // Línea más delgada
    doc.line(0, 48, 75, 48); // Ajustar el ancho de la línea

    // Encabezados de la tabla
    const headers = [["Desc.", "Cant", "Precio", "Total"]];

    // Datos de la tabla
    const tableData = carrito.map((p) => {
      const productoOriginal = productos.find(
        (prod) => prod.ProductoId === p.id
      );
      if (!productoOriginal) return [p.nombre, p.cantidad, "", ""];
      let precioUnitario = 0;
      let precioLabel = "";
      let totalLinea = 0;
      if (p.caja) {
        // Caja: precio minorista o mayorista
        precioUnitario =
          clienteSeleccionado?.ClienteTipo === "MA"
            ? productoOriginal.ProductoPrecioVentaMayorista
            : productoOriginal.ProductoPrecioVenta;
        precioLabel = `Caja (${
          clienteSeleccionado?.ClienteTipo === "MA" ? "Mayorista" : "Minorista"
        })`;
        totalLinea = precioUnitario * p.cantidad;
      } else {
        // Unidad: puede aplicar combo
        const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
        if (combo && p.cantidad >= combo.ComboCantidad) {
          // Aplica combo
          precioUnitario = productoOriginal.ProductoPrecioUnitario;
          precioLabel = `Unidad (Combo)`;
          totalLinea = calcularPrecioConCombo(p.id, p.cantidad, precioUnitario);
        } else {
          // Solo unidad
          precioUnitario = productoOriginal.ProductoPrecioUnitario;
          precioLabel = `Unidad`;
          totalLinea = precioUnitario * p.cantidad;
        }
      }
      return [
        p.nombre,
        p.cantidad,
        `Gs. ${precioUnitario.toLocaleString("es-ES")}\n${precioLabel}`,
        `Gs. ${totalLinea.toLocaleString("es-ES")}`,
      ];
    });

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
    const totalCost = carrito.reduce(
      (sum, item) => sum + obtenerTotal(item),
      0
    );
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

  const handleTecladoNumerico = (valor: string | number) => {
    if (selectedProductId === null) return;
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== selectedProductId) return item;
        let nuevaCantidad = String(item.cantidad);
        if (valor === "C" || valor === "c") {
          nuevaCantidad = "0";
        } else if (valor === "←") {
          nuevaCantidad =
            nuevaCantidad.length > 1 ? nuevaCantidad.slice(0, -1) : "0";
        } else {
          // Solo permitir números
          if (/^\d+$/.test(String(valor))) {
            nuevaCantidad = nuevaCantidad + valor;
          }
        }
        return { ...item, cantidad: Math.max(0, Number(nuevaCantidad)) };
      })
    );
  };

  // --- Generar PDF de Presupuesto ---
  const handlePresupuestoPDF = () => {
    const doc = new jsPDF();
    const cliente = clienteSeleccionado
      ? `${clienteSeleccionado.ClienteNombre} ${clienteSeleccionado.ClienteApellido}`.trim()
      : "SIN NOMBRE";
    doc.setFontSize(22);
    doc.text("Presupuesto", 14, 20);
    doc.setFontSize(14);
    doc.text(`Cliente:    ${cliente}`, 14, 32);

    // Tabla de productos
    const headers = [["Producto", "Cantidad", "Precio Unitario", "Total"]];
    const body = carrito.map((item) => [
      item.nombre,
      String(item.cantidad),
      `Gs. ${item.precio.toLocaleString()}`,
      `Gs. ${(item.precio * item.cantidad).toLocaleString()}`,
    ]);
    autoTable(doc, {
      head: headers,
      body: body,
      startY: 40,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 12 },
      styles: { cellPadding: 2 },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });
    // Calcular total
    const subtotal = carrito.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0
    );
    const finalY =
      (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY || 60;
    doc.setFontSize(16);
    doc.text(`Total: Gs. ${subtotal.toLocaleString()}`, 14, finalY + 16);
    doc.save("presupuesto.pdf");
  };

  return (
    <div className="flex h-screen bg-[#f5f8ff]">
      {/* Lado Izquierdo */}
      <div className="flex-1 bg-[#f5f8ff] p-4 flex flex-col justify-between">
        <div className="bg-white rounded-xl shadow-lg p-0 mb-4 flex flex-col max-h-[80vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left bg-[#f5f8ff]">
                  <th className="py-4 pl-6 font-semibold text-[15px]">
                    Nombre
                  </th>
                  <th className="py-4 font-semibold text-[15px]">Cantidad</th>
                  <th className="py-4 font-semibold text-[15px]">
                    Precio Uni.
                  </th>
                  <th className="py-4 pr-6 font-semibold text-[15px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((p, idx) => (
                  <tr
                    key={p.cartItemId}
                    className={`${
                      p.cartItemId === selectedProductId
                        ? "bg-gray-50 border-gray-300"
                        : idx !== carrito.length - 1
                        ? "border-b border-gray-200"
                        : ""
                    } transition-colors`}
                    onClick={() => {
                      setSelectedProductId(p.cartItemId);
                      setTimeout(() => {
                        cantidadRefs.current[p.cartItemId]?.focus();
                      }, 0);
                    }}
                  >
                    <td className="py-3 pl-6 align-middle">
                      <div className="flex items-center gap-4">
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          className="w-14 h-14 object-contain rounded-lg bg-[#f5f8ff] shadow"
                        />
                        <div>
                          <div className="font-bold text-[17px] text-[#222] leading-tight">
                            {p.nombre}
                          </div>
                          <div
                            className="text-red-600 text-sm mt-1 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              quitarProducto(p.cartItemId);
                            }}
                          >
                            Eliminar
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 align-middle">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(p.cartItemId, p.cantidad - 1);
                              setSelectedProductId(p.cartItemId);
                            }}
                            className="w-8 h-8 border border-gray-300 rounded bg-gray-50 text-gray-700 text-lg font-bold flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={p.cantidad}
                            min={0}
                            className="w-10 h-8 text-center border border-gray-300 rounded bg-gray-50 text-base font-semibold text-[#222] mx-1"
                            readOnly
                            ref={(el) => {
                              cantidadRefs.current[p.cartItemId] = el || null;
                            }}
                            tabIndex={0}
                            onFocus={() => setSelectedProductId(p.cartItemId)}
                            onKeyDown={(e) => {
                              if (selectedProductId !== p.cartItemId) return;
                              if (e.key >= "0" && e.key <= "9") {
                                e.preventDefault();
                                handleTecladoNumerico(e.key);
                              } else if (e.key === "Backspace") {
                                e.preventDefault();
                                handleTecladoNumerico("←");
                              } else if (e.key.toLowerCase() === "c") {
                                e.preventDefault();
                                handleTecladoNumerico("C");
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                cambiarCantidad(p.cartItemId, p.cantidad + 1);
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                cambiarCantidad(p.cartItemId, p.cantidad - 1);
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(p.cartItemId, p.cantidad + 1);
                              setSelectedProductId(p.cartItemId);
                            }}
                            className="w-8 h-8 border border-gray-300 rounded bg-gray-50 text-gray-700 text-lg font-bold flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center mt-1">
                          <input
                            type="checkbox"
                            id={`caja-checkbox-${p.cartItemId}`}
                            checked={p.caja}
                            onChange={() =>
                              setCarrito(
                                carrito.map((item) =>
                                  item.cartItemId === p.cartItemId
                                    ? { ...item, caja: !item.caja }
                                    : item
                                )
                              )
                            }
                            className="cursor-pointer"
                          />
                          <label
                            htmlFor={`caja-checkbox-${p.cartItemId}`}
                            className="text-lg text-gray-700 cursor-pointer select-none font-medium"
                          >
                            Caja
                          </label>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 align-middle text-right font-medium text-[17px] text-gray-700">
                      <>Gs. {formatMiles(obtenerPrecio(p))}</>
                    </td>
                    <td className="py-3 pr-6 align-middle text-right font-medium text-[17px] text-gray-700">
                      Gs. {formatMiles(obtenerTotal(p))}
                    </td>
                  </tr>
                ))}
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
              Gs. {formatMiles(total)}
            </span>
          </div>
          {/* Grid de botones */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {/* Botón Pagar grande */}
            <button
              className="row-span-4 bg-blue-500 text-white font-semibold rounded-lg flex items-center justify-center text-lg h-[200px] col-span-1 border-2 border-blue-500 hover:bg-blue-600 transition min-h-[215px]"
              onClick={() => setShowModal(true)}
            >
              Pagar
            </button>
            {/* Números y símbolos */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
              <button
                key={n}
                className="bg-white border border-gray-200 rounded-lg text-gray-700 font-medium text-lg h-12 flex items-center justify-center hover:bg-gray-100 transition min-w-[60px]"
                onClick={() => handleTecladoNumerico(n)}
              >
                {n}
              </button>
            ))}
            {/* Botón borrar y limpiar */}
            <button
              className="bg-white border border-gray-200 rounded-lg text-gray-700 font-medium text-lg h-12 flex items-center justify-center hover:bg-gray-100 transition min-w-[60px]"
              onClick={() => handleTecladoNumerico("←")}
            >
              ←
            </button>
            <button
              className="bg-white border border-gray-200 rounded-lg text-gray-700 font-medium text-lg h-12 flex items-center justify-center hover:bg-gray-100 transition min-w-[60px]"
              onClick={handlePresupuestoPDF}
            >
              Presupuesto
            </button>
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
      <div className="flex-[2] p-4">
        <div className="flex items-center mb-4 justify-between">
          <SearchButton
            searchTerm={busqueda}
            onSearch={setBusqueda}
            onSearchSubmit={() => {}}
            placeholder="Buscar productos"
            hideButton={true}
          />
          {user && (
            <div className="ml-6 font-semibold text-[#222] text-[16px] flex items-center gap-2">
              <span>
                {user.nombre + " "}
                <span style={{ color: "#888", fontWeight: 400 }}>
                  ({user.id})
                </span>
              </span>
              {localNombre && (
                <span className="text-red-600 font-medium">
                  | Local: {localNombre}
                </span>
              )}
              {cajaAperturada && (
                <span className="text-blue-600 font-medium">
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
          className="overflow-y-auto"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
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
