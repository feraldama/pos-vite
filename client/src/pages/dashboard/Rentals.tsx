import { useState, useEffect, useRef, useCallback } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import {
  getProductosPaginated,
  searchProductos,
} from "../../services/productos.service";
import ProductCard, {
  type RangoAlquilado,
} from "../../components/products/ProductCard";
import { getFechasOcupadas } from "../../services/alquilerprendas.service";
import { useAuth } from "../../contexts/useAuth";
import PaymentModal from "../../components/common/PaymentModal";
import Swal from "sweetalert2";
import { createAlquiler } from "../../services/alquiler.service";
import logo from "../../assets/placeholderPrenda";
import {
  getAllClientesSinPaginacion,
  createCliente,
} from "../../services/clientes.service";
import ClienteModal from "../../components/common/ClienteModal";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";
import { getLocalById } from "../../services/locales.service";
import { useNavigate } from "react-router-dom";
import ActionButton from "../../components/common/Button/ActionButton";
import PagoModal from "../../components/common/PagoModal";
import Pagination from "../../components/common/Pagination";
import { formatMiles } from "../../utils/formato";

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
      observacion: string;
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Rangos de fechas ya alquilados, por ProductoId
  const [fechasOcupadas, setFechasOcupadas] = useState<
    Record<number, RangoAlquilado[]>
  >({});

  const cargarFechasOcupadas = useCallback(async () => {
    try {
      const rows = await getFechasOcupadas();
      const map: Record<number, RangoAlquilado[]> = {};
      for (const r of rows) {
        if (!map[r.ProductoId]) map[r.ProductoId] = [];
        map[r.ProductoId].push({
          desde: r.AlquilerFechaEntrega,
          hasta: r.AlquilerFechaDevolucion,
          cliente: [r.ClienteNombre, r.ClienteApellido]
            .filter(Boolean)
            .join(" "),
        });
      }
      setFechasOcupadas(map);
    } catch (error) {
      console.error("Error al cargar fechas ocupadas:", error);
    }
  }, []);

  useEffect(() => {
    cargarFechasOcupadas();
  }, [cargarFechasOcupadas]);
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
        observacion: "",
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

  const cambiarObservacion = (cartItemId: number, observacion: string) => {
    setCarrito(
      carrito.map((p) =>
        p.cartItemId === cartItemId ? { ...p, observacion } : p
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

      // Preparar las prendas para enviar en el body del alquiler
      // Crear un objeto por cada unidad (según la cantidad en el carrito)
      const prendas: Array<{
        ProductoId: number;
        AlquilerPrendasPrecio: number;
        AlquilerPrendasObservacion: string;
      }> = [];
      carrito.forEach((item) => {
        // Agregar tantas prendas como indique la cantidad
        for (let i = 0; i < item.cantidad; i++) {
          prendas.push({
            ProductoId: item.id,
            AlquilerPrendasPrecio: item.precioAlquiler,
            AlquilerPrendasObservacion: item.observacion.trim(),
          });
        }
      });

      // Crear el alquiler con las prendas incluidas para validación
      const alquilerData = {
        ClienteId: clienteSeleccionado.ClienteId,
        AlquilerFechaAlquiler: fechaAlquiler,
        AlquilerFechaEntrega: fechaEntrega,
        AlquilerFechaDevolucion: fechaDevolucion || null,
        AlquilerEstado: "Pendiente",
        AlquilerTotal: total,
        AlquilerEntrega: Math.round(montoEntrega),
        prendas: prendas,
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

      // Las prendas ya fueron creadas por el controlador cuando se enviaron en el body

      if (printTicket) {
        generateTicketPDF(alquilerId);
      }

      Swal.fire({
        title: "Alquiler realizado con éxito!",
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        // Refrescar las fechas alquiladas en las fichas
        cargarFechasOcupadas();
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
        setClienteSeleccionado(null);
      });
    } catch (error: unknown) {
      console.error(error);

      // El servicio lanza axiosError.response?.data directamente, que es un objeto
      // Verificar si es un error de disponibilidad de prendas
      if (
        error &&
        typeof error === "object" &&
        "success" in error &&
        error.success === false &&
        "prendasNoDisponibles" in error
      ) {
        const errorData = error as {
          message?: string;
          prendasNoDisponibles?: Array<{
            ProductoId: number;
            ProductoNombre: string;
            ProductoCodigo?: string;
            ProductoImagen?: string | null;
            cantidadSolicitada?: number;
            stockDisponible?: number;
            prendasAlquiladas?: number;
            stockRealDisponible?: number;
            conflictos?: Array<{
              AlquilerId: number;
              FechaEntregaFormateada: string;
              FechaDevolucionFormateada: string;
            }>;
          }>;
          detalles?: string[];
        };
        const prendasNoDisponibles = errorData.prendasNoDisponibles || [];
        const mensajePrincipal =
          errorData.message || "Una o más prendas no están disponibles";

        // Construir HTML detallado con imágenes, fechas e información de stock
        let htmlContent = `<div style="text-align: left; max-width: 600px;">`;
        htmlContent += `<p style="margin-bottom: 15px; font-weight: 500;">${mensajePrincipal}:</p>`;

        prendasNoDisponibles.forEach((prenda, index) => {
          const conflicto =
            prenda.conflictos && prenda.conflictos.length > 0
              ? prenda.conflictos[0]
              : null;
          const imagenSrc = prenda.ProductoImagen
            ? `data:image/jpeg;base64,${prenda.ProductoImagen}`
            : logo;

          htmlContent += `<div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 8px; border-left: 3px solid #ff9800;">`;
          htmlContent += `<img src="${imagenSrc}" alt="${prenda.ProductoNombre}" style="width: 60px; height: 60px; object-fit: contain; border-radius: 6px; background-color: white; padding: 4px; flex-shrink: 0;" />`;
          htmlContent += `<div style="flex: 1;">`;
          htmlContent += `<div style="font-weight: 600; margin-bottom: 4px; color: #333;">${
            index + 1
          }. ${prenda.ProductoNombre}</div>`;

          // Mostrar información de stock
          if (
            prenda.cantidadSolicitada !== undefined &&
            prenda.stockRealDisponible !== undefined
          ) {
            htmlContent += `<div style="font-size: 13px; color: #d32f2f; margin-bottom: 4px; font-weight: 500;">⚠️ Stock insuficiente</div>`;
            htmlContent += `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">📦 Solicitadas: <strong>${prenda.cantidadSolicitada}</strong> prenda(s)</div>`;
            htmlContent += `<div style="font-size: 12px; color: #666; margin-bottom: 2px;">📊 Disponibles: <strong>${
              prenda.stockRealDisponible
            }</strong> de <strong>${prenda.stockDisponible || 0}</strong> (${
              prenda.prendasAlquiladas || 0
            } alquiladas)</div>`;
          }

          // Mostrar información de conflicto si existe
          if (conflicto) {
            htmlContent += `<div style="font-size: 12px; color: #666; margin-top: 4px; padding-top: 4px; border-top: 1px solid #ddd;">📅 Ya alquilada del <strong>${conflicto.FechaEntregaFormateada}</strong> al <strong>${conflicto.FechaDevolucionFormateada}</strong> (Alquiler #${conflicto.AlquilerId})</div>`;
          }

          htmlContent += `</div>`;
          htmlContent += `</div>`;
        });

        htmlContent += `</div>`;

        Swal.fire({
          icon: "warning",
          title: "Prendas no disponibles",
          html: htmlContent,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#2563eb",
          width: "600px",
        });
        return;
      }

      // Manejar otros errores - el servicio lanza el objeto de respuesta directamente
      let mensajeError = "Error al realizar el alquiler";
      if (error && typeof error === "object" && "message" in error) {
        mensajeError = String(error.message);
      } else if (error instanceof Error) {
        mensajeError = error.message;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: mensajeError,
      });
    }
  };

  // El generador de tickets arrastra jspdf (~350 KB): se carga al imprimir
  const generateTicketPDF = async (alquilerId?: number) => {
    const { generarTicketAlquiler } = await import(
      "../../utils/ticketAlquiler"
    );
    generarTicketAlquiler({
      alquilerId,
      cliente: {
        nombre: clienteSeleccionado?.ClienteNombre || "",
        apellido: clienteSeleccionado?.ClienteApellido || "",
        ruc: clienteSeleccionado?.ClienteRUC || "",
      },
      fechaAlquiler,
      fechaEntrega,
      fechaDevolucion,
      prendas: carrito.map((p) => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precioAlquiler,
        ajuste: p.observacion,
      })),
      total,
      entregado: efectivo + banco + bancoDebito * 1.03 + bancoCredito * 1.05,
      pagos: {
        efectivo,
        transferencia: banco,
        tarjetaDebito: bancoDebito,
        tarjetaCredito: bancoCredito,
        cuentaCliente,
        voucher,
      },
    });
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
                        <div className="flex-1">
                          <div className="font-bold text-[17px] text-[#222] leading-tight">
                            {p.nombre}
                          </div>
                          <button
                            type="button"
                            aria-label={`Eliminar ${p.nombre} del carrito`}
                            className="mt-1 -mx-1 cursor-pointer rounded px-1 text-sm text-red-700 transition-colors duration-200 hover:bg-red-50 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              quitarProducto(p.cartItemId);
                            }}
                          >
                            Eliminar
                          </button>
                          <input
                            type="text"
                            value={p.observacion}
                            onChange={(e) =>
                              cambiarObservacion(p.cartItemId, e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Ajuste / detalle antes de la entrega (opcional)"
                            className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-gray-50"
                          />
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
              <label
                htmlFor="rentals-fecha-alquiler" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Alquiler *
              </label>
              <input
                id="rentals-fecha-alquiler"
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
              <label
                htmlFor="rentals-fecha-entrega" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Entrega *
              </label>
              <input
                id="rentals-fecha-entrega"
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
              <label
                htmlFor="rentals-fecha-devolucion" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Devolución *
              </label>
              <input
                id="rentals-fecha-devolucion"
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
            <span className="font-semibold text-lg tabular-nums text-blue-700">
              Gs. {formatMiles(total)}
            </span>
          </div>
          {/* Grid de botones */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* Botón Alquilar grande */}
            <button
              className={`flex h-[100px] items-center justify-center rounded-lg border-2 text-lg font-semibold text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                !clienteSeleccionado ||
                clienteSeleccionado.ClienteNombre === "SIN NOMBRE MINORISTA" ||
                clienteSeleccionado.ClienteNombre.trim() === ""
                  ? "cursor-not-allowed border-slate-400 bg-slate-400"
                  : "cursor-pointer border-blue-600 bg-blue-600 hover:bg-blue-700"
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
              className="flex h-[100px] cursor-pointer items-center justify-center rounded-lg border border-green-700 bg-green-700 text-lg font-medium text-white transition-colors duration-200 hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
              onClick={() => generateTicketPDF()}
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
                variant="primary"
              />
              <ActionButton
                label="Pagos"
                onClick={() => setShowPagoModal(true)}
                variant="success"
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
                    precioMayorista={undefined}
                    clienteTipo="MI"
                    imagen={
                      p.ProductoImagen
                        ? `data:image/jpeg;base64,${p.ProductoImagen}`
                        : logo
                    }
                    stock={p.ProductoStock}
                    fechasAlquiladas={fechasOcupadas[p.ProductoId]}
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
