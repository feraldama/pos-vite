const db = require("../config/db");

const Venta = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM venta", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM venta WHERE VentaId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO venta (
        VentaProductoId,
        ProductoId,
        VentaProductoPrecioPromedio,
        VentaProductoCantidad,
        VentaProductoPrecio,
        VentaProductoPrecioTotal,
        VentaProductoUnitario
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.VentaProductoId,
        data.ProductoId,
        data.VentaProductoPrecioPromedio,
        data.VentaProductoCantidad,
        data.VentaProductoPrecio,
        data.VentaProductoPrecioTotal,
        data.VentaProductoUnitario,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        Venta.getById(result.insertId)
          .then((venta) => resolve(venta))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE venta SET 
        VentaProductoId = ?,
        ProductoId = ?,
        VentaProductoPrecioPromedio = ?,
        VentaProductoCantidad = ?,
        VentaProductoPrecio = ?,
        VentaProductoPrecioTotal = ?,
        VentaProductoUnitario = ?
        WHERE VentaId = ?`;

      const values = [
        data.VentaProductoId,
        data.ProductoId,
        data.VentaProductoPrecioPromedio,
        data.VentaProductoCantidad,
        data.VentaProductoPrecio,
        data.VentaProductoPrecioTotal,
        data.VentaProductoUnitario,
        id,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Venta.getById(id)
          .then((venta) => resolve(venta))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM venta WHERE VentaId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "VentaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaProductoId",
        "ProductoId",
        "VentaProductoPrecioPromedio",
        "VentaProductoCantidad",
        "VentaProductoPrecio",
        "VentaProductoPrecioTotal",
        "VentaProductoUnitario",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM venta ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM venta",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                ventas: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchVentas: (
    term,
    limit,
    offset,
    sortBy = "VentaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaProductoId",
        "ProductoId",
        "VentaProductoPrecioPromedio",
        "VentaProductoCantidad",
        "VentaProductoPrecio",
        "VentaProductoPrecioTotal",
        "VentaProductoUnitario",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM venta
        WHERE VentaId LIKE ?
        OR VentaProductoId LIKE ?
        OR ProductoId LIKE ?
        OR CAST(VentaProductoPrecioPromedio AS CHAR) LIKE ?
        OR CAST(VentaProductoCantidad AS CHAR) LIKE ?
        OR CAST(VentaProductoPrecio AS CHAR) LIKE ?
        OR CAST(VentaProductoPrecioTotal AS CHAR) LIKE ?
        OR CAST(VentaProductoUnitario AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const searchValue = `%${term}%`;
      const values = Array(8).fill(searchValue).concat([limit, offset]);

      db.query(searchQuery, values, (err, results) => {
        if (err) return reject(err);

        const countQuery = `
          SELECT COUNT(*) as total FROM venta
          WHERE VentaId LIKE ?
          OR VentaProductoId LIKE ?
          OR ProductoId LIKE ?
          OR CAST(VentaProductoPrecioPromedio AS CHAR) LIKE ?
          OR CAST(VentaProductoCantidad AS CHAR) LIKE ?
          OR CAST(VentaProductoPrecio AS CHAR) LIKE ?
          OR CAST(VentaProductoPrecioTotal AS CHAR) LIKE ?
          OR CAST(VentaProductoUnitario AS CHAR) LIKE ?
        `;

        db.query(countQuery, Array(8).fill(searchValue), (err, countResult) => {
          if (err) return reject(err);
          resolve({
            ventas: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = Venta;
