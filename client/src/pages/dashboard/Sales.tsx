import { useState, useEffect, useRef, useMemo } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import { getProductosAll } from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import PaymentModal from "../../components/common/PaymentModal";
import Swal from "sweetalert2";
import logo from "../../assets/img/logo.jpg";
import {
  getAllClientesSinPaginacion,
  createCliente,
} from "../../services/clientes.service";
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
import { confirmarVenta, mensajeDeError } from "../../services/pos.service";
import {
  getEstadoPromocionesCliente,
  type EstadoPromocion,
} from "../../services/promociones.service";
import {
  formatMiles,
  generatePresupuestoPDF,
  type CarritoItem,
} from "../../utils/utils";

interface Cliente {
  ClienteId: number;
  ClienteRUC: string;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteDireccion: string;
  ClienteTelefono: string;
  ClienteTipo: string;
  UsuarioId: string;
  ClienteFechaNacimiento?: string | null;
  ClienteVehiculo?: string;
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
      carritoId: string; // Identificador único para cada línea del carrito
      nombre: string;
      precio: number;
      imagen: string;
      stock: number;
      cantidad: number;
      /** Línea que es el beneficio de una promoción: precio fijo, cantidad 1 */
      promocionId?: number;
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
  const [promosCliente, setPromosCliente] = useState<EstadoPromocion[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const cantidadRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const precioRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const descripcionRefs = useRef<{ [key: number]: HTMLInputElement | null }>(
    {}
  );

  // Array de productos con precio editable
  const productosPrecioEditable = useMemo(() => [1, 836, 850], []);
  // Array de productos con descripción editable
  const productosDescripcionEditable = useMemo(() => [1], []);

  useEffect(() => {
    if (selectedProductId === null) return;
    const isSpecialProduct =
      productosPrecioEditable.includes(selectedProductId);
    setTimeout(() => {
      if (isSpecialProduct && precioRefs.current[selectedProductId]) {
        precioRefs.current[selectedProductId]?.select();
      } else if (cantidadRefs.current[selectedProductId]) {
        cantidadRefs.current[selectedProductId]?.focus();
        cantidadRefs.current[selectedProductId]?.select();
      }
    }, 0);
  }, [selectedProductId, productosPrecioEditable]);

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

    // Si el producto tiene descripción editable, siempre agregar como nueva línea
    if (productosDescripcionEditable.includes(producto.id)) {
      setCarrito([
        ...carrito,
        {
          ...producto,
          carritoId: `${producto.id}-${Date.now()}-${Math.random()}`,
          precio: precioSeguro,
          cantidad: 1,
        },
      ]);
      setSelectedProductId(producto.id);
      return;
    }

    // Para productos normales, verificar si ya existe en el carrito
    const existe = carrito.find((p) => p.id === producto.id && !p.promocionId);
    if (existe) {
      setCarrito(
        carrito.map((p) =>
          p.carritoId === existe.carritoId ? { ...p, cantidad: p.cantidad + 1 } : p
        )
      );
      setSelectedProductId(producto.id);
    } else {
      setCarrito([
        ...carrito,
        {
          ...producto,
          carritoId: `${producto.id}-${Date.now()}-${Math.random()}`,
          precio: precioSeguro,
          cantidad: 1,
        },
      ]);
      setSelectedProductId(producto.id);
    }
  };

  const quitarProducto = (carritoId: string) => {
    setCarrito(carrito.filter((p) => p.carritoId !== carritoId));
  };

  const cambiarCantidad = (carritoId: string, cantidad: number) => {
    setCarrito(
      carrito.map((p) =>
        p.carritoId === carritoId && !p.promocionId
          ? { ...p, cantidad: Math.max(1, cantidad) }
          : p
      )
    );
  };

  const cambiarDescripcion = (carritoId: string, descripcion: string) => {
    setCarrito(
      carrito.map((p) =>
        p.carritoId === carritoId ? { ...p, nombre: descripcion } : p
      )
    );
  };

