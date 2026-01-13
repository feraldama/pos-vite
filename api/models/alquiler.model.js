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

  // Obtener deudas pendientes agrupadas por cliente
  getDeudasPendientesPorCliente: () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          c.ClienteId,
          CONCAT(TRIM(c.ClienteNombre), ' ', TRIM(c.ClienteApellido)) AS Cliente,
          SUM(a.AlquilerTotal) AS TotalVentas,
          SUM(COALESCE(a.AlquilerEntrega, 0)) AS TotalEntregado,
          SUM(a.AlquilerTotal - COALESCE(a.AlquilerEntrega, 0)) AS Saldo
        FROM alquiler a
        JOIN clientes c ON a.ClienteId = c.ClienteId
        GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteApellido
        HAVING Saldo > 0
        ORDER BY Cliente
      `;
      db.query(query, (err, results) => {
        if (err) {
          console.error("Error en getDeudasPendientesPorCliente:", err);
          return reject(err);
        }
        resolve(results);
      });
    });
  },

  // Obtener reporte de alquileres por cliente y rango de fechas
  getReporteAlquileresPorCliente: (clienteId, fechaDesde, fechaHasta) => {
    return new Promise((resolve, reject) => {
      // Primero obtener información del cliente
      const clienteQuery = "SELECT * FROM clientes WHERE ClienteId = ?";

      db.query(clienteQuery, [clienteId], (err, clienteResults) => {
        if (err) return reject(err);

        if (clienteResults.length === 0) {
          return reject(new Error("Cliente no encontrado"));
        }

        const cliente = clienteResults[0];

        // Obtener alquileres en el rango de fechas
        const alquileresQuery = `
          SELECT 
            a.*,
            c.ClienteNombre,
            c.ClienteApellido,
            c.ClienteRUC
          FROM alquiler a
          LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
          WHERE a.ClienteId = ? 
          AND DATE(a.AlquilerFechaAlquiler) BETWEEN ? AND ?
          ORDER BY a.AlquilerFechaAlquiler ASC, a.AlquilerId ASC
        `;

        db.query(
          alquileresQuery,
          [clienteId, fechaDesde, fechaHasta],
          async (err, alquileresResults) => {
            if (err) return reject(err);

            // Para cada alquiler, calcular saldo pendiente y obtener pagos desde RegistroDiarioCaja
            const alquileresConDetalle = await Promise.all(
              alquileresResults.map(async (alquiler) => {
                const total = Number(alquiler.AlquilerTotal) || 0;
                const entrega = Number(alquiler.AlquilerEntrega) || 0;
                const saldoPendiente = total - entrega;

                // Obtener pagos desde RegistroDiarioCaja que mencionen este alquiler
                // Busca tanto "Alquiler #X" como "Pago de alquileres #X" o "Pago de alquileres #X, #Y"
                // No filtramos por fecha para mostrar todos los pagos del alquiler
                const pagosQuery = `
                  SELECT 
                    r.RegistroDiarioCajaId,
                    r.RegistroDiarioCajaFecha,
                    r.RegistroDiarioCajaMonto,
                    r.RegistroDiarioCajaDetalle
                  FROM registrodiariocaja r
                  WHERE (
                    r.RegistroDiarioCajaDetalle LIKE ?
                    OR r.RegistroDiarioCajaDetalle LIKE ?
                  )
                  ORDER BY r.RegistroDiarioCajaFecha ASC, r.RegistroDiarioCajaId ASC
                `;

                const pagos = await new Promise((resolvePagos, rejectPagos) => {
                  db.query(
                    pagosQuery,
                    [
                      `%Alquiler #${alquiler.AlquilerId}%`,
                      `%#${alquiler.AlquilerId}%`,
                    ],
                    (err, pagosResults) => {
                      if (err) return rejectPagos(err);
                      resolvePagos(
                        pagosResults.map((pago) => ({
                          RegistroDiarioCajaId: pago.RegistroDiarioCajaId,
                          RegistroDiarioCajaFecha: pago.RegistroDiarioCajaFecha,
                          RegistroDiarioCajaMonto: Number(
                            pago.RegistroDiarioCajaMonto
                          ),
                          RegistroDiarioCajaDetalle:
                            pago.RegistroDiarioCajaDetalle,
                        }))
                      );
                    }
                  );
                });

                return {
                  ...alquiler,
                  AlquilerId: alquiler.AlquilerId,
                  AlquilerFechaAlquiler: alquiler.AlquilerFechaAlquiler,
                  AlquilerTotal: total,
                  AlquilerEntrega: entrega,
                  SaldoPendiente: saldoPendiente,
                  Pagos: pagos || [],
                };
              })
            );

            resolve({
              cliente: {
                ClienteId: cliente.ClienteId,
                ClienteNombre: cliente.ClienteNombre,
                ClienteApellido: cliente.ClienteApellido,
                ClienteRUC: cliente.ClienteRUC,
              },
              fechaDesde,
              fechaHasta,
              alquileres: alquileresConDetalle,
            });
          }
        );
      });
    });
  },

  // Obtener alquileres próximos a fecha de entrega (hoy y próximos días)
  // Solo incluye alquileres en estado Pendiente
  getAlquileresProximosEntrega: (dias = 7) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          a.*,
          c.ClienteNombre,
          c.ClienteApellido,
          c.ClienteTelefono
        FROM alquiler a
        LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
        WHERE a.AlquilerFechaEntrega IS NOT NULL
        AND a.AlquilerEstado = 'Pendiente'
        AND (
          DATE(a.AlquilerFechaEntrega) >= CURDATE()
          AND DATE(a.AlquilerFechaEntrega) <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        )
        ORDER BY a.AlquilerFechaEntrega ASC
      `;

      db.query(query, [dias], (err, results) => {
        if (err) {
          console.error("Error en getAlquileresProximosEntrega:", err);
          return reject(err);
        }
        resolve(results);
      });
    });
  },

  // Obtener alquileres próximos a fecha de devolución (hoy y próximos días)
  // También incluye alquileres con fecha pasada que siguen en estado Pendiente o Entregado
  getAlquileresProximosDevolucion: (dias = 7) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          a.*,
          c.ClienteNombre,
          c.ClienteApellido,
          c.ClienteTelefono
        FROM alquiler a
        LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
        WHERE a.AlquilerFechaDevolucion IS NOT NULL
        AND (
          (DATE(a.AlquilerFechaDevolucion) >= CURDATE()
          AND DATE(a.AlquilerFechaDevolucion) <= DATE_ADD(CURDATE(), INTERVAL ? DAY))
          OR (DATE(a.AlquilerFechaDevolucion) < CURDATE() 
          AND (a.AlquilerEstado = 'Pendiente' OR a.AlquilerEstado = 'Entregado'))
        )
        AND a.AlquilerEstado != 'Devuelto'
        AND a.AlquilerEstado != 'Cancelado'
        ORDER BY a.AlquilerFechaDevolucion ASC
      `;

      db.query(query, [dias], (err, results) => {
        if (err) {
          console.error("Error en getAlquileresProximosDevolucion:", err);
          return reject(err);
        }
        resolve(results);
      });
    });
  },
};

module.exports = Alquiler;
