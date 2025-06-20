const db = require("../config/db");

const Venta = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM venta", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT v.*, 
          c.ClienteNombre, c.ClienteApellido,
          a.AlmacenNombre,
          u.UsuarioNombre
        FROM venta v
        LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
        LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
        LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
        WHERE v.VentaId = ?`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO venta (
        VentaFecha,
        ClienteId,
        AlmacenId,
        VentaTipo,
        VentaPagoTipo,
        VentaCantidadProductos,
        VentaUsuario,
        Total,
        VentaEntrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.VentaFecha,
        data.ClienteId,
        data.AlmacenId,
        data.VentaTipo,
        data.VentaPagoTipo,
        data.VentaCantidadProductos,
        data.VentaUsuario,
        data.Total,
        data.VentaEntrega,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        Venta.getById(result.insertId)
          .then((venta) => resolve(venta))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE venta SET 
        VentaFecha = ?,
        ClienteId = ?,
        AlmacenId = ?,
        VentaTipo = ?,
        VentaPagoTipo = ?,
        VentaCantidadProductos = ?,
        VentaUsuario = ?,
        Total = ?,
        VentaEntrega = ?
        WHERE VentaId = ?`;

      const values = [
        data.VentaFecha,
        data.ClienteId,
        data.AlmacenId,
        data.VentaTipo,
        data.VentaPagoTipo,
        data.VentaCantidadProductos,
        data.VentaUsuario,
        data.Total,
        data.VentaEntrega,
        id,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Venta.getById(id)
          .then((venta) => resolve(venta))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM venta WHERE VentaId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "VentaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaFecha",
        "ClienteId",
        "AlmacenId",
        "VentaTipo",
        "VentaPagoTipo",
        "VentaCantidadProductos",
        "VentaUsuario",
        "Total",
        "VentaEntrega",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const query = `
        SELECT v.*, 
          c.ClienteNombre, c.ClienteApellido,
          a.AlmacenNombre,
          u.UsuarioNombre
        FROM venta v
        LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
        LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
        LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
        ORDER BY v.${sortField} ${order} 
        LIMIT ? OFFSET ?`;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query("SELECT COUNT(*) as total FROM venta", (err, countResult) => {
          if (err) return reject(err);

          resolve({
            ventas: results,
            total: countResult[0].total,
          });
        });
      });
    });
  },

  searchVentas: (
    term,
    limit,
    offset,
    sortBy = "VentaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaFecha",
        "ClienteId",
        "AlmacenId",
        "VentaTipo",
        "VentaPagoTipo",
        "VentaCantidadProductos",
        "VentaUsuario",
        "Total",
        "VentaEntrega",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      // Mapear términos comunes a códigos de tipo de venta
      let tipoVentaSearch = term.toLowerCase();
      switch (tipoVentaSearch) {
        case "contado":
          tipoVentaSearch = "CO";
          break;
        case "credito":
        case "crédito":
          tipoVentaSearch = "CR";
          break;
        case "pos":
          tipoVentaSearch = "PO";
          break;
        case "transfer":
        case "transferencia":
          tipoVentaSearch = "TR";
          break;
        default:
          // Si no es ninguno de los tipos conocidos, mantener el término original
          break;
      }

      const searchQuery = `
        SELECT v.*, 
          c.ClienteNombre, c.ClienteApellido,
          a.AlmacenNombre,
          u.UsuarioNombre
        FROM venta v
        LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
        LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
        LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
        WHERE 
          CAST(v.VentaId AS CHAR) = ? 
          OR DATE_FORMAT(v.VentaFecha, '%Y-%m-%d %H:%i:%s') LIKE ?
          OR LOWER(CONCAT(COALESCE(c.ClienteNombre, ''), ' ', COALESCE(c.ClienteApellido, ''))) LIKE LOWER(?)
          OR LOWER(COALESCE(a.AlmacenNombre, '')) LIKE LOWER(?)
          OR v.VentaTipo = ?
          OR LOWER(
            CASE v.VentaTipo 
              WHEN 'CO' THEN 'contado'
              WHEN 'CR' THEN 'credito'
              WHEN 'PO' THEN 'pos'
              WHEN 'TR' THEN 'transfer'
            END
          ) LIKE LOWER(?)
          OR LOWER(v.VentaPagoTipo) LIKE LOWER(?)
          OR CAST(v.VentaCantidadProductos AS CHAR) = ?
          OR LOWER(COALESCE(u.UsuarioNombre, '')) LIKE LOWER(?)
          OR CAST(v.Total AS CHAR) = ?
          OR LOWER(COALESCE(v.VentaEntrega, '')) LIKE LOWER(?)
        ORDER BY v.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      // Para búsqueda exacta de números
      const exactValue = term;
      // Para búsqueda parcial de texto
      const likeValue = `%${term}%`;

      const values = [
        exactValue, // VentaId
        likeValue, // VentaFecha
        likeValue, // Cliente nombre completo
        likeValue, // AlmacenNombre
        tipoVentaSearch, // VentaTipo (código exacto)
        likeValue, // VentaTipo (nombre descriptivo)
        likeValue, // VentaPagoTipo
        exactValue, // VentaCantidadProductos
        likeValue, // UsuarioNombre
        exactValue, // Total
        likeValue, // VentaEntrega
        limit,
        offset,
      ];

      db.query(searchQuery, values, (err, results) => {
        if (err) {
          console.error("Error en la consulta de búsqueda:", err);
          return reject(err);
        }

        const countQuery = `
          SELECT COUNT(*) as total 
          FROM venta v
          LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
          LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
          LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
          WHERE 
            CAST(v.VentaId AS CHAR) = ? 
            OR DATE_FORMAT(v.VentaFecha, '%Y-%m-%d %H:%i:%s') LIKE ?
            OR LOWER(CONCAT(COALESCE(c.ClienteNombre, ''), ' ', COALESCE(c.ClienteApellido, ''))) LIKE LOWER(?)
            OR LOWER(COALESCE(a.AlmacenNombre, '')) LIKE LOWER(?)
            OR v.VentaTipo = ?
            OR LOWER(
              CASE v.VentaTipo 
                WHEN 'CO' THEN 'contado'
                WHEN 'CR' THEN 'credito'
                WHEN 'PO' THEN 'pos'
                WHEN 'TR' THEN 'transfer'
              END
            ) LIKE LOWER(?)
            OR LOWER(v.VentaPagoTipo) LIKE LOWER(?)
            OR CAST(v.VentaCantidadProductos AS CHAR) = ?
            OR LOWER(COALESCE(u.UsuarioNombre, '')) LIKE LOWER(?)
            OR CAST(v.Total AS CHAR) = ?
            OR LOWER(COALESCE(v.VentaEntrega, '')) LIKE LOWER(?)
        `;

        const countValues = [
          exactValue, // VentaId
          likeValue, // VentaFecha
          likeValue, // Cliente nombre completo
          likeValue, // AlmacenNombre
          tipoVentaSearch, // VentaTipo (código exacto)
          likeValue, // VentaTipo (nombre descriptivo)
          likeValue, // VentaPagoTipo
          exactValue, // VentaCantidadProductos
          likeValue, // UsuarioNombre
          exactValue, // Total
          likeValue, // VentaEntrega
        ];

        db.query(countQuery, countValues, (err, countResult) => {
          if (err) {
            console.error("Error en la consulta de conteo:", err);
            return reject(err);
          }
          resolve({
            ventas: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },

  // Obtener ventas pendientes por cliente
  getVentasPendientesPorCliente: (clienteId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          v.VentaId,
          v.VentaFecha,
          CAST(v.Total AS DECIMAL(10,2)) as Total,
          CAST(COALESCE(v.VentaEntrega, 0) AS DECIMAL(10,2)) as VentaEntrega,
          CAST((v.Total - COALESCE(v.VentaEntrega, 0)) AS DECIMAL(10,2)) as Saldo
        FROM venta v
        WHERE v.ClienteId = ? 
        AND v.VentaTipo = 'CR'
        HAVING Saldo > 0
        ORDER BY v.VentaFecha ASC
      `;

      db.query(query, [clienteId], (err, results) => {
        if (err) {
          console.error("Error en getVentasPendientesPorCliente:", err);
          return reject(err);
        }
        // Convertir explícitamente los valores a número
        const processedResults = results.map((row) => ({
          ...row,
          Total: Number(row.Total),
          VentaEntrega: Number(row.VentaEntrega),
          Saldo: Number(row.Saldo),
        }));
        resolve(processedResults);
      });
    });
  },
};

module.exports = Venta;