  /** Precio unitario y total de una línea del carrito. */
  const precioLinea = (p: (typeof carrito)[number]) => {
    // El beneficio de una promoción tiene precio fijo (ya validado por la API)
    if (p.promocionId) return { unitario: p.precio, total: p.precio * p.cantidad };
    const productoOriginal = productos.find((prod) => prod.ProductoId === p.id);
    const unitario = productosPrecioEditable.includes(p.id)
      ? p.precio
      : productoOriginal?.ProductoPrecioVenta ?? p.precio;
    return { unitario, total: calcularPrecioConCombo(p.id, p.cantidad, unitario) };
  };

  const total = carrito.reduce((acc, p) => acc + precioLinea(p).total, 0);

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

  const handleCreateCliente = async (clienteData: Cliente) => {
    try {
      const nuevoCliente = await createCliente({
        ClienteId: clienteData.ClienteId,
        ClienteRUC: clienteData.ClienteRUC,
        ClienteNombre: clienteData.ClienteNombre,
        ClienteApellido: clienteData.ClienteApellido,
        ClienteDireccion: clienteData.ClienteDireccion,
        ClienteTelefono: clienteData.ClienteTelefono,
        ClienteTipo: clienteData.ClienteTipo,
        UsuarioId: clienteData.UsuarioId,
        ClienteFechaNacimiento: clienteData.ClienteFechaNacimiento,
        ClienteVehiculo: clienteData.ClienteVehiculo,
      });
      // Recargar la lista de clientes
      const response = await getAllClientesSinPaginacion();
      setClientes(response.data || []);
      // Seleccionar el nuevo cliente creado
      if (nuevoCliente.data) {
        setClienteSeleccionado(nuevoCliente.data);
        setShowClienteModal(false);
      }
      Swal.fire({
        icon: "success",
        title: "Cliente creado exitosamente",
        text: "El cliente ha sido creado y seleccionado",
      });
    } catch (error) {
      console.error("Error al crear cliente:", error);
      Swal.fire({
        icon: "error",
        title: "Error al crear cliente",
        text: "Hubo un problema al crear el cliente",
      });
    }
  };

