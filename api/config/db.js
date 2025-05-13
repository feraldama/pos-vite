const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tu_base_de_datos",
});

// Conexión y exportación
db.connect((err) => {
  if (err) {
    console.error("Error conectando a MySQL:", err);
    process.exit(1); // Salir si hay error de conexión
  }
  console.log("Conectado a MySQL");
});

module.exports = db;
