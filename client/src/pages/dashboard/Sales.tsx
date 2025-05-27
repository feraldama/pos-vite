import React, { useState, useEffect } from "react";
import ActionButton from "../../components/common/Button/ActionButton";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import { getProductosAll } from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";

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
  const { user } = useAuth();

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
              onClick={() => alert("Pagar")}
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
    </div>
  );
}
