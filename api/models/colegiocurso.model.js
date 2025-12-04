const db = require("../config/db");

const ColegioCurso = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM colegiocurso", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (colegioId, cursoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM colegiocurso WHERE ColegioId = ? AND ColegioCursoId = ?",
        [colegioId, cursoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByColegioId: (colegioId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM colegiocurso WHERE ColegioId = ?",
        [colegioId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  create: (cursoData) => {
    return new Promise((resolve, reject) => {
      // Primero obtener el máximo ColegioCursoId para este ColegioId
      db.query(
        "SELECT MAX(ColegioCursoId) as maxId FROM colegiocurso WHERE ColegioId = ?",
        [cursoData.ColegioId],
        (err, results) => {
          if (err) return reject(err);

          const nextId = (results[0]?.maxId || 0) + 1;

          const query = `
            INSERT INTO colegiocurso (
              ColegioId,
              ColegioCursoId,
              ColegioCursoNombre,
              ColegioCursoImporte
            ) VALUES (?, ?, ?, ?)
          `;

          const values = [
            cursoData.ColegioId,
            nextId,
            cursoData.ColegioCursoNombre,
            cursoData.ColegioCursoImporte || 0,
          ];

          db.query(query, values, (err, result) => {
            if (err) return reject(err);

            // Incrementar ColegioCantCurso en la tabla colegio
            db.query(
              "UPDATE colegio SET ColegioCantCurso = ColegioCantCurso + 1 WHERE ColegioId = ?",
              [cursoData.ColegioId],
              (err) => {
                if (err) {
                  console.error("Error al actualizar ColegioCantCurso:", err);
                  // No rechazamos la promesa porque el curso ya se creó
                }

                // Obtener el registro recién creado
                ColegioCurso.getById(cursoData.ColegioId, nextId)
                  .then((curso) => resolve(curso))
                  .catch((error) => reject(error));
              }
            );
          });
        }
      );
    });
  },

  update: (colegioId, cursoId, cursoData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];

      const camposActualizables = ["ColegioCursoNombre", "ColegioCursoImporte"];

      camposActualizables.forEach((campo) => {
        if (cursoData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(cursoData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(colegioId, cursoId);

      const query = `
        UPDATE colegiocurso 
        SET ${updateFields.join(", ")}
        WHERE ColegioId = ? AND ColegioCursoId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null);
        }

        // Obtener el registro actualizado
        ColegioCurso.getById(colegioId, cursoId)
          .then((curso) => resolve(curso))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (colegioId, cursoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM colegiocurso WHERE ColegioId = ? AND ColegioCursoId = ?",
        [colegioId, cursoId],
        (err, result) => {
          if (err) return reject(err);

          if (result.affectedRows > 0) {
            // Decrementar ColegioCantCurso en la tabla colegio
            db.query(
              "UPDATE colegio SET ColegioCantCurso = GREATEST(ColegioCantCurso - 1, 0) WHERE ColegioId = ?",
              [colegioId],
              (err) => {
                if (err) {
                  console.error("Error al actualizar ColegioCantCurso:", err);
                  // No rechazamos la promesa porque el curso ya se eliminó
                }
                resolve(true);
              }
            );
          } else {
            resolve(false);
          }
        }
      );
    });
  },
};

module.exports = ColegioCurso;
