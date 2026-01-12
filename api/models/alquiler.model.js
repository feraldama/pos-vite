const db = require("../config/db");

const Alquiler = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM alquiler", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT a.*, 
          c.ClienteNombre, c.ClienteApellido
        FROM alquiler a
        LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
        WHERE a.AlquilerId = ?`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "AlquilerId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "AlquilerId",
        "ClienteId",
        "AlquilerFechaAlquiler",
        "AlquilerFechaEntrega",
        "AlquilerFechaDevolucion",
        "AlquilerEstado",
        "AlquilerTotal",
        "AlquilerEntrega",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "AlquilerId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const query = `
        SELECT a.*, 
          c.ClienteNombre, c.ClienteApellido
        FROM alquiler a
        LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
        ORDER BY a.${sortField} ${order} 
        LIMIT ? OFFSET ?`;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM alquiler",
          (err, countResult) => {
            if (err) return reject(err);

            resolve({
              alquileres: results,
              total: countResult[0].total,
            });
          }
        );
      });
    });
  },

  search: (term, limit, offset, sortBy = "AlquilerId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "AlquilerId",
        "ClienteId",
        "AlquilerFechaAlquiler",
        "AlquilerFechaEntrega",
        "AlquilerFechaDevolucion",
        "AlquilerEstado",
        "AlquilerTotal",
        "AlquilerEntrega",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "AlquilerId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT a.*, 
          c.ClienteNombre, c.ClienteApellido
        FROM alquiler a
        LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
        WHERE 
          CAST(a.AlquilerId AS CHAR) = ? 
          OR DATE_FORMAT(a.AlquilerFechaAlquiler, '%Y-%m-%d %H:%i:%s') LIKE ?
          OR DATE_FORMAT(a.AlquilerFechaEntrega, '%Y-%m-%d %H:%i:%s') LIKE ?
          OR DATE_FORMAT(a.AlquilerFechaDevolucion, '%Y-%m-%d %H:%i:%s') LIKE ?
          OR LOWER(CONCAT(COALESCE(c.ClienteNombre, ''), ' ', COALESCE(c.ClienteApellido, ''))) LIKE LOWER(?)
          OR LOWER(a.AlquilerEstado) LIKE LOWER(?)
          OR CAST(a.AlquilerTotal AS CHAR) = ?
          OR CAST(a.AlquilerEntrega AS CHAR) = ?
        ORDER BY a.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const exactValue = term;
      const likeValue = `%${term}%`;

      const values = [
        exactValue, // AlquilerId
        likeValue, // AlquilerFechaAlquiler
        likeValue, // AlquilerFechaEntrega
        likeValue, // AlquilerFechaDevolucion
        likeValue, // Cliente nombre completo
        likeValue, // AlquilerEstado
        exactValue, // AlquilerTotal
        exactValue, // AlquilerEntrega
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
          FROM alquiler a
          LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
          WHERE 
            CAST(a.AlquilerId AS CHAR) = ? 
            OR DATE_FORMAT(a.AlquilerFechaAlquiler, '%Y-%m-%d %H:%i:%s') LIKE ?
            OR DATE_FORMAT(a.AlquilerFechaEntrega, '%Y-%m-%d %H:%i:%s') LIKE ?
            OR DATE_FORMAT(a.AlquilerFechaDevolucion, '%Y-%m-%d %H:%i:%s') LIKE ?
            OR LOWER(CONCAT(COALESCE(c.ClienteNombre, ''), ' ', COALESCE(c.ClienteApellido, ''))) LIKE LOWER(?)
            OR LOWER(a.AlquilerEstado) LIKE LOWER(?)
            OR CAST(a.AlquilerTotal AS CHAR) = ?
            OR CAST(a.AlquilerEntrega AS CHAR) = ?
        `;

        const countValues = [
          exactValue,
          likeValue,
          likeValue,
          likeValue,
          likeValue,
          likeValue,
          exactValue,
          exactValue,
        ];

        db.query(countQuery, countValues, (err, countResult) => {
          if (err) {
            console.error("Error en la consulta de conteo:", err);
            return reject(err);
          }
          resolve({
            alquileres: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO alquiler (
        ClienteId,
        AlquilerFechaAlquiler,
        AlquilerFechaEntrega,
        AlquilerFechaDevolucion,
        AlquilerEstado,
        AlquilerTotal,
        AlquilerEntrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.ClienteId,
        data.AlquilerFechaAlquiler,
        data.AlquilerFechaEntrega || null,
        data.AlquilerFechaDevolucion || null,
        data.AlquilerEstado || "Pendiente",
        data.AlquilerTotal || 0,
        data.AlquilerEntrega || 0,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        Alquiler.getById(result.insertId)
          .then((alquiler) => resolve(alquiler))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE alquiler SET 
        ClienteId = ?,
        AlquilerFechaAlquiler = ?,
        AlquilerFechaEntrega = ?,
        AlquilerFechaDevolucion = ?,
        AlquilerEstado = ?,
        AlquilerTotal = ?,
        AlquilerEntrega = ?
        WHERE AlquilerId = ?`;

      const values = [
        data.ClienteId,
        data.AlquilerFechaAlquiler,
        data.AlquilerFechaEntrega || null,
        data.AlquilerFechaDevolucion || null,
        data.AlquilerEstado,
        data.AlquilerTotal,
        data.AlquilerEntrega || 0,
        id,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Alquiler.getById(id)
          .then((alquiler) => resolve(alquiler))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      // Primero eliminar registros asociados en alquilerprendas
      const deleteQueries = [
        "DELETE FROM alquilerprendas WHERE AlquilerId = ?",
        "DELETE FROM alquiler WHERE AlquilerId = ?",
      ];

      const executeQueries = async () => {
        try {
          for (const query of deleteQueries) {
            await new Promise((resolveQuery, rejectQuery) => {
              db.query(query, [id], (err, result) => {
                if (err) return rejectQuery(err);
                resolveQuery(result);
              });
            });
          }
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      executeQueries();
    });
  },

  // Obtener alquileres pendientes por cliente
  getAlquileresPendientesPorCliente: (clienteId, localId) => {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          a.AlquilerId,
          a.ClienteId,
          a.AlquilerFechaAlquiler,
          a.AlquilerFechaEntrega,
          a.AlquilerFechaDevolucion,
          a.AlquilerEstado,
          CAST(a.AlquilerTotal AS DECIMAL(10,2)) as AlquilerTotal,
          CAST(COALESCE(a.AlquilerEntrega, 0) AS DECIMAL(10,2)) as AlquilerEntrega,
          CAST((a.AlquilerTotal - COALESCE(a.AlquilerEntrega, 0)) AS DECIMAL(10,2)) as Saldo
        FROM alquiler a
        WHERE a.ClienteId = ?
      `;

      const params = [clienteId];

      // Si se proporciona localId, filtrar por el local del usuario que realizó el alquiler
      // Nota: Necesitaríamos un JOIN con usuario si hay relación, por ahora solo filtramos por cliente
      // if (localId) {
      //   query += ` AND u.LocalId = ?`;
      //   params.push(localId);
      // }

      query += ` HAVING Saldo > 0 ORDER BY a.AlquilerFechaAlquiler ASC`;

      db.query(query, params, (err, results) => {
        if (err) {
          console.error("Error en getAlquileresPendientesPorCliente:", err);
          return reject(err);
        }
        // Convertir explícitamente los valores a número
        const processedResults = results.map((row) => ({
          ...row,
          AlquilerTotal: Number(row.AlquilerTotal),
          AlquilerEntrega: Number(row.AlquilerEntrega),
          Saldo: Number(row.Saldo),
        }));
        resolve(processedResults);
      });
    });
  },
};

module.exports = Alquiler;
