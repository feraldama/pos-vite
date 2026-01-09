const db = require("../config/db");

const Suscripcion = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, 
          c.ClienteNombre, c.ClienteApellido,
          p.PlanNombre, p.PlanPrecio,
          CASE 
            WHEN EXISTS (SELECT 1 FROM pago WHERE pago.SuscripcionId = s.SuscripcionId) 
            THEN 'PAGADA' 
            ELSE 'PENDIENTE' 
          END as EstadoPago
        FROM suscripcion s
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        LEFT JOIN plan p ON s.PlanId = p.PlanId
      `;
      db.query(query, (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, 
          c.ClienteNombre, c.ClienteApellido,
          p.PlanNombre, p.PlanPrecio
        FROM suscripcion s
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        LEFT JOIN plan p ON s.PlanId = p.PlanId
        WHERE s.SuscripcionId = ?
      `;
      db.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : null);
      });
    });
  },

  create: (suscripcionData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO suscripcion (ClienteId, PlanId, SuscripcionFechaInicio, SuscripcionFechaFin) VALUES (?, ?, ?, ?)`;
      const values = [
        suscripcionData.ClienteId,
        suscripcionData.PlanId,
        suscripcionData.SuscripcionFechaInicio,
        suscripcionData.SuscripcionFechaFin,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        // Obtener la suscripción recién creada
        Suscripcion.getById(result.insertId)
          .then((suscripcion) => resolve(suscripcion))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, suscripcionData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE suscripcion SET ClienteId = ?, PlanId = ?, SuscripcionFechaInicio = ?, SuscripcionFechaFin = ? WHERE SuscripcionId = ?`;
      const values = [
        suscripcionData.ClienteId,
        suscripcionData.PlanId,
        suscripcionData.SuscripcionFechaInicio,
        suscripcionData.SuscripcionFechaFin,
        id,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Suscripcion.getById(id)
          .then((suscripcion) => resolve(suscripcion))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM suscripcion WHERE SuscripcionId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "SuscripcionId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "SuscripcionId",
        "ClienteId",
        "PlanId",
        "SuscripcionFechaInicio",
        "SuscripcionFechaFin",
        "ClienteNombre",
        "PlanNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "SuscripcionId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      // Para ordenar por campos de tablas relacionadas, necesitamos usar alias
      let orderByField = sortField;
      if (sortField === "ClienteNombre") {
        orderByField = "c.ClienteNombre";
      } else if (sortField === "PlanNombre") {
        orderByField = "p.PlanNombre";
      } else {
        orderByField = `s.${sortField}`;
      }

      const query = `
        SELECT s.*, 
          c.ClienteNombre, c.ClienteApellido,
          p.PlanNombre, p.PlanPrecio,
          CASE 
            WHEN EXISTS (SELECT 1 FROM pago WHERE pago.SuscripcionId = s.SuscripcionId) 
            THEN 'PAGADA' 
            ELSE 'PENDIENTE' 
          END as EstadoPago
        FROM suscripcion s
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        LEFT JOIN plan p ON s.PlanId = p.PlanId
        ORDER BY ${orderByField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM suscripcion",
          (err, countResult) => {
            if (err) return reject(err);

            resolve({
              suscripciones: results,
              total: countResult[0].total,
            });
          }
        );
      });
    });
  },

  searchSuscripciones: (
    term,
    limit,
    offset,
    sortBy = "SuscripcionId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "SuscripcionId",
        "ClienteId",
        "PlanId",
        "SuscripcionFechaInicio",
        "SuscripcionFechaFin",
        "ClienteNombre",
        "PlanNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "SuscripcionId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      let orderByField = sortField;
      if (sortField === "ClienteNombre") {
        orderByField = "c.ClienteNombre";
      } else if (sortField === "PlanNombre") {
        orderByField = "p.PlanNombre";
      } else {
        orderByField = `s.${sortField}`;
      }

      const searchQuery = `
        SELECT s.*, 
          c.ClienteNombre, c.ClienteApellido,
          p.PlanNombre, p.PlanPrecio,
          CASE 
            WHEN EXISTS (SELECT 1 FROM pago WHERE pago.SuscripcionId = s.SuscripcionId) 
            THEN 'PAGADA' 
            ELSE 'PENDIENTE' 
          END as EstadoPago
        FROM suscripcion s
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        LEFT JOIN plan p ON s.PlanId = p.PlanId
        WHERE c.ClienteNombre LIKE ?
        OR c.ClienteApellido LIKE ?
        OR p.PlanNombre LIKE ?
        OR CAST(s.SuscripcionId AS CHAR) LIKE ?
        ORDER BY ${orderByField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total 
            FROM suscripcion s
            LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
            LEFT JOIN plan p ON s.PlanId = p.PlanId
            WHERE c.ClienteNombre LIKE ?
            OR c.ClienteApellido LIKE ?
            OR p.PlanNombre LIKE ?
            OR CAST(s.SuscripcionId AS CHAR) LIKE ?
          `;
          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                suscripciones: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  getProximasAVencer: (dias = 30, limit = 10) => {
    return new Promise((resolve, reject) => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + dias);
      fechaLimite.setHours(23, 59, 59, 999);

      // Formatear fechas para MySQL (YYYY-MM-DD)
      const hoyFormateado = hoy.toISOString().split("T")[0];
      const fechaLimiteFormateada = fechaLimite.toISOString().split("T")[0];

      const query = `
        SELECT s.*, 
          c.ClienteNombre, c.ClienteApellido,
          p.PlanNombre, p.PlanPrecio
        FROM suscripcion s
        LEFT JOIN clientes c ON s.ClienteId = c.ClienteId
        LEFT JOIN plan p ON s.PlanId = p.PlanId
        WHERE s.SuscripcionFechaFin IS NOT NULL
          AND DATE(s.SuscripcionFechaFin) >= DATE(?)
          AND DATE(s.SuscripcionFechaFin) <= DATE(?)
        ORDER BY s.SuscripcionFechaFin ASC
        LIMIT ?
      `;

      db.query(
        query,
        [hoyFormateado, fechaLimiteFormateada, limit],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },
};

module.exports = Suscripcion;
