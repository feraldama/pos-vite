import React from "react";

interface ProductCardProps {
  // id: number;
  nombre: string;
  precio: number;
  precioMayorista?: number;
  clienteTipo?: string;
  imagen: string;
  stock: number;
  onAdd: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  // id,
  nombre,
  precio,
  precioMayorista,
  clienteTipo,
  imagen,
  stock,
  onAdd,
}) => {
  const mostrarPrecio =
    clienteTipo === "MA" && precioMayorista !== undefined
      ? precioMayorista
      : precio;
  return (
    <div
      style={{
        width: "100%",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        boxShadow: "0 2px 8px #0001",
        cursor: "pointer",
        padding: 0,
        transition: "box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
      onClick={onAdd}
    >
      <div
        style={{
          width: "100%",
          padding: 16,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          style={{
            width: "auto",
            height: 120,
            objectFit: "contain",
            borderRadius: 0,
            background: "#fff",
          }}
          src={imagen}
          alt={nombre}
        />
      </div>
      <div
        style={{
          width: "100%",
          padding: "0 16px 10px 16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#222",
            textTransform: "uppercase",
            lineHeight: 1.2,
            marginBottom: 0,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {nombre}
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 22,
            color: "#ff9100",
            marginBottom: 0,
          }}
        >
          Gs. {mostrarPrecio.toLocaleString()}
        </div>
        <div style={{ fontSize: 15, color: "#888", marginTop: 4 }}>
          Stock:{" "}
          <span style={{ color: "#43a047", fontWeight: 600 }}>{stock}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
