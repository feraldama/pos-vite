require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Importar rutas
const usuarioRoutes = require("./routes/usuario.routes");
const registroDiarioCajaRoutes = require("./routes/registrodiariocaja.routes");
const cajaRoutes = require("./routes/caja.routes");
const tipoGastoRoutes = require("./routes/tipogasto.routes");
const clienteRoutes = require("./routes/cliente.routes");
const tipogastoGrupoRoutes = require("./routes/tipogastogrupo.routes");
const productoRoutes = require("./routes/producto.routes");
const localRoutes = require("./routes/local.routes");
const almacenRoutes = require("./routes/almacen.routes");
const comboRoutes = require("./routes/combo.routes");
const perfilRoutes = require("./routes/perfil.routes");
const menuRoutes = require("./routes/menu.routes");
const perfilMenuRoutes = require("./routes/perfilmenu.routes");
const usuarioPerfilRoutes = require("./routes/usuarioperfil.routes");
const ventaProductoRoutes = require("./routes/ventaproducto.routes");
const ventaRoutes = require("./routes/venta.routes");
const ventaCreditoRoutes = require("./routes/ventacredito.routes");
const ventaCreditoPagoRoutes = require("./routes/ventacreditopago.routes");
const posRoutes = require("./routes/pos.routes");
const promocionRoutes = require("./routes/promocion.routes");
// const productoRoutes = require("./routes/producto.routes"); // Ejemplo adicional

const app = express();

// Configuración de CORS
// Se permite cualquier puerto de los hosts conocidos (la app puede servirse en
// 5173 con `vite dev`, en 4173 con `vite preview` o detrás de Apache en el 80).
// Con CORS_ORIGINS del .env se agregan orígenes extra:
//   CORS_ORIGINS=http://mi-dominio.com,http://otra-ip:8080
// y CORS_ORIGINS=* desactiva la lista blanca (la API usa tokens Bearer, no cookies).
const extraOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const permitirTodos = extraOrigins.includes("*");

// Hosts propios: cualquier puerto de estos hosts queda habilitado
const allowedHosts = new Set([
  "localhost",
  "127.0.0.1",
  "181.123.61.216",
  "192.168.0.127",
]);

const esOrigenPermitido = (origin) => {
  if (permitirTodos) return true;
  if (extraOrigins.includes(origin)) return true;
  try {
    return allowedHosts.has(new URL(origin).hostname);
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // Permite herramientas sin origin (Postman, curl, health checks)
    if (!origin || esOrigenPermitido(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS: origen no permitido -> ${origin}`);
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 horas
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Rutas
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/registrodiariocaja", registroDiarioCajaRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/tipogasto", tipoGastoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/tipogastogrupo", tipogastoGrupoRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/locales", localRoutes);
app.use("/api/almacen", almacenRoutes);
app.use("/api/combo", comboRoutes);
app.use("/api/perfiles", perfilRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/perfilmenu", perfilMenuRoutes);
app.use("/api/usuarioperfil", usuarioPerfilRoutes);
app.use("/api/ventaproducto", ventaProductoRoutes);
app.use("/api/venta", ventaRoutes);
app.use("/api/ventacredito", ventaCreditoRoutes);
app.use("/api/ventacreditopago", ventaCreditoPagoRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/promociones", promocionRoutes);
// app.use("/api/productos", productoRoutes); // Ejemplo adicional

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API funcionando");
});

// Manejo de errores (puedes mejorarlo)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Algo salió mal!");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
