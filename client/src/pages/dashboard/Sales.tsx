import React, { useState, useEffect } from "react";
import ActionButton from "../../components/common/Button/ActionButton";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import { getProductosAll } from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";

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
            borderRadius: 8,
            boxShadow: "0 2px 8px #0001",
            padding: 16,
            marginBottom: 16,
          }}
        >
          <table style={{ width: "100%" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Nombre</th>
                <th>Cantidad</th>
                <th>Precio Uni.</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carrito.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img
                      src={p.imagen}
                      alt={p.nombre}
                      style={{
                        width: 32,
                        verticalAlign: "middle",
                        marginRight: 8,
                      }}
                    />
                    {p.nombre}
                  </td>
                  <td>
                    <button
                      onClick={() => cambiarCantidad(p.id, p.cantidad - 1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={p.cantidad}
                      min={1}
                      style={{ width: 40, textAlign: "center" }}
                      readOnly
                    />
                    <button
                      onClick={() => cambiarCantidad(p.id, p.cantidad + 1)}
                    >
                      +
                    </button>
                  </td>
                  <td>Gs. {p.precio}</td>
                  <td>Gs. {p.precio * p.cantidad}</td>
                  <td>
                    <span
                      style={{ color: "red", cursor: "pointer" }}
                      onClick={() => quitarProducto(p.id)}
                    >
                      Eliminar
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          style={{ display: "flex", alignItems: "center", marginBottom: 16 }}
        >
          <SearchButton
            searchTerm={busqueda}
            onSearch={setBusqueda}
            onSearchSubmit={() => {}}
            placeholder="Buscar productos"
          />
        </div>
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
            // productos
            //   .filter((p) =>
            //     p.ProductoNombre.toLowerCase().includes(busqueda.toLowerCase())
            //   )
            //   .map((p) => (
            //     <div
            //       key={p.ProductoId}
            //       style={{
            //         background: "#fff",
            //         borderRadius: 8,
            //         boxShadow: "0 2px 8px #0001",
            //         padding: 16,
            //         textAlign: "center",
            //         cursor: "pointer",
            //       }}
            //       onClick={() =>
            //         agregarProducto({
            //           id: p.ProductoId,
            //           nombre: p.ProductoNombre,
            //           precio: p.ProductoPrecioVenta,
            //           imagen: p.ProductoImagen
            //             ? `data:image/jpeg;base64,${p.ProductoImagen}`
            //             : "https://via.placeholder.com/80x120?text=Sin+Imagen",
            //           stock: p.ProductoStock,
            //         })
            //       }
            //     >
            //       <img
            //         src={
            //           p.ProductoImagen
            //             ? `data:image/jpeg;base64,${p.ProductoImagen}`
            //             : "https://via.placeholder.com/80x120?text=Sin+Imagen"
            //         }
            //         alt={p.ProductoNombre}
            //         style={{
            //           width: 80,
            //           height: 120,
            //           objectFit: "contain",
            //           marginBottom: 8,
            //         }}
            //       />
            //       <div style={{ fontWeight: "bold", fontSize: 18 }}>
            //         {p.ProductoNombre}
            //       </div>
            //       <div
            //         style={{ color: "#f60", fontWeight: "bold", fontSize: 16 }}
            //       >
            //         Gs. {p.ProductoPrecioVenta.toLocaleString()}
            //       </div>
            //       <div style={{ fontSize: 12, color: "#888" }}>
            //         Stock: {p.ProductoStock}
            //       </div>
            //     </div>
            //   ))
            productos
              .filter((p) =>
                p.ProductoNombre.toLowerCase().includes(busqueda.toLowerCase())
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
  );
}
