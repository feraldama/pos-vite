const db = require("../config/db");

const PagoTrans = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM pagotrans", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM pagotrans WHERE PagoTransId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results && results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "PagoTransId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza sortOrder y sortBy para evitar SQL Injection
      const allowedSortFields = [
        "PagoTransId",
        "PagoTransFecha",
        "TransporteId",
        "PagoTransOrigen",
        "PagoTransDestino",
        "PagoTransFechaEmbarque",
        "PagoTransHora",
        "PagoTransAsiento",
        "PagoTransMonto",
        "CajaId",
        "PagoTransNumeroBoleto",
        "PagoTransNombreApellido",
        "PagoTransCI",
        "PagoTransTelefono",
        "ClienteId",
        "PagoTransUsuarioId",
        "PagoTransClienteRUC",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PagoTransFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT p.*, 
          t.TransporteNombre, 
          c.CajaDescripcion,
          cl.ClienteNombre,
          cl.ClienteApellido
        FROM pagotrans p
        LEFT JOIN transporte t ON p.TransporteId = t.TransporteId
        LEFT JOIN Caja c ON p.CajaId = c.CajaId
        LEFT JOIN clientes cl ON p.ClienteId = cl.ClienteId
        ORDER BY p.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM pagotrans",
          (err, countResult) => {
            if (err) return reject(err);

            resolve({
              data: results,
              pagination: {
                totalItems: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit),
                currentPage: Math.floor(offset / limit) + 1,
                itemsPerPage: limit,
              },
            });
          }
        );
      });
    });
  },

  search: async (
    term,
    limit,
    offset,
    sortBy = "PagoTransFecha",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza los campos para evitar SQL Injection
      const allowedSortFields = [
        "PagoTransId",
        "PagoTransFecha",
        "TransporteId",
        "PagoTransOrigen",
        "PagoTransDestino",
        "PagoTransFechaEmbarque",
        "PagoTransHora",
        "PagoTransAsiento",
        "PagoTransMonto",
        "CajaId",
        "PagoTransNumeroBoleto",
        "PagoTransNombreApellido",
        "PagoTransCI",
        "PagoTransTelefono",
        "ClienteId",
        "PagoTransUsuarioId",
        "PagoTransClienteRUC",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PagoTransFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT p.*, 
          t.TransporteNombre, 
          c.CajaDescripcion,
          cl.ClienteNombre,
          cl.ClienteApellido
        FROM pagotrans p
        LEFT JOIN transporte t ON p.TransporteId = t.TransporteId
        LEFT JOIN Caja c ON p.CajaId = c.CajaId
        LEFT JOIN clientes cl ON p.ClienteId = cl.ClienteId
        WHERE p.PagoTransOrigen LIKE ? 
          OR p.PagoTransDestino LIKE ?
          OR p.PagoTransNumeroBoleto LIKE ?
          OR p.PagoTransNombreApellido LIKE ?
          OR p.PagoTransCI LIKE ?
          OR p.PagoTransTelefono LIKE ?
          OR p.PagoTransClienteRUC LIKE ?
          OR CAST(p.TransporteId AS CHAR) LIKE ?
          OR CAST(p.CajaId AS CHAR) LIKE ?
          OR CAST(p.ClienteId AS CHAR) LIKE ?
          OR CAST(p.PagoTransMonto AS CHAR) LIKE ?
          OR DATE_FORMAT(p.PagoTransFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
          OR DATE_FORMAT(p.PagoTransFechaEmbarque, '%d/%m/%Y') LIKE ?
        ORDER BY p.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue, // Origen
          searchValue, // Destino
          searchValue, // NumeroBoleto
          searchValue, // NombreApellido
          searchValue, // CI
          searchValue, // Telefono
          searchValue, // ClienteRUC
          searchValue, // TransporteId
          searchValue, // CajaId
          searchValue, // ClienteId
          searchValue, // Monto
          searchValue, // Fecha
          searchValue, // FechaEmbarque
          limit,
          offset,
        ],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM pagotrans 
            WHERE PagoTransOrigen LIKE ? 
              OR PagoTransDestino LIKE ?
              OR PagoTransNumeroBoleto LIKE ?
              OR PagoTransNombreApellido LIKE ?
              OR PagoTransCI LIKE ?
              OR PagoTransTelefono LIKE ?
              OR PagoTransClienteRUC LIKE ?
              OR CAST(TransporteId AS CHAR) LIKE ?
              OR CAST(CajaId AS CHAR) LIKE ?
              OR CAST(ClienteId AS CHAR) LIKE ?
              OR CAST(PagoTransMonto AS CHAR) LIKE ?
              OR DATE_FORMAT(PagoTransFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
              OR DATE_FORMAT(PagoTransFechaEmbarque, '%d/%m/%Y') LIKE ?
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
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
            ],
            (err, countResult) => {
              if (err) {
                console.error("Error en la consulta de conteo:", err);
                return reject(err);
              }

              const total = countResult[0]?.total || 0;

              resolve({
                data: results,
                pagination: {
                  totalItems: total,
                  totalPages: Math.ceil(total / limit),
                  currentPage: Math.floor(offset / limit) + 1,
                  itemsPerPage: limit,
                },
              });
            }
          );
        }
      );
    });
  },

  create: (pagoTransData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO pagotrans (
          PagoTransFecha,
          TransporteId,
          PagoTransOrigen,
          PagoTransDestino,
          PagoTransFechaEmbarque,
          PagoTransHora,
          PagoTransAsiento,
          PagoTransMonto,
          CajaId,
          PagoTransNumeroBoleto,
          PagoTransNombreApellido,
          PagoTransCI,
          PagoTransTelefono,
          ClienteId,
          PagoTransUsuarioId,
          PagoTransClienteRUC
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        pagoTransData.PagoTransFecha || new Date(),
        pagoTransData.TransporteId || null,
        pagoTransData.PagoTransOrigen || "",
        pagoTransData.PagoTransDestino || "",
        pagoTransData.PagoTransFechaEmbarque || null,
        pagoTransData.PagoTransHora || "",
        pagoTransData.PagoTransAsiento || "",
        pagoTransData.PagoTransMonto || 0,
        pagoTransData.CajaId || null,
        pagoTransData.PagoTransNumeroBoleto || "",
        pagoTransData.PagoTransNombreApellido || "",
        pagoTransData.PagoTransCI || "",
        pagoTransData.PagoTransTelefono || "",
        pagoTransData.ClienteId || null,
        pagoTransData.PagoTransUsuarioId || null,
        pagoTransData.PagoTransClienteRUC || "",
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        PagoTrans.getById(result.insertId)
          .then((pagoTrans) => resolve(pagoTrans))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, pagoTransData) => {
    return new Promise((resolve, reject) => {
      // Construir la consulta dinámicamente
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "PagoTransFecha",
        "TransporteId",
        "PagoTransOrigen",
        "PagoTransDestino",
        "PagoTransFechaEmbarque",
        "PagoTransHora",
        "PagoTransAsiento",
        "PagoTransMonto",
        "CajaId",
        "PagoTransNumeroBoleto",
        "PagoTransNombreApellido",
        "PagoTransCI",
        "PagoTransTelefono",
        "ClienteId",
        "PagoTransUsuarioId",
        "PagoTransClienteRUC",
      ];

      camposActualizables.forEach((campo) => {
        if (pagoTransData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(pagoTransData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null); // No hay campos para actualizar
      }

      values.push(id);

      const query = `
        UPDATE pagotrans 
        SET ${updateFields.join(", ")}
        WHERE PagoTransId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null); // No se encontró el registro
        }

        // Obtener el registro actualizado
        PagoTrans.getById(id)
          .then((pagoTrans) => resolve(pagoTrans))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM pagotrans WHERE PagoTransId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = PagoTrans;
