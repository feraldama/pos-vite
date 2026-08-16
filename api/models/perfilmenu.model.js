const db = require("../config/db");

const PerfilMenu = {
  getByPerfil: (perfilId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM perfilmenu WHERE PerfilId = ?",
        [perfilId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },
  getPermisosByUsuarioId: (usuarioId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT m.MenuNombre, pm.puedeCrear, pm.puedeEditar, pm.puedeEliminar, pm.puedeLeer
        FROM usuarioperfil up
        JOIN perfilmenu pm ON up.PerfilId = pm.PerfilId
        JOIN menu m ON pm.MenuId = m.MenuId
        WHERE up.UsuarioId = ?
      `;
      db.query(query, [usuarioId], (err, results) => {
        if (err) return reject(err);
        const permisos = {};
        results.forEach((row) => {
          permisos[row.MenuNombre] = {
            crear: !!row.puedeCrear,
            editar: !!row.puedeEditar,
            eliminar: !!row.puedeEliminar,
            leer: !!row.puedeLeer,
          };
        });
        resolve(permisos);
      });
    });
  },
  create: (data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO perfilmenu (PerfilId, MenuId, puedeCrear, puedeEditar, puedeEliminar, puedeLeer) VALUES (?, ?, ?, ?, ?, ?)",
        [
          data.PerfilId,
          data.MenuId,
          Number(Boolean(data.puedeCrear)),
          Number(Boolean(data.puedeEditar)),
          Number(Boolean(data.puedeEliminar)),
          Number(Boolean(data.puedeLeer)),
        ],
        (err) => {
          if (err) return reject(err);
          // La tabla tiene clave compuesta (PerfilId, MenuId); no hay id autogenerado
          resolve({ ...data });
        }
      );
    });
  },
  update: (perfilId, menuId, data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "UPDATE perfilmenu SET puedeCrear=?, puedeEditar=?, puedeEliminar=?, puedeLeer=? WHERE PerfilId=? AND MenuId=?",
        [
          Number(Boolean(data.puedeCrear)),
          Number(Boolean(data.puedeEditar)),
          Number(Boolean(data.puedeEliminar)),
          Number(Boolean(data.puedeLeer)),
          perfilId,
          menuId,
        ],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  },
  delete: (perfilId, menuId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM perfilmenu WHERE PerfilId=? AND MenuId=?",
        [perfilId, menuId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  },
};

module.exports = PerfilMenu;
