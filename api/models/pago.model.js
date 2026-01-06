const db = require("../config/db");

const Pago = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM pago", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT p.*, 
          c.ClienteNombre, c.ClienteApellido
        FROM pago p
        LEFT JOIN suscripcion s ON p.SuscripcionId = s.SuscripcionId
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        WHERE p.PagoId = ?
      `;
      db.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : null);
      });
    });
  },

  create: (pagoData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO pago (SuscripcionId, PagoMonto, PagoTipo, PagoFecha, PagoUsuarioId) VALUES (?, ?, ?, ?, ?)`;
      const values = [
        pagoData.SuscripcionId,
        pagoData.PagoMonto,
        pagoData.PagoTipo,
        pagoData.PagoFecha,
        pagoData.PagoUsuarioId,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        // Obtener el pago recién creado
        Pago.getById(result.insertId)
          .then((pago) => resolve(pago))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, pagoData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE pago SET SuscripcionId = ?, PagoMonto = ?, PagoTipo = ?, PagoFecha = ?, PagoUsuarioId = ? WHERE PagoId = ?`;
      const values = [
        pagoData.SuscripcionId,
        pagoData.PagoMonto,
        pagoData.PagoTipo,
        pagoData.PagoFecha,
        pagoData.PagoUsuarioId,
        id,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Pago.getById(id)
          .then((pago) => resolve(pago))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM pago WHERE PagoId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "PagoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "PagoId",
        "SuscripcionId",
        "PagoMonto",
        "PagoTipo",
        "PagoFecha",
        "PagoUsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "PagoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const query = `
        SELECT p.*, 
          c.ClienteNombre, c.ClienteApellido
        FROM pago p
        LEFT JOIN suscripcion s ON p.SuscripcionId = s.SuscripcionId
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query("SELECT COUNT(*) as total FROM pago", (err, countResult) => {
          if (err) return reject(err);

          resolve({
            pagos: results,
            total: countResult[0].total,
          });
        });
      });
    });
  },

  searchPagos: (term, limit, offset, sortBy = "PagoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "PagoId",
        "SuscripcionId",
        "PagoMonto",
        "PagoTipo",
        "PagoFecha",
        "PagoUsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "PagoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT p.*, 
          c.ClienteNombre, c.ClienteApellido
        FROM pago p
        LEFT JOIN suscripcion s ON p.SuscripcionId = s.SuscripcionId
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        WHERE c.ClienteNombre LIKE ?
        OR c.ClienteApellido LIKE ?
        OR p.PagoTipo LIKE ?
        OR CAST(p.PagoMonto AS CHAR) LIKE ?
        OR CAST(p.PagoId AS CHAR) LIKE ?
        OR CAST(p.SuscripcionId AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          limit,
          offset,
        ],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total 
            FROM pago p
            LEFT JOIN suscripcion s ON p.SuscripcionId = s.SuscripcionId
            LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
            WHERE c.ClienteNombre LIKE ?
            OR c.ClienteApellido LIKE ?
            OR p.PagoTipo LIKE ?
            OR CAST(p.PagoMonto AS CHAR) LIKE ?
            OR CAST(p.PagoId AS CHAR) LIKE ?
            OR CAST(p.SuscripcionId AS CHAR) LIKE ?
          `;
          db.query(
            countQuery,
            [
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
            ],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                pagos: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = Pago;
