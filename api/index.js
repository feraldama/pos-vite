require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Importar rutas
const usuarioRoutes = require("./routes/usuario.routes");
const registroDiarioCajaRoutes = require("./routes/registrodiariocaja.routes");
// const productoRoutes = require("./routes/producto.routes"); // Ejemplo adicional

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: "*", // Permite todas las origenes
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 horas
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Rutas
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/registrodiariocaja", registroDiarioCajaRoutes);
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
