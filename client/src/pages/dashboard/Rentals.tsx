import { useState, useEffect, useRef, useCallback } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import {
  getProductosPaginated,
  searchProductos,
} from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import PaymentModal from "../../components/common/PaymentModal";
import Swal from "sweetalert2";
import { createAlquiler } from "../../services/alquiler.service";
import { createAlquilerPrendas } from "../../services/alquilerprendas.service";
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
import Pagination from "../../components/common/Pagination";
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

export default function Rentals() {
  const [carrito, setCarrito] = useState<
    {
      id: number;
      nombre: string;
      precio: number;
      imagen: string;
      stock: number;
      cantidad: number;
      cartItemId: number;
      precioAlquiler: number;
    }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [productos, setProductos] = useState<
    {
      ProductoId: number;
      ProductoCodigo: string;
      ProductoNombre: string;
      ProductoPrecioVenta: number;
      ProductoStock: number;
      ProductoImagen?: string;
      LocalId: string | number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 24,
  });
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
    useState<Cliente | null>(null);
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);
  const [localNombre, setLocalNombre] = useState("");
  const navigate = useNavigate();
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [fechaAlquiler, setFechaAlquiler] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaDevolucion, setFechaDevolucion] = useState("");
  const cantidadRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedProductId !== null && cantidadRefs.current[selectedProductId]) {
      cantidadRefs.current[selectedProductId]?.focus();
    }
  }, [selectedProductId, carrito.length]);

  // Focus automático en el campo de búsqueda al cargar la página
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const agregarProducto = (producto: {
    id: number;
    nombre: string;
    precio: number;
    imagen: string;
    stock: number;
  }) => {
    const nuevoCartItemId = Date.now() + Math.random();
    setCarrito([
      ...carrito,
      {
        ...producto,
        precio: producto.precio,
        cantidad: 1,
        cartItemId: nuevoCartItemId,
        precioAlquiler: producto.precio,
      },
    ]);
    setSelectedProductId(nuevoCartItemId);
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

  const obtenerPrecio = (p: (typeof carrito)[0]) => {
    return p.precioAlquiler;
  };

  const obtenerTotal = (p: (typeof carrito)[0]) => {
    return p.precioAlquiler * p.cantidad;
  };

  const total = carrito.reduce((acc, p) => acc + obtenerTotal(p), 0);

  // Función para cargar productos con paginación
  const fetchProductos = useCallback(async () => {
    if (!cajaAperturada) return;

    setLoading(true);
    try {
      let data;
      if (busquedaDebounced.trim()) {
        data = await searchProductos(
          busquedaDebounced.trim(),
          currentPage,
          itemsPerPage
        );
      } else {
        data = await getProductosPaginated(currentPage, itemsPerPage);
      }

      const productosFiltrados = (data.data || []).filter(
        (p: { LocalId: string | number }) =>
          Number(p.LocalId) === 0 ||
          Number(p.LocalId) === Number(cajaAperturada?.CajaId)
      );

      setProductos(productosFiltrados);
      setPagination({
        totalItems: data.pagination?.totalItems || 0,
        totalPages: data.pagination?.totalPages || 1,
        currentPage: data.pagination?.currentPage || 1,
        itemsPerPage: data.pagination?.itemsPerPage || itemsPerPage,
      });
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, [cajaAperturada, busquedaDebounced, currentPage, itemsPerPage]);

  // Cargar productos cuando cambian las dependencias
  useEffect(() => {
    if (cajaAperturada) {
      fetchProductos();
    }
  }, [fetchProductos, cajaAperturada]);

  // Efecto para buscar cuando cambia el término de búsqueda (con debounce)
  useEffect(() => {
    if (!cajaAperturada) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setCurrentPage(1);

    const timeoutId = setTimeout(() => {
      setBusquedaDebounced(busqueda);
      debounceTimeoutRef.current = null;
    }, 500);

    debounceTimeoutRef.current = timeoutId;

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [busqueda, cajaAperturada]);

  // Cargar clientes solo cuando se abre el modal
  useEffect(() => {
    if (showClienteModal) {
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
    }
  }, [showClienteModal]);

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
        UsuarioId: clienteData.UsuarioId
          ? String(clienteData.UsuarioId).trim()
          : "",
      });
      const response = await getAllClientesSinPaginacion();
      setClientes(response.data || []);
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

  const sendRequest = async () => {
    if (!clienteSeleccionado) {
      Swal.fire({
        icon: "warning",
        title: "Cliente requerido",
        text: "Debes seleccionar un cliente para realizar el alquiler",
      });
      return;
    }

    if (
      clienteSeleccionado.ClienteNombre === "SIN NOMBRE MINORISTA" ||
      clienteSeleccionado.ClienteNombre.trim() === ""
    ) {
      Swal.fire({
        icon: "warning",
        title: "Cliente inválido",
        text: "No puedes realizar un alquiler con el cliente 'SIN NOMBRE MINORISTA'. Por favor, selecciona un cliente válido.",
      });
      return;
    }

    if (carrito.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Carrito vacío",
        text: "Debes agregar al menos una prenda al carrito",
      });
      return;
    }

    if (!fechaEntrega) {
      Swal.fire({
        icon: "warning",
        title: "Fecha de entrega requerida",
        text: "Debes especificar la fecha de entrega",
      });
      return;
    }

    if (!fechaDevolucion) {
      Swal.fire({
        icon: "warning",
        title: "Fecha de devolución requerida",
        text: "Debes especificar la fecha de devolución",
      });
      return;
    }

    // Validar que fecha de entrega no sea anterior a fecha de alquiler
    if (new Date(fechaEntrega) < new Date(fechaAlquiler)) {
      Swal.fire({
        icon: "warning",
        title: "Fecha de entrega inválida",
        text: "La fecha de entrega no puede ser anterior a la fecha de alquiler",
      });
      return;
    }

    // Validar que fecha de devolución no sea anterior a fecha de entrega
    if (new Date(fechaDevolucion) < new Date(fechaEntrega)) {
      Swal.fire({
        icon: "warning",
        title: "Fecha de devolución inválida",
        text: "La fecha de devolución no puede ser anterior a la fecha de entrega",
      });
      return;
    }

    // Validar que haya una caja aperturada
    if (!cajaAperturada || !cajaAperturada.CajaId) {
      Swal.fire({
        icon: "warning",
        title: "Caja no aperturada",
        text: "Debes aperturar una caja antes de realizar el alquiler",
        confirmButtonColor: "#2563eb",
      }).then(() => {
        navigate("/apertura-cierre-caja");
      });
      return;
    }

    // Validar que haya un usuario
    if (!user || !user.id) {
      Swal.fire({
        icon: "error",
        title: "Usuario no identificado",
        text: "No se pudo identificar el usuario. Por favor, inicia sesión nuevamente.",
      });
      return;
    }

    try {
      // Calcular el monto de entrega desde los métodos de pago
      // AlquilerEntrega = Efectivo + Transferencia + Tarjeta Débito (con 3%) + Tarjeta Crédito (con 5%)
      const montoEntrega =
        efectivo + banco + bancoDebito * 1.03 + bancoCredito * 1.05;

      // Crear el alquiler
      const alquilerData = {
        ClienteId: clienteSeleccionado.ClienteId,
        AlquilerFechaAlquiler: fechaAlquiler,
        AlquilerFechaEntrega: fechaEntrega,
        AlquilerFechaDevolucion: fechaDevolucion || null,
        AlquilerEstado: "Pendiente",
        AlquilerTotal: total,
        AlquilerEntrega: Math.round(montoEntrega),
        // Datos de pago para registro en caja
        pagos: {
          efectivo,
          transferencia: banco,
          tarjetaDebito: bancoDebito,
          tarjetaCredito: bancoCredito,
          voucher,
        },
        CajaId: cajaAperturada.CajaId,
        UsuarioId: user.id,
      };

      const alquilerResponse = await createAlquiler(alquilerData);
      const alquilerId = alquilerResponse.data?.AlquilerId;

      if (!alquilerId) {
        throw new Error("No se pudo obtener el ID del alquiler creado");
      }

      // Crear las prendas del alquiler
      const prendasPromises = carrito.map((item) =>
        createAlquilerPrendas({
          AlquilerId: alquilerId,
          ProductoId: item.id,
          AlquilerPrendasPrecio: item.precioAlquiler,
        })
      );

      await Promise.all(prendasPromises);

      if (printTicket) {
        generateTicketPDF();
      }

      Swal.fire({
        title: "Alquiler realizado con éxito!",
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        // Limpiar estados
        setCarrito([]);
        setEfectivo(0);
        setBanco(0);
        setBancoDebito(0);
        setBancoCredito(0);
        setCuentaCliente(0);
        setVoucher(0);
        setTotalRest(0);
        setPrintTicket(false);
        setShowModal(false);
        setFechaAlquiler(new Date().toISOString().split("T")[0]);
        setFechaEntrega("");
        setFechaDevolucion("");
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al realizar el alquiler",
      });
    }
  };

  const generateTicketPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297],
    });

    // Función para formatear fecha de ISO (aaaa-mm-dd) a dd/mm/aaaa
    const formatearFecha = (fechaISO: string) => {
      if (!fechaISO) return "";
      const [año, mes, dia] = fechaISO.split("-");
      return `${dia}/${mes}/${año}`;
    };

    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, "0");
    const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
    const año = fechaActual.getFullYear().toString().slice(-2);
    const horas = String(fechaActual.getHours()).padStart(2, "0");
    const minutos = String(fechaActual.getMinutes()).padStart(2, "0");
    const segundos = String(fechaActual.getSeconds()).padStart(2, "0");

    const fechaFormateada = `${dia}/${mes}/${año}`;
    const horaFormateada = `${horas}:${minutos}:${segundos}`;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

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
    doc.text(`Fecha Alquiler: ${formatearFecha(fechaAlquiler)}`, 0, 50);
    doc.text(`Fecha Entrega: ${formatearFecha(fechaEntrega)}`, 0, 55);
    doc.text(`Fecha Devolución: ${formatearFecha(fechaDevolucion)}`, 0, 60);

    doc.setLineWidth(0.2);
    doc.line(0, 63, 75, 63);

    const headers = [["Desc.", "Cant", "Precio", "Total"]];

    const tableData = carrito.map((p) => {
      return [
        p.nombre,
        p.cantidad,
        `Gs. ${p.precioAlquiler.toLocaleString("es-ES")}`,
        `Gs. ${obtenerTotal(p).toLocaleString("es-ES")}`,
      ];
    });

    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 65,
      theme: "plain",
      styles: {
        fontSize: 7,
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 9 },
        2: { cellWidth: 14 },
        3: { cellWidth: 20 },
      },
      margin: { left: 0 },
    });

    const totalCost = carrito.reduce(
      (sum, item) => sum + obtenerTotal(item),
      0
    );
    const lastAutoTable = (
      doc as unknown as { lastAutoTable: { finalY: number } }
    ).lastAutoTable;

    let yPosition = lastAutoTable.finalY + 5;

    // Línea separadora
    doc.setLineWidth(0.2);
    doc.line(0, yPosition, 75, yPosition);
    yPosition += 5;

    // Información de pagos
    doc.setFontSize(7);

    // Efectivo
    if (efectivo > 0) {
      doc.text(
        `Efectivo: Gs. ${efectivo.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }

    // Transferencia
    if (banco > 0) {
      doc.text(
        `Transferencia: Gs. ${banco.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }

    // Tarjeta Débito (con 3% adicional)
    if (bancoDebito > 0) {
      const debitoConAdicional = bancoDebito * 1.03;
      doc.text(
        `Tarjeta Débito (3% adicional): Gs. ${Math.round(
          debitoConAdicional
        ).toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }

    // Tarjeta Crédito (con 5% adicional)
    if (bancoCredito > 0) {
      const creditoConAdicional = bancoCredito * 1.05;
      doc.text(
        `Tarjeta Crédito (5% adicional): Gs. ${Math.round(
          creditoConAdicional
        ).toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }

    // Cuenta de cliente
    if (cuentaCliente > 0) {
      doc.text(
        `Cuenta de cliente: Gs. ${cuentaCliente.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }

    // Voucher (descuento)
    if (voucher > 0) {
      doc.text(`Voucher: Gs. ${voucher.toLocaleString("es-ES")}`, 0, yPosition);
      yPosition += 4;
    }

    // Línea separadora
    yPosition += 2;
    doc.line(0, yPosition, 75, yPosition);
    yPosition += 5;

    // Calcular total entregado (suma de todo menos voucher y cuenta cliente)
    const totalEntregado =
      efectivo + banco + bancoDebito * 1.03 + bancoCredito * 1.05;

    // Total con descuento de voucher
    const totalConDescuento = totalCost - voucher;

    // Saldo que falta
    const saldoFalta = totalConDescuento - totalEntregado;

    // Total entregado
    doc.setFontSize(8);
    doc.text(
      `Total Entregado: Gs. ${Math.round(totalEntregado).toLocaleString(
        "es-ES"
      )}`,
      0,
      yPosition
    );
    yPosition += 5;

    // Saldo que falta
    if (saldoFalta > 0) {
      doc.text(
        `Saldo que falta: Gs. ${Math.round(saldoFalta).toLocaleString(
          "es-ES"
        )}`,
        0,
        yPosition
      );
      yPosition += 5;
    } else if (saldoFalta < 0) {
      doc.text(
        `Vuelto: Gs. ${Math.round(Math.abs(saldoFalta)).toLocaleString(
          "es-ES"
        )}`,
        0,
        yPosition
      );
      yPosition += 5;
    }

    // Línea separadora
    doc.line(0, yPosition, 75, yPosition);
    yPosition += 5;

    // Total a Pagar (con descuento si hay voucher)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    if (voucher > 0) {
      doc.text(
        `Subtotal: Gs. ${totalCost.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
      doc.text(
        `Descuento (Voucher): Gs. ${voucher.toLocaleString("es-ES")}`,
        0,
        yPosition
      );
      yPosition += 4;
    }
    doc.text(
      `Total a Pagar: Gs. ${totalConDescuento.toLocaleString("es-ES")}`,
      0,
      yPosition
    );
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("--GRACIAS POR SU PREFERENCIA--", 0, yPosition);

    doc.save("ticket_alquiler.pdf");
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
            text: "Debes aperturar una caja antes de realizar alquileres.",
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
          if (/^\d+$/.test(String(valor))) {
            nuevaCantidad = nuevaCantidad + valor;
          }
        }
        return { ...item, cantidad: Math.max(0, Number(nuevaCantidad)) };
      })
    );
  };

  const handleSearchSubmit = async () => {
    if (!busqueda.trim() || !cajaAperturada) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    setBusquedaDebounced(busqueda);

    try {
      const data = await searchProductos(busqueda.trim(), 1, 10);
      const productosFiltrados = (data.data || []).filter(
        (p: { LocalId: string | number }) =>
          Number(p.LocalId) === 0 ||
          Number(p.LocalId) === Number(cajaAperturada?.CajaId)
      );

      if (productosFiltrados.length > 0) {
        const primerProducto = productosFiltrados[0];

        agregarProducto({
          id: primerProducto.ProductoId,
          nombre: primerProducto.ProductoNombre,
          precio: primerProducto.ProductoPrecioVenta,
          imagen: primerProducto.ProductoImagen
            ? `data:image/jpeg;base64,${primerProducto.ProductoImagen}`
            : logo,
          stock: primerProducto.ProductoStock,
        });

        setBusqueda("");
        setBusquedaDebounced("");
      }
    } catch (error) {
      console.error("Error al buscar producto:", error);
    }
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
                    Precio Alquiler
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
        {/* Panel inferior con fechas y botones */}
        <div className="bg-white rounded-xl shadow p-4">
          {/* Fechas */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Alquiler *
              </label>
              <input
                type="date"
                value={fechaAlquiler}
                onChange={(e) => {
                  const nuevaFechaAlquiler = e.target.value;
                  setFechaAlquiler(nuevaFechaAlquiler);
                  // Si la fecha de entrega es anterior a la nueva fecha de alquiler, resetearla
                  if (
                    fechaEntrega &&
                    new Date(fechaEntrega) < new Date(nuevaFechaAlquiler)
                  ) {
                    setFechaEntrega("");
                    setFechaDevolucion("");
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Entrega *
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => {
                  const nuevaFechaEntrega = e.target.value;
                  setFechaEntrega(nuevaFechaEntrega);
                  // Si la fecha de devolución es anterior a la nueva fecha de entrega, resetearla
                  if (
                    fechaDevolucion &&
                    new Date(fechaDevolucion) < new Date(nuevaFechaEntrega)
                  ) {
                    setFechaDevolucion("");
                  }
                }}
                min={fechaAlquiler}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Devolución *
              </label>
              <input
                type="date"
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
                min={fechaEntrega || fechaAlquiler}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          {/* Total */}
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-lg">Total</span>
            <span className="font-semibold text-lg text-blue-500">
              Gs. {formatMiles(total)}
            </span>
          </div>
          {/* Grid de botones */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* Botón Alquilar grande */}
            <button
              className={`border-2 text-white font-semibold rounded-lg flex items-center justify-center text-lg h-[100px] transition ${
                !clienteSeleccionado ||
                clienteSeleccionado.ClienteNombre === "SIN NOMBRE MINORISTA" ||
                clienteSeleccionado.ClienteNombre.trim() === ""
                  ? "bg-gray-400 border-gray-400 cursor-not-allowed"
                  : "bg-blue-500 border-blue-500 hover:bg-blue-600 cursor-pointer"
              }`}
              onClick={() => {
                if (
                  !clienteSeleccionado ||
                  clienteSeleccionado.ClienteNombre ===
                    "SIN NOMBRE MINORISTA" ||
                  clienteSeleccionado.ClienteNombre.trim() === ""
                ) {
                  Swal.fire({
                    icon: "warning",
                    title: "Cliente requerido",
                    text: "Debes seleccionar un cliente válido para realizar el alquiler",
                  });
                  return;
                }
                setShowModal(true);
              }}
              disabled={
                !clienteSeleccionado ||
                clienteSeleccionado.ClienteNombre === "SIN NOMBRE MINORISTA" ||
                clienteSeleccionado.ClienteNombre.trim() === ""
              }
            >
              Alquilar
            </button>
            {/* Botón Imprimir Ticket */}
            <button
              className="bg-green-500 border border-green-500 rounded-lg text-white font-medium text-lg h-[100px] flex items-center justify-center hover:bg-green-600 transition"
              onClick={generateTicketPDF}
            >
              Imprimir Ticket
            </button>
          </div>
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
                : "Seleccionar Cliente"}
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
          <div className="flex items-center gap-4">
            <SearchButton
              searchTerm={busqueda}
              onSearch={setBusqueda}
              onSearchSubmit={handleSearchSubmit}
              placeholder="Buscar por nombre o código"
              hideButton={true}
              inputRef={searchInputRef}
            />
          </div>
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
          className="flex flex-col"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <div className="overflow-y-auto flex-1 mb-4">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              }}
            >
              {loading ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Cargando productos...
                </div>
              ) : productos.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No se encontraron productos
                </div>
              ) : (
                productos.map((p) => (
                  <ProductCard
                    key={p.ProductoId}
                    nombre={p.ProductoNombre}
                    precio={p.ProductoPrecioVenta}
                    precioMayorista={p.ProductoPrecioVenta}
                    clienteTipo="MI"
                    imagen={
                      p.ProductoImagen
                        ? `data:image/jpeg;base64,${p.ProductoImagen}`
                        : logo
                    }
                    stock={p.ProductoStock}
                    onAdd={() =>
                      agregarProducto({
                        id: p.ProductoId,
                        nombre: p.ProductoNombre,
                        precio: p.ProductoPrecioVenta,
                        imagen: p.ProductoImagen
                          ? `data:image/jpeg;base64,${p.ProductoImagen}`
                          : logo,
                        stock: p.ProductoStock,
                      })
                    }
                    precioUnitario={p.ProductoPrecioVenta}
                  />
                ))
              )}
            </div>
          </div>
          {/* Paginación */}
          {!loading && productos.length > 0 && pagination.totalPages > 1 && (
            <div className="bg-white rounded-lg shadow p-4">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={pagination.itemsPerPage}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
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
