const db = require("../config/db");

// Condición SQL para filtrar una columna de fecha por rango.
// rango: { desde, hasta } (YYYY-MM-DD, ya validados) o { dias } desde hoy
function condicionRangoFecha(columna, rango) {
  if (rango.desde && rango.hasta) {
    return {
      sql: `(DATE(${columna}) BETWEEN ? AND ?)`,
      params: [rango.desde, rango.hasta],
    };
  }
  return {
    sql: `(DATE(${columna}) >= CURDATE() AND DATE(${columna}) <= DATE_ADD(CURDATE(), INTERVAL ? DAY))`,
    params: [rango.dias],
  };
}

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
          c.ClienteNombre, c.ClienteApellido, c.ClienteRUC
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
        "AlquilerDescuento",
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
        "AlquilerDescuento",
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
        AlquilerEntrega,
        AlquilerDescuento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.ClienteId,
        data.AlquilerFechaAlquiler,
        data.AlquilerFechaEntrega || null,
        data.AlquilerFechaDevolucion || null,
        data.AlquilerEstado || "Pendiente",
        data.AlquilerTotal || 0,
        data.AlquilerEntrega || 0,
        data.AlquilerDescuento || 0,
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
        AlquilerEstado = COALESCE(?, AlquilerEstado),
        AlquilerTotal = COALESCE(?, AlquilerTotal),
        AlquilerEntrega = COALESCE(?, AlquilerEntrega),
        AlquilerDescuento = COALESCE(?, AlquilerDescuento)
        WHERE AlquilerId = ?`;

      // Estado y montos que no vienen se conservan: una pantalla con datos
      // viejos no pisa un pago o una edición hecha mientras tanto
      const values = [
        data.ClienteId,
        data.AlquilerFechaAlquiler,
        data.AlquilerFechaEntrega || null,
        data.AlquilerFechaDevolucion || null,
        data.AlquilerEstado ?? null,
        data.AlquilerTotal ?? null,
        data.AlquilerEntrega ?? null,
        data.AlquilerDescuento ?? null,
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

  updateEstado: (id, estado) => {
    return new Promise((resolve, reject) => {
      db.query(
        "UPDATE alquiler SET AlquilerEstado = ? WHERE AlquilerId = ?",
        [estado, id],
        (err, result) => {
          if (err) return reject(err);
          if (result.affectedRows === 0) return resolve(null);
          Alquiler.getById(id).then(resolve).catch(reject);
        }
      );
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
          CAST(COALESCE(a.AlquilerDescuento, 0) AS DECIMAL(10,2)) as AlquilerDescuento,
          CAST((a.AlquilerTotal - COALESCE(a.AlquilerEntrega, 0) - COALESCE(a.AlquilerDescuento, 0)) AS DECIMAL(10,2)) as Saldo
        FROM alquiler a
        WHERE a.ClienteId = ?
          -- Un alquiler cancelado no es deuda (mismo criterio que el cobro)
          AND a.AlquilerEstado <> 'Cancelado'
      `;

      const params = [clienteId];

      // Si se proporciona localId, filtrar por el local del usuario que realizó el alquiler
      // Nota: Necesitaríamos un JOIN con usuario si hay relación, por ahora solo filtramos por cliente
      // if (localId) {
      //   query += ` AND u.LocalId = ?`;
      //   params.push(localId);
      // }

      query += ` AND (a.AlquilerTotal - COALESCE(a.AlquilerEntrega, 0) - COALESCE(a.AlquilerDescuento, 0)) > 0 ORDER BY a.AlquilerFechaAlquiler ASC`;

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
          AlquilerDescuento: Number(row.AlquilerDescuento),
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
          SUM(COALESCE(a.AlquilerDescuento, 0)) AS TotalDescuento,
          SUM(a.AlquilerTotal - COALESCE(a.AlquilerEntrega, 0) - COALESCE(a.AlquilerDescuento, 0)) AS Saldo
        FROM alquiler a
        JOIN clientes c ON a.ClienteId = c.ClienteId
        -- Un alquiler cancelado no es deuda
        WHERE a.AlquilerEstado <> 'Cancelado'
        GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteApellido
        HAVING SUM(a.AlquilerTotal - COALESCE(a.AlquilerEntrega, 0) - COALESCE(a.AlquilerDescuento, 0)) > 0
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

  // Pagos de cada alquiler para los reportes: Map AlquilerId -> pagos.
  // - Registrados en alquilerpago (desde que existe): monto aplicado exacto.
  // - Anteriores: se deducen del texto del movimiento de caja, pero solo en
  //   movimientos de alquiler ("Alquiler #N - ..." o "Pago de alquileres #N,
  //   #M ..."), con el número completo (#12 no toma #120; antes también se
  //   colaban movimientos de ventas "Venta #12"). En un cobro compartido
  //   figura el monto completo en cada alquiler: el reparto no quedó guardado
  getPagosReporte: async (alquilerIds) => {
    const porAlquiler = new Map();
    if (!alquilerIds.length) return porAlquiler;
    const rows = await db.query(
      `SELECT
        ap.AlquilerId,
        ap.RegistroDiarioCajaId,
        ap.AlquilerPagoFecha AS RegistroDiarioCajaFecha,
        ap.AlquilerPagoMonto AS RegistroDiarioCajaMonto,
        COALESCE(
          r.RegistroDiarioCajaDetalle,
          CASE WHEN ap.AlquilerPagoTipo = 'AJUSTE'
            THEN 'Ajuste manual de la entrega'
            ELSE 'Pago sin movimiento de caja' END
        ) AS RegistroDiarioCajaDetalle
      FROM alquilerpago ap
      LEFT JOIN registrodiariocaja r ON r.RegistroDiarioCajaId = ap.RegistroDiarioCajaId
      WHERE ap.AlquilerId = ANY(?)
      UNION ALL
      SELECT
        ids.id,
        r.RegistroDiarioCajaId,
        r.RegistroDiarioCajaFecha,
        r.RegistroDiarioCajaMonto,
        r.RegistroDiarioCajaDetalle
      FROM unnest(?::int[]) AS ids(id)
      JOIN registrodiariocaja r
        ON (r.RegistroDiarioCajaDetalle LIKE 'Alquiler #%'
          OR r.RegistroDiarioCajaDetalle LIKE 'Pago de alquileres %')
        AND r.RegistroDiarioCajaDetalle ~ ('#' || ids.id || '([^0-9]|$)')
      WHERE NOT EXISTS (
        SELECT 1 FROM alquilerpago ap2
        WHERE ap2.RegistroDiarioCajaId = r.RegistroDiarioCajaId
      )
      ORDER BY 3, 2`,
      [alquilerIds, alquilerIds]
    );
    for (const row of rows) {
      const pagos = porAlquiler.get(row.AlquilerId) || [];
      pagos.push({
        RegistroDiarioCajaId: row.RegistroDiarioCajaId,
        RegistroDiarioCajaFecha: row.RegistroDiarioCajaFecha,
        RegistroDiarioCajaMonto: Number(row.RegistroDiarioCajaMonto),
        RegistroDiarioCajaDetalle: row.RegistroDiarioCajaDetalle,
      });
      porAlquiler.set(row.AlquilerId, pagos);
    }
    return porAlquiler;
  },

  // Obtener reporte de todos los alquileres en rango de fechas (sin filtrar por cliente)
  getReporteAlquileresTodos: (fechaDesde, fechaHasta) => {
    return new Promise((resolve, reject) => {
      const alquileresQuery = `
        SELECT 
          a.*,
          c.ClienteNombre,
          c.ClienteApellido,
          c.ClienteRUC
        FROM alquiler a
        LEFT JOIN clientes c ON a.ClienteId = c.ClienteId
        WHERE DATE(a.AlquilerFechaAlquiler) BETWEEN ? AND ?
        ORDER BY a.AlquilerFechaAlquiler ASC, a.AlquilerId ASC
      `;

      db.query(
        alquileresQuery,
        [fechaDesde, fechaHasta],
        async (err, alquileresResults) => {
          if (err) return reject(err);

          try {
            const pagosPorAlquiler = await Alquiler.getPagosReporte(
              alquileresResults.map((a) => a.AlquilerId)
            );
            const alquileresConDetalle = alquileresResults.map((alquiler) => {
              const total = Number(alquiler.AlquilerTotal) || 0;
              const entrega = Number(alquiler.AlquilerEntrega) || 0;
              const descuento = Number(alquiler.AlquilerDescuento) || 0;
              return {
                ...alquiler,
                AlquilerTotal: total,
                AlquilerEntrega: entrega,
                AlquilerDescuento: descuento,
                SaldoPendiente: total - entrega - descuento,
                Pagos: pagosPorAlquiler.get(alquiler.AlquilerId) || [],
              };
            });
            resolve({
              cliente: null,
              fechaDesde,
              fechaHasta,
              alquileres: alquileresConDetalle,
            });
          } catch (error) {
            reject(error);
          }
        }
      );
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

            try {
              const pagosPorAlquiler = await Alquiler.getPagosReporte(
                alquileresResults.map((a) => a.AlquilerId)
              );
              const alquileresConDetalle = alquileresResults.map((alquiler) => {
                const total = Number(alquiler.AlquilerTotal) || 0;
                const entrega = Number(alquiler.AlquilerEntrega) || 0;
                const descuento = Number(alquiler.AlquilerDescuento) || 0;
                return {
                  ...alquiler,
                  AlquilerTotal: total,
                  AlquilerEntrega: entrega,
                  AlquilerDescuento: descuento,
                  SaldoPendiente: total - entrega - descuento,
                  Pagos: pagosPorAlquiler.get(alquiler.AlquilerId) || [],
                };
              });
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
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    });
  },

  // Obtener alquileres próximos a fecha de entrega (hoy y próximos días)
  // Solo incluye alquileres en estado Pendiente
  getAlquileresProximosEntrega: (rango = { dias: 7 }) => {
    const filtro = condicionRangoFecha("a.AlquilerFechaEntrega", rango);
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
        AND ${filtro.sql}
        ORDER BY a.AlquilerFechaEntrega ASC
      `;

      db.query(query, filtro.params, (err, results) => {
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
  getAlquileresProximosDevolucion: (rango = { dias: 7 }) => {
    const filtro = condicionRangoFecha("a.AlquilerFechaDevolucion", rango);
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
          ${filtro.sql}
          OR (DATE(a.AlquilerFechaDevolucion) < CURDATE() 
          AND (a.AlquilerEstado = 'Pendiente' OR a.AlquilerEstado = 'Entregado'))
        )
        AND a.AlquilerEstado != 'Devuelto'
        AND a.AlquilerEstado != 'Cancelado'
        ORDER BY a.AlquilerFechaDevolucion ASC
      `;

      db.query(query, filtro.params, (err, results) => {
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
