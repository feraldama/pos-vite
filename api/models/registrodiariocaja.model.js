const db = require("../config/db");

const RegistroDiarioCaja = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM registrodiariocaja", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM registrodiariocaja WHERE RegistroDiarioCajaId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM registrodiariocaja ORDER BY RegistroDiarioCajaFecha DESC LIMIT ? OFFSET ?",
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM registrodiariocaja",
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
        }
      );
    });
  },

  search: (term, limit, offset) => {
    return new Promise((resolve, reject) => {
      const searchQuery = `
        SELECT * FROM registrodiariocaja 
        WHERE RegistroDiarioCajaDetalle LIKE ? 
        OR UsuarioId LIKE ?
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM registrodiariocaja 
            WHERE RegistroDiarioCajaDetalle LIKE ? 
            OR UsuarioId LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                data: results,
                pagination: {
                  totalItems: countResult[0]?.total || 0,
                  totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
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

  create: (registroData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO registrodiariocaja (
          CajaId,
          RegistroDiarioCajaFecha,
          TipoGastoId,
          TipoGastoGrupoId,
          RegistroDiarioCajaDetalle,
          RegistroDiarioCajaMonto,
          UsuarioId,
          RegistroDiarioCajaCambio,
          RegistroDiarioCajaPendiente1,
          RegistroDiarioCajaPendiente2,
          RegistroDiarioCajaPendiente3,
          RegistroDiarioCajaPendiente4,
          RegistroDiarioCajaMTCN,
          RegistroDiarioCajaCargoEnvio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        registroData.CajaId,
        registroData.RegistroDiarioCajaFecha || new Date(),
        registroData.TipoGastoId,
        registroData.TipoGastoGrupoId,
        registroData.RegistroDiarioCajaDetalle,
        registroData.RegistroDiarioCajaMonto,
        registroData.UsuarioId,
        registroData.RegistroDiarioCajaCambio || 0,
        registroData.RegistroDiarioCajaPendiente1 || 0,
        registroData.RegistroDiarioCajaPendiente2 || 0,
        registroData.RegistroDiarioCajaPendiente3 || 0,
        registroData.RegistroDiarioCajaPendiente4 || 0,
        registroData.RegistroDiarioCajaMTCN || 0,
        registroData.RegistroDiarioCajaCargoEnvio || 0,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        RegistroDiarioCaja.getById(result.insertId)
          .then((registro) => resolve(registro))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, registroData) => {
    return new Promise((resolve, reject) => {
      // Construir la consulta dinámicamente
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "CajaId",
        "RegistroDiarioCajaFecha",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "RegistroDiarioCajaDetalle",
        "RegistroDiarioCajaMonto",
        "UsuarioId",
        "RegistroDiarioCajaCambio",
        "RegistroDiarioCajaPendiente1",
        "RegistroDiarioCajaPendiente2",
        "RegistroDiarioCajaPendiente3",
        "RegistroDiarioCajaPendiente4",
        "RegistroDiarioCajaMTCN",
        "RegistroDiarioCajaCargoEnvio",
      ];

      camposActualizables.forEach((campo) => {
        if (registroData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(registroData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null); // No hay campos para actualizar
      }

      values.push(id);

      const query = `
        UPDATE registrodiariocaja 
        SET ${updateFields.join(", ")}
        WHERE RegistroDiarioCajaId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null); // No se encontró el registro
        }

        // Obtener el registro actualizado
        RegistroDiarioCaja.getById(id)
          .then((registro) => resolve(registro))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM registrodiariocaja WHERE RegistroDiarioCajaId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = RegistroDiarioCaja;
