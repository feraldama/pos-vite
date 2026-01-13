import { useState, useEffect, useRef } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import { getProductosAll } from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";
import axios from "axios";
import { js2xml } from "xml-js";
import logo from "../../assets/img/logo.jpg";
import { useNavigate } from "react-router-dom";
import ActionButton from "../../components/common/Button/ActionButton";
import { getLocalById } from "../../services/locales.service";
import { usePermiso } from "../../hooks/usePermiso";

export default function Inventario() {
  const [carrito, setCarrito] = useState<
    {
      id: number;
      nombre: string;
      imagen: string;
      stock: number;
      caja: number; // Cantidad en cajas
      cartItemId: number;
    }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<
    {
      ProductoId: number;
      ProductoCodigo: string;
      ProductoNombre: string;
      ProductoPrecioVenta: number;
      ProductoPrecioPromedio?: string;
      ProductoStock: number;
      ProductoImagen?: string;
      ProductoPrecioVentaMayorista: number;
      LocalId: string | number;
      ProductoPrecioUnitario: number;
      ProductoStockUnitario?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const puedeCrear = usePermiso("INVENTARIO", "crear");
  const puedeEditar = usePermiso("INVENTARIO", "editar");
  const puedeEliminar = usePermiso("INVENTARIO", "eliminar");
  const puedeLeer = usePermiso("INVENTARIO", "leer");
  const [tipoInventario, setTipoInventario] = useState("F"); // F = Fijar, S = Sumar
  const [localNombre, setLocalNombre] = useState("");
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const cantidadCajaRefs = useRef<{ [key: number]: HTMLInputElement | null }>(
    {}
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      selectedProductId !== null &&
      cantidadCajaRefs.current[selectedProductId]
    ) {
      cantidadCajaRefs.current[selectedProductId]?.focus();
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
    imagen: string;
    stock: number;
  }) => {
    if (!puedeCrear) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para agregar productos al inventario.",
      });
      return;
    }
    const nuevoCartItemId = Date.now() + Math.random();

    setCarrito([
      ...carrito,
      {
        ...producto,
        caja: 0,
        cartItemId: nuevoCartItemId,
      },
    ]);
    setSelectedProductId(nuevoCartItemId);
  };

  const quitarProducto = (cartItemId: number) => {
    if (!puedeEliminar) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para eliminar productos del inventario.",
      });
      return;
    }
    setCarrito(carrito.filter((p) => p.cartItemId !== cartItemId));
  };

  const cambiarCantidadCaja = (cartItemId: number, cantidad: number) => {
    if (!puedeEditar) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para editar cantidades en el inventario.",
      });
      return;
    }
    setCarrito(
      carrito.map((p) => {
        if (p.cartItemId === cartItemId) {
          return {
            ...p,
            caja: Math.max(0, cantidad),
          };
        }
        return p;
      })
    );
  };

  useEffect(() => {
    setLoading(true);
    getProductosAll()
      .then((data) => {
        setProductos(data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const sendRequest = async () => {
    if (!puedeCrear && !puedeEditar) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para actualizar el inventario.",
      });
      return;
    }

    if (carrito.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debes agregar al menos un producto",
      });
      return;
    }

    if (!user?.LocalId) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Usuario no válido. Por favor, inicia sesión nuevamente",
      });
      return;
    }

    // Validar que al menos un producto tenga cantidad mayor a 0
    const productosValidos = carrito.filter((p) => p.caja > 0);

    if (productosValidos.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debes ingresar al menos una cantidad de caja para algún producto",
      });
      return;
    }

    // Enviar cada producto por separado
    try {
      for (const producto of productosValidos) {
        const json = {
          Envelope: {
            _attributes: {
              xmlns: "http://schemas.xmlsoap.org/soap/envelope/",
            },
            Body: {
              "PInventarioWS.VENTACONFIRMAR": {
                _attributes: { xmlns: "Tech" },
                Productoid: producto.id,
                Caja: producto.caja,
                Unidad: 0,
                Almacenid: Number(user.LocalId),
                Tipo: tipoInventario,
              },
            },
          },
        };

        const xml = js2xml(json, {
          compact: true,
          ignoreComment: true,
          spaces: 4,
        });

        const config = {
          headers: {
            "Content-Type": "text/xml",
          },
        };

        await axios.post(
          `${import.meta.env.VITE_APP_URL}${
            import.meta.env.VITE_APP_URL_GENEXUS
          }apinventariows`,
          xml,
          config
        );
      }

      Swal.fire({
        title: "Inventario actualizado con éxito!",
        html: `Inventario actualizado en <b></b> segundos.`,
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
              const timerInterval = setInterval(() => {
                const timerLeft = Swal.getTimerLeft();
                const secondsLeft = timerLeft ? Math.ceil(timerLeft / 1000) : 0;
                timer.textContent = `${secondsLeft}`;
              }, 100);

              // Limpiar el intervalo cuando el popup se cierre
              const originalClose = Swal.close;
              Swal.close = () => {
                clearInterval(timerInterval);
                originalClose.call(Swal);
              };
            }
          }
        },
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
          window.location.reload();
        }
      });
    } catch (error: unknown) {
      console.error("Error al actualizar inventario:", error);
      const err = error as { message?: string };
      const msg = err?.message || "Error al actualizar inventario";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    }

    // Limpiar estados
    setCarrito([]);
  };

  const handleTecladoNumerico = (valor: string | number) => {
    if (selectedProductId === null) return;
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== selectedProductId) return item;
        let nuevaCantidad = String(item.caja);
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
        const cantidad = Math.max(0, Number(nuevaCantidad));
        return { ...item, caja: cantidad };
      })
    );
  };

  const handleSearchSubmit = () => {
    if (!busqueda.trim()) return;

    if (!puedeCrear) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para agregar productos al inventario.",
      });
      return;
    }

    const productosFiltrados = productos.filter(
      (p) =>
        (p.ProductoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          (p.ProductoCodigo &&
            String(p.ProductoCodigo)
              .toLowerCase()
              .includes(busqueda.toLowerCase()))) &&
        (Number(p.LocalId) === 0 || Number(p.LocalId) === Number(user?.LocalId))
    );

    if (productosFiltrados.length > 0) {
      const primerProducto = productosFiltrados[0];
      agregarProducto({
        id: primerProducto.ProductoId,
        nombre: primerProducto.ProductoNombre,
        imagen: primerProducto.ProductoImagen
          ? `data:image/jpeg;base64,${primerProducto.ProductoImagen}`
          : logo,
        stock: primerProducto.ProductoStock,
      });
      setBusqueda("");
    }
  };

  if (!puedeLeer) return <div>No tienes permiso para ver el inventario.</div>;

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
                          {puedeEliminar && (
                            <div
                              className="text-red-600 text-sm mt-1 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                quitarProducto(p.cartItemId);
                              }}
                            >
                              Eliminar
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      className="py-3 pr-6 align-middle"
                      onClick={() => {
                        setSelectedProductId(p.cartItemId);
                        setTimeout(() => {
                          cantidadCajaRefs.current[p.cartItemId]?.focus();
                        }, 0);
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cambiarCantidadCaja(p.cartItemId, p.caja - 1);
                            setSelectedProductId(p.cartItemId);
                          }}
                          disabled={!puedeEditar}
                          className={`w-8 h-8 border border-gray-300 rounded text-lg font-bold flex items-center justify-center ${
                            puedeEditar
                              ? "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={p.caja}
                          min={0}
                          disabled={!puedeEditar}
                          className={`w-16 h-8 text-center border border-gray-300 rounded text-base font-semibold mx-1 ${
                            puedeEditar
                              ? "bg-gray-50 text-[#222]"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                          readOnly
                          ref={(el) => {
                            cantidadCajaRefs.current[p.cartItemId] = el || null;
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
                              cambiarCantidadCaja(p.cartItemId, p.caja + 1);
                            } else if (e.key === "ArrowDown") {
                              e.preventDefault();
                              cambiarCantidadCaja(p.cartItemId, p.caja - 1);
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cambiarCantidadCaja(p.cartItemId, p.caja + 1);
                            setSelectedProductId(p.cartItemId);
                          }}
                          disabled={!puedeEditar}
                          className={`w-8 h-8 border border-gray-300 rounded text-lg font-bold flex items-center justify-center ${
                            puedeEditar
                              ? "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de control inferior */}
        <div className="bg-white rounded-xl shadow p-4">
          {/* Tipo de Inventario */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Modificación
            </label>
            <select
              value={tipoInventario}
              onChange={(e) => setTipoInventario(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="F">Fijar</option>
              <option value="S">Sumar</option>
            </select>
          </div>

          {/* Botón Actualizar Inventario */}
          <div className="mb-3">
            <button
              className={`w-full border rounded-lg text-white font-medium text-lg h-[60px] flex items-center justify-center transition ${
                puedeCrear || puedeEditar
                  ? "bg-green-500 border-green-500 hover:bg-green-600"
                  : "bg-gray-400 border-gray-400 cursor-not-allowed"
              }`}
              onClick={sendRequest}
              disabled={!puedeCrear && !puedeEditar}
            >
              Actualizar Inventario
            </button>
          </div>

          {/* Información del almacén */}
          {localNombre && (
            <div className="mt-2 text-center text-sm text-gray-600">
              Almacén: <span className="font-semibold">{localNombre}</span>
            </div>
          )}
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
              <ActionButton
                label="Volver"
                onClick={() => navigate(-1)}
                className="bg-gray-500 hover:bg-gray-700 text-white"
              />
            </div>
          )}
        </div>

        {/* Contenedor con scroll solo para los productos */}
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
                    (p.ProductoNombre.toLowerCase().includes(
                      busqueda.toLowerCase()
                    ) ||
                      (p.ProductoCodigo &&
                        String(p.ProductoCodigo)
                          .toLowerCase()
                          .includes(busqueda.toLowerCase()))) &&
                    (Number(p.LocalId) === 0 ||
                      Number(p.LocalId) === Number(user?.LocalId))
                )
                .map((p) => (
                  <ProductCard
                    key={p.ProductoId}
                    nombre={p.ProductoNombre}
                    precio={
                      p.ProductoPrecioPromedio
                        ? Number(p.ProductoPrecioPromedio)
                        : p.ProductoPrecioVenta
                    }
                    precioMayorista={p.ProductoPrecioVentaMayorista}
                    clienteTipo="MI"
                    imagen={
                      p.ProductoImagen
                        ? `data:image/jpeg;base64,${p.ProductoImagen}`
                        : logo
                    }
                    stock={p.ProductoStock}
                    onAdd={() => {
                      if (puedeCrear) {
                        agregarProducto({
                          id: p.ProductoId,
                          nombre: p.ProductoNombre,
                          imagen: p.ProductoImagen
                            ? `data:image/jpeg;base64,${p.ProductoImagen}`
                            : logo,
                          stock: p.ProductoStock,
                        });
                      } else {
                        Swal.fire({
                          icon: "warning",
                          title: "Sin permisos",
                          text: "No tienes permiso para agregar productos al inventario.",
                        });
                      }
                    }}
                    precioUnitario={0}
                  />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
