const db = require("../config/db");

const Partido = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT PartidoId, 
                DATE_FORMAT(PartidoFecha, '%d-%m-%Y') as PartidoFecha, 
                DATE_FORMAT(PartidoHoraInicio, '%H:%i') as PartidoHoraInicio,
                DATE_FORMAT(PartidoHoraFin, '%H:%i') as PartidoHoraFin,
                PartidoCategoria, 
                PartidoEstado, 
                CanchaId,
                PartidoSexo
         FROM partido`,
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        }
      );
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT p.PartidoId, 
                DATE_FORMAT(p.PartidoFecha, '%d-%m-%Y') as PartidoFecha, 
                DATE_FORMAT(p.PartidoHoraInicio, '%H:%i') as PartidoHoraInicio,
                DATE_FORMAT(p.PartidoHoraFin, '%H:%i') as PartidoHoraFin,
                p.PartidoCategoria, 
                p.PartidoEstado, 
                p.CanchaId, 
                p.PartidoSexo,
                c.CanchaNombre 
         FROM partido p 
         LEFT JOIN cancha c ON p.CanchaId = c.CanchaId 
         WHERE p.PartidoId = ?`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "PartidoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "PartidoId",
        "PartidoFecha",
        "PartidoHoraInicio",
        "PartidoHoraFin",
        "PartidoCategoria",
        "PartidoEstado",
        "CanchaId",
        "PartidoSexo",
        "CanchaNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PartidoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT p.PartidoId, 
                DATE_FORMAT(p.PartidoFecha, '%d-%m-%Y') as PartidoFecha, 
                DATE_FORMAT(p.PartidoHoraInicio, '%H:%i') as PartidoHoraInicio,
                DATE_FORMAT(p.PartidoHoraFin, '%H:%i') as PartidoHoraFin,
                p.PartidoCategoria, 
                p.PartidoEstado, 
                p.CanchaId, 
                p.PartidoSexo,
                c.CanchaNombre 
         FROM partido p 
         LEFT JOIN cancha c ON p.CanchaId = c.CanchaId 
         ORDER BY p.${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, partidos) => {
          if (err) return reject(err);

          if (partidos.length === 0) {
            return resolve({
              partidos: [],
              total: 0,
            });
          }

          const partidoIds = partidos.map((p) => p.PartidoId);

          // Obtener jugadores para estos partidos
          db.query(
            `SELECT pj.PartidoId,
                    pj.PartidoJugadorPareja,
                    pj.PartidoJugadorResultado,
                    cl.ClienteNombre,
                    cl.ClienteApellido
             FROM partidojugador pj
             LEFT JOIN clientes cl ON pj.ClienteId = cl.ClienteId
             WHERE pj.PartidoId IN (?)
             ORDER BY pj.PartidoId, pj.PartidoJugadorPareja, pj.PartidoJugadorId`,
            [partidoIds],
            (err, jugadores) => {
              if (err) return reject(err);

              // Agrupar jugadores por PartidoId
              const jugadoresPorPartido = jugadores.reduce((acc, jugador) => {
                if (!acc[jugador.PartidoId]) {
                  acc[jugador.PartidoId] = [];
                }
                acc[jugador.PartidoId].push(jugador);
                return acc;
              }, {});

              // Combinar partidos con sus jugadores
              const partidosConJugadores = partidos.map((partido) => ({
                ...partido,
                jugadores: jugadoresPorPartido[partido.PartidoId] || [],
              }));

              db.query(
                "SELECT COUNT(*) as total FROM partido",
                (err, countResult) => {
                  if (err) return reject(err);

                  resolve({
                    partidos: partidosConJugadores,
                    total: countResult[0].total,
                  });
                }
              );
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "PartidoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "PartidoId",
        "PartidoFecha",
        "PartidoHoraInicio",
        "PartidoHoraFin",
        "PartidoCategoria",
        "PartidoEstado",
        "CanchaId",
        "PartidoSexo",
        "CanchaNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "PartidoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT DISTINCT p.PartidoId, 
               DATE_FORMAT(p.PartidoFecha, '%d-%m-%Y') as PartidoFecha, 
               DATE_FORMAT(p.PartidoHoraInicio, '%H:%i') as PartidoHoraInicio,
               DATE_FORMAT(p.PartidoHoraFin, '%H:%i') as PartidoHoraFin,
               p.PartidoCategoria, 
               p.PartidoEstado, 
               p.CanchaId, 
               p.PartidoSexo,
               c.CanchaNombre 
        FROM partido p
        LEFT JOIN cancha c ON p.CanchaId = c.CanchaId
        LEFT JOIN partidojugador pj ON p.PartidoId = pj.PartidoId
        LEFT JOIN clientes cl ON pj.ClienteId = cl.ClienteId
        WHERE p.PartidoCategoria LIKE ? 
        OR (p.PartidoEstado = 1 AND ? = 'FINALIZADO')
        OR (p.PartidoEstado = 0 AND ? = 'PENDIENTE')
        OR c.CanchaNombre LIKE ?
        OR cl.ClienteNombre LIKE ?
        OR cl.ClienteApellido LIKE ?
        OR CONCAT(cl.ClienteNombre, ' ', cl.ClienteApellido) LIKE ?
        ORDER BY p.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;
      const upperTerm = term.toUpperCase();

      db.query(
        searchQuery,
        [
          searchValue,
          upperTerm,
          upperTerm,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          limit,
          offset,
        ],
        (err, partidos) => {
          if (err) return reject(err);

          if (partidos.length === 0) {
            return resolve({
              partidos: [],
              total: 0,
            });
          }

          const partidoIds = partidos.map((p) => p.PartidoId);

          // Obtener jugadores para estos partidos
          db.query(
            `SELECT pj.PartidoId,
                    pj.PartidoJugadorPareja,
                    pj.PartidoJugadorResultado,
                    cl.ClienteNombre,
                    cl.ClienteApellido
             FROM partidojugador pj
             LEFT JOIN clientes cl ON pj.ClienteId = cl.ClienteId
             WHERE pj.PartidoId IN (?)
             ORDER BY pj.PartidoId, pj.PartidoJugadorPareja, pj.PartidoJugadorId`,
            [partidoIds],
            (err, jugadores) => {
              if (err) return reject(err);

              // Agrupar jugadores por PartidoId
              const jugadoresPorPartido = jugadores.reduce((acc, jugador) => {
                if (!acc[jugador.PartidoId]) {
                  acc[jugador.PartidoId] = [];
                }
                acc[jugador.PartidoId].push(jugador);
                return acc;
              }, {});

              // Combinar partidos con sus jugadores
              const partidosConJugadores = partidos.map((partido) => ({
                ...partido,
                jugadores: jugadoresPorPartido[partido.PartidoId] || [],
              }));

              const countQuery = `
                SELECT COUNT(DISTINCT p.PartidoId) as total FROM partido p
                LEFT JOIN cancha c ON p.CanchaId = c.CanchaId
                LEFT JOIN partidojugador pj ON p.PartidoId = pj.PartidoId
                LEFT JOIN clientes cl ON pj.ClienteId = cl.ClienteId
                WHERE p.PartidoCategoria LIKE ? 
                OR (p.PartidoEstado = 1 AND ? = 'FINALIZADO')
                OR (p.PartidoEstado = 0 AND ? = 'PENDIENTE')
                OR c.CanchaNombre LIKE ?
                OR cl.ClienteNombre LIKE ?
                OR cl.ClienteApellido LIKE ?
                OR CONCAT(cl.ClienteNombre, ' ', cl.ClienteApellido) LIKE ?
              `;

              db.query(
                countQuery,
                [
                  searchValue,
                  upperTerm,
                  upperTerm,
                  searchValue,
                  searchValue,
                  searchValue,
                  searchValue,
                ],
                (err, countResult) => {
                  if (err) return reject(err);

                  resolve({
                    partidos: partidosConJugadores,
                    total: countResult[0]?.total || 0,
                  });
                }
              );
            }
          );
        }
      );
    });
  },

  create: (partidoData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO partido (
          PartidoFecha,
          PartidoHoraInicio,
          PartidoHoraFin,
          PartidoCategoria,
          PartidoEstado,
          CanchaId,
          PartidoSexo
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      // Convertir a booleano si viene como string
      const estado =
        partidoData.PartidoEstado === "true" ||
        partidoData.PartidoEstado === true
          ? 1
          : 0;
      const values = [
        partidoData.PartidoFecha,
        partidoData.PartidoHoraInicio,
        partidoData.PartidoHoraFin,
        partidoData.PartidoCategoria,
        estado,
        partidoData.CanchaId,
        partidoData.PartidoSexo || null,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          PartidoId: result.insertId,
          ...partidoData,
        });
      });
    });
  },

  update: (id, partidoData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "PartidoFecha",
        "PartidoHoraInicio",
        "PartidoHoraFin",
        "PartidoCategoria",
        "PartidoEstado",
        "CanchaId",
        "PartidoSexo",
      ];
      camposActualizables.forEach((campo) => {
        if (partidoData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          // Convertir PartidoEstado a booleano si es necesario
          if (campo === "PartidoEstado") {
            const estado =
              partidoData[campo] === "true" || partidoData[campo] === true
                ? 1
                : 0;
            values.push(estado);
          } else {
            values.push(partidoData[campo]);
          }
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE partido 
        SET ${updateFields.join(", ")}
        WHERE PartidoId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        // Obtener el partido actualizado
        Partido.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM partido WHERE PartidoId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = Partido;