  useEffect(() => {
    if (!clienteSeleccionado) return;
    // Los beneficios son del cliente anterior: se quitan al cambiar de cliente
    setCarrito((carritoActual) =>
      carritoActual.filter((item) => !item.promocionId).map((item) => {
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

  // Promociones del cliente: se consultan al elegirlo y se avisa al cajero
  useEffect(() => {
    const clienteId = Number(clienteSeleccionado?.ClienteId);
    if (!clienteId || clienteId === 1) {
      setPromosCliente([]);
      return;
    }
    let cancelado = false;
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(hoy.getDate()).padStart(2, "0")}`;
    getEstadoPromocionesCliente(clienteId, fecha)
      .then((estado) => {
        if (cancelado) return;
        setPromosCliente(estado);
        const disponibles = estado.filter((e) => e.disponible);
        if (!disponibles.length) return;
        const lista = document.createElement("div");
        for (const d of disponibles) {
          const item = document.createElement("p");
          const titulo = document.createElement("b");
          titulo.textContent = `${d.PromocionTipo === "CU" ? "🎂" : "🎁"} ${
            d.PromocionNombre
          }`;
          item.appendChild(titulo);
          if (d.PromocionMensaje) {
            item.appendChild(document.createElement("br"));
            const msj = document.createElement("small");
            msj.textContent = d.PromocionMensaje;
            item.appendChild(msj);
          }
          lista.appendChild(item);
        }
        Swal.fire({
          icon: "info",
          title: "¡El cliente tiene un beneficio!",
          html: lista,
          footer: "Aplicalo desde el recuadro de promociones, debajo del total.",
          confirmButtonColor: "#2563eb",
        });
      })
      .catch(() => {
        if (!cancelado) setPromosCliente([]);
      });
    return () => {
      cancelado = true;
    };
  }, [clienteSeleccionado]);

  const aplicarPromocion = async (promo: EstadoPromocion) => {
    const tipoCliente = clienteSeleccionado?.ClienteTipo || "MI";
    const precioConBeneficio = (lista: number) =>
      promo.PromocionBeneficio === "R"
        ? 0
        : Math.round(lista * (1 - promo.PromocionDescuento / 100));
    // Sin productos configurados: vale para cualquiera
    const opciones = promo.productosBeneficio.length
      ? promo.productosBeneficio
      : productos.map((p) => {
          const lista =
            (tipoCliente === "MA"
              ? p.ProductoPrecioVentaMayorista
              : p.ProductoPrecioVenta) || 0;
          return {
            ProductoId: p.ProductoId,
            ProductoNombre: p.ProductoNombre,
            precioLista: lista,
            precio: precioConBeneficio(lista),
          };
        });
    if (!opciones.length) return;

    let elegido = opciones[0];
    if (opciones.length > 1) {
      const { value } = await Swal.fire({
        title: promo.PromocionNombre,
        text:
          promo.PromocionBeneficio === "R"
            ? "¿Qué se le regala?"
            : `¿A qué producto se aplica el ${promo.PromocionDescuento}% de descuento?`,
        input: "select",
        inputOptions: Object.fromEntries(
          opciones.map((o) => [
            String(o.ProductoId),
            `${o.ProductoNombre} — Gs. ${formatMiles(o.precio)}${
              o.precioLista !== o.precio
                ? ` (antes ${formatMiles(o.precioLista)})`
                : ""
            }`,
          ])
        ),
        inputPlaceholder: "Elegí un producto",
        showCancelButton: true,
        confirmButtonText: "Aplicar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#16a34a",
        inputValidator: (v) => (v ? undefined : "Elegí un producto"),
      });
      if (!value) return;
      elegido =
        opciones.find((o) => String(o.ProductoId) === value) || opciones[0];
    }

    const producto = productos.find((p) => p.ProductoId === elegido.ProductoId);
    setCarrito((actual) => [
      ...actual.filter((item) => item.promocionId !== promo.PromocionId),
      {
        id: elegido.ProductoId,
        carritoId: `promo-${promo.PromocionId}-${Date.now()}`,
        nombre: `${elegido.ProductoNombre} (${promo.PromocionNombre})`,
        precio: elegido.precio,
        imagen: producto?.ProductoImagen
          ? `data:image/jpeg;base64,${producto.ProductoImagen}`
          : logo,
        stock: 0,
        cantidad: 1,
        promocionId: promo.PromocionId,
      },
    ]);
  };

  // Simulación de items y cliente seleccionados (ajusta según tu lógica real)
  const cartItems = carrito.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    quantity: p.cantidad,
    salePrice: p.precio,
    price: p.precio,
    unidad: "U",
    totalPrice: p.precio * p.cantidad,
    promocionId: p.promocionId,
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
    const hoy = new Date();
    const fechaISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(hoy.getDate()).padStart(2, "0")}`;

    // El precio de combo ya viene resuelto en totalPrice del carrito
    const items = cartItems.map((producto) => ({
      productoId: producto.id,
      cantidad: producto.quantity,
      precio: producto.salePrice,
      precioTotal: producto.totalPrice,
      unidad: producto.unidad,
      promocionId: producto.promocionId,
    }));

    const total = getSubtotal(cartItems);
    const aCuenta = Number(cuentaCliente) || 0;

    try {
      await confirmarVenta({
        fecha: fechaISO,
        clienteId: Number(clienteSeleccionado?.ClienteId),
        almacenId: Number(user?.LocalId),
        cajaId: Number(cajaAperturada?.CajaId),
        usuarioId: String(user?.id ?? ""),
        ventaTipo: aCuenta > 0 ? "CR" : "CO",
        pagoTipo: "E",
        total,
        pagos: {
          efectivo: Number(efectivo) + Number(totalRest),
          pos: Number(bancoDebito) + Number(bancoCredito),
          transferencia: Number(banco),
          voucher: Number(voucher),
          cuentaCliente: aCuenta,
        },
        items,
      });
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
      Swal.fire({
        icon: "error",
        title: "Error al realizar la venta",
        text: mensajeDeError(
          error,
          "No se pudo completar la venta. Por favor, contacte con el administrador."
        ),
        confirmButtonColor: "#2563eb",
      });
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
    doc.text("Decorpar", 0, 15);
    doc.text("Pinturería", 0, 20);
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

    // Datos de la tabla para el PDF
    const tableData = carrito.map((p) => {
      const productoOriginal = productos.find(
        (prod) => prod.ProductoId === p.id
      );
      if (!productoOriginal) return [p.nombre, p.cantidad, "", ""];
      const { unitario: precioUnitario, total: subtotal } = precioLinea(p);
      return [
        p.nombre,
        p.cantidad,
        `Gs. ${precioUnitario.toLocaleString("es-ES")}`,
        `Gs. ${subtotal.toLocaleString("es-ES")}`,
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

    // Total de la compra para el PDF
    const totalCost = carrito.reduce((sum, p) => sum + precioLinea(p).total, 0);
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
        if (item.id !== selectedProductId || item.promocionId) return item;
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
    // Convertir el carrito al formato esperado por la función de utils
    const carritoItems: CarritoItem[] = carrito.map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
    }));

    generatePresupuestoPDF(carritoItems, clienteSeleccionado || undefined);
  };

  return (
    <div className="flex h-screen bg-[#f5f8ff]">
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
                  const { total: precioTotal } = precioLinea(p);
                  return (
                    <tr
                      key={p.carritoId}
                      style={{
                        background: "#fff",
                        borderBottom:
                          idx !== carrito.length - 1
                            ? "1px solid #e5e7eb"
                            : "none",
                      }}
                      onClick={() => {
                        setSelectedProductId(p.id);
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
                            {productosDescripcionEditable.includes(p.id) ? (
                              <input
                                type="text"
                                value={p.nombre}
                                style={{
                                  fontWeight: 700,
                                  fontSize: 17,
                                  color: "#222",
                                  lineHeight: 1.2,
                                  border: "1px solid #d1d5db",
                                  borderRadius: 4,
                                  padding: "4px 8px",
                                  width: "100%",
                                  background: "#f9fafb",
                                }}
                                ref={(el) => {
                                  descripcionRefs.current[p.id] = el || null;
                                }}
                                onChange={(e) =>
                                  cambiarDescripcion(
                                    p.carritoId,
                                    e.target.value
                                  )
                                }
                                onFocus={() => setSelectedProductId(p.id)}
                              />
                            ) : (
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
                            )}
                            {p.promocionId && (
                              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                🎁 Promoción
                              </span>
                            )}
                            <div
                              style={{
                                color: "#e53935",
                                fontSize: 14,
                                marginTop: 4,
                                cursor: "pointer",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                quitarProducto(p.carritoId);
                              }}
                            >
                              Eliminar
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{ padding: "20px 0", verticalAlign: "middle" }}
                      >
                        {p.promocionId ? (
                          <span
                            style={{ fontSize: 16, fontWeight: 600, paddingLeft: 38 }}
                          >
                            1
                          </span>
                        ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(p.carritoId, p.cantidad - 1);
                              setSelectedProductId(p.id);
                            }}
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
                            min={0}
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
                            ref={(el) => {
                              cantidadRefs.current[p.id] = el || null;
                            }}
                            tabIndex={0}
                            onFocus={() => setSelectedProductId(p.id)}
                            onKeyDown={(e) => {
                              if (selectedProductId !== p.id) return;
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
                                cambiarCantidad(p.carritoId, p.cantidad + 1);
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                cambiarCantidad(p.carritoId, p.cantidad - 1);
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(p.carritoId, p.cantidad + 1);
                              setSelectedProductId(p.id);
                            }}
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
                        )}
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
                        {productosPrecioEditable.includes(p.id) ? (
                          <input
                            type="text"
                            value={formatMiles(p.precio)}
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
                              paddingRight: 8,
                            }}
                            ref={(el) => {
                              precioRefs.current[p.id] = el || null;
                            }}
                            onFocus={() => setSelectedProductId(p.id)}
                            onChange={(e) => {
                              const valorSinPuntos = e.target.value.replace(
                                /\./g,
                                ""
                              );
                              const nuevoPrecio = Number(valorSinPuntos);
                              if (!isNaN(nuevoPrecio)) {
                                setCarrito(
                                  carrito.map((item) =>
                                    item.carritoId === p.carritoId &&
                                    productosPrecioEditable.includes(item.id)
                                      ? { ...item, precio: nuevoPrecio }
                                      : item
                                  )
                                );
                              }
                            }}
                          />
                        ) : (
                          <>Gs. {formatMiles(p.precio)}</>
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
                        Gs. {formatMiles(precioTotal)}
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
          {/* Promociones del cliente */}
          {promosCliente.some(
            (pr) =>
              pr.disponible ||
              (pr.PromocionTipo === "FR" && pr.requerido) ||
              pr.motivo?.startsWith("Ya usó")
          ) && (
            <div className="mt-2 space-y-1">
              {promosCliente.map((pr) => {
                const aplicada = carrito.some(
                  (c) => c.promocionId === pr.PromocionId
                );
                if (pr.disponible) {
                  return (
                    <div
                      key={pr.PromocionId}
                      className="flex items-center justify-between gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm"
                    >
                      <span className="text-green-900">
                        {pr.PromocionTipo === "CU" ? "🎂" : "🎁"}{" "}
                        <b>{pr.PromocionNombre}</b>
                        {pr.PromocionTipo === "FR" &&
                          ` (${pr.progreso} de ${pr.requerido})`}
                      </span>
                      <button
                        className="shrink-0 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1 disabled:opacity-50"
                        disabled={aplicada}
                        onClick={() => aplicarPromocion(pr)}
                      >
                        {aplicada ? "Aplicada" : "Aplicar"}
                      </button>
                    </div>
                  );
                }
                if (pr.PromocionTipo === "FR" && pr.requerido) {
                  return (
                    <div
                      key={pr.PromocionId}
                      className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      🔁 <b>{pr.PromocionNombre}</b>: {pr.progreso} de{" "}
                      {pr.requerido}
                      <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${Math.round(
                              ((pr.progreso || 0) / pr.requerido) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
                if (pr.motivo?.startsWith("Ya usó")) {
                  return (
                    <div
                      key={pr.PromocionId}
                      className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600"
                    >
                      🎂 {pr.PromocionNombre}: ya usó el beneficio de este
                      cumpleaños
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
          {Number(clienteSeleccionado?.ClienteId) !== 1 &&
            !clienteSeleccionado?.ClienteFechaNacimiento &&
            promosCliente.some((pr) => pr.PromocionTipo === "CU") && (
              <p className="mt-2 text-xs text-amber-700">
                Este cliente no tiene fecha de nacimiento: cargala en su ficha
                para que reciba las promociones de cumpleaños.
              </p>
            )}
          {/* Recuadro inferior para el nombre del cliente */}
          <div className="mt-2">
            <button
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 text-center text-gray-700 font-semibold text-base tracking-wide hover:bg-blue-100 transition cursor-pointer"
              onClick={() => setShowClienteModal(true)}
            >
              {clienteSeleccionado
                ? `${clienteSeleccionado.ClienteNombre} ${
                    clienteSeleccionado.ClienteApellido || ""
                  }`
                : clientes[0]
                ? `${clientes[0].ClienteNombre} ${
                    clientes[0].ClienteApellido || ""
                  }`
                : "SIN NOMBRE MINORISTA"}
            </button>
            <ClienteModal
              show={showClienteModal}
              onClose={() => setShowClienteModal(false)}
              clientes={clientes}
              onSelect={(cliente: Cliente) => {
                setClienteSeleccionado(cliente);
                setShowClienteModal(false);
              }}
              onCreateCliente={handleCreateCliente}
              currentUserId={user?.id}
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
