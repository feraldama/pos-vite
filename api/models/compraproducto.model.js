const db = require("../config/db");

const CompraProducto = {
  getByCompraId: (compraId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT cp.*, p.ProductoNombre, p.ProductoCodigo 
         FROM compraproducto cp 
         LEFT JOIN producto p ON cp.ProductoId = p.ProductoId 
         WHERE cp.CompraId = ?`,
        [compraId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  create: (compraProductoData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO compraproducto (
          CompraId,
          ProductoId,
          CompraProductoCantidad,
          CompraProductoCantidadUnidad,
          CompraProductoBonificacion,
          CompraProductoPrecio,
          AlmacenOrigenId
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        compraProductoData.CompraId,
        compraProductoData.ProductoId,
        compraProductoData.CompraProductoCantidad,
        compraProductoData.CompraProductoCantidadUnidad || "U",
        compraProductoData.CompraProductoBonificacion || 0,
        compraProductoData.CompraProductoPrecio,
        compraProductoData.AlmacenOrigenId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          CompraId: compraProductoData.CompraId,
          ProductoId: compraProductoData.ProductoId,
          ...compraProductoData,
        });
      });
    });
  },

  createMultiple: (compraProductos) => {
    return new Promise((resolve, reject) => {
      if (!compraProductos || compraProductos.length === 0) {
        return resolve([]);
      }

      const query = `
        INSERT INTO compraproducto (
          CompraId,
          ProductoId,
          CompraProductoCantidad,
          CompraProductoCantidadUnidad,
          CompraProductoBonificacion,
          CompraProductoPrecio,
          AlmacenOrigenId
        ) VALUES ?
      `;

      const values = compraProductos.map((cp) => [
        cp.CompraId,
        cp.ProductoId,
        cp.CompraProductoCantidad,
        cp.CompraProductoCantidadUnidad || "U",
        cp.CompraProductoBonificacion || 0,
        cp.CompraProductoPrecio,
        cp.AlmacenOrigenId,
      ]);

      db.query(query, [values], (err, result) => {
        if (err) return reject(err);
        resolve(compraProductos);
      });
    });
  },

  deleteByCompraId: (compraId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM compraproducto WHERE CompraId = ?",
        [compraId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  delete: (compraId, productoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM compraproducto WHERE CompraId = ? AND ProductoId = ?",
        [compraId, productoId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = CompraProducto;
