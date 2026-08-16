const db = require("../config/db");

const Producto = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM producto", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT p.*, l.LocalNombre, tp.TipoPrendaNombre FROM producto p LEFT JOIN local l ON p.LocalId = l.LocalId LEFT JOIN tipoprenda tp ON p.TipoPrendaId = tp.TipoPrendaId WHERE p.ProductoId = ?",
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
    sortBy = "ProductoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ProductoId",
        "ProductoCodigo",
        "ProductoNombre",
        "ProductoPrecioVenta",
        "ProductoPrecioVentaMayorista",
        "ProductoPrecioUnitario",
        "ProductoPrecioPromedio",
        "ProductoStock",
        "ProductoStockUnitario",
        "ProductoCantidadCaja",
        "ProductoIVA",
        "ProductoStockMinimo",
        "ProductoImagen",
        "ProductoImagen_GXI",
        "LocalId",
        "LocalNombre",
        "TipoPrendaId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ProductoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT p.*, l.LocalNombre, tp.TipoPrendaNombre FROM producto p LEFT JOIN local l ON p.LocalId = l.LocalId LEFT JOIN tipoprenda tp ON p.TipoPrendaId = tp.TipoPrendaId ORDER BY ${sortField === "LocalNombre" ? "l" : sortField === "TipoPrendaNombre" ? "tp" : "p"}.${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM producto",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                productos: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "ProductoId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ProductoId",
        "ProductoCodigo",
        "ProductoNombre",
        "ProductoPrecioVenta",
        "ProductoPrecioVentaMayorista",
        "ProductoPrecioUnitario",
        "ProductoPrecioPromedio",
        "ProductoStock",
        "ProductoStockUnitario",
        "ProductoCantidadCaja",
        "ProductoIVA",
        "ProductoStockMinimo",
        "ProductoImagen",
        "ProductoImagen_GXI",
        "LocalId",
        "LocalNombre",
        "TipoPrendaId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ProductoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT p.*, l.LocalNombre, tp.TipoPrendaNombre FROM producto p
        LEFT JOIN local l ON p.LocalId = l.LocalId
        LEFT JOIN tipoprenda tp ON p.TipoPrendaId = tp.TipoPrendaId
        WHERE p.ProductoNombre LIKE ? 
        OR p.ProductoCodigo LIKE ? 
        OR l.LocalNombre LIKE ?
        OR tp.TipoPrendaNombre LIKE ?
        ORDER BY ${sortField === "LocalNombre" ? "l" : sortField === "TipoPrendaNombre" ? "tp" : "p"}.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM producto p
            LEFT JOIN local l ON p.LocalId = l.LocalId
            LEFT JOIN tipoprenda tp ON p.TipoPrendaId = tp.TipoPrendaId
            WHERE p.ProductoNombre LIKE ? 
            OR p.ProductoCodigo LIKE ? 
            OR l.LocalNombre LIKE ?
            OR tp.TipoPrendaNombre LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                productos: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  // Sincroniza la fila de productoalmacen del local del producto para que la
  // suma de almacenes coincida con el stock cargado/editado desde la pantalla
  syncAlmacen: (id) => {
    const query = `
      INSERT INTO productoalmacen (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario)
      SELECT p.ProductoId,
             COALESCE((SELECT a.AlmacenId FROM almacen a WHERE a.AlmacenId = p.LocalId), 1),
             p.ProductoStock - COALESCE((SELECT SUM(pa.ProductoAlmacenStock) FROM productoalmacen pa
                WHERE pa.ProductoId = p.ProductoId
                  AND pa.AlmacenId <> COALESCE((SELECT a2.AlmacenId FROM almacen a2 WHERE a2.AlmacenId = p.LocalId), 1)), 0),
             p.ProductoStockUnitario - COALESCE((SELECT SUM(pa.ProductoAlmacenStockUnitario) FROM productoalmacen pa
                WHERE pa.ProductoId = p.ProductoId
                  AND pa.AlmacenId <> COALESCE((SELECT a3.AlmacenId FROM almacen a3 WHERE a3.AlmacenId = p.LocalId), 1)), 0)
      FROM producto p WHERE p.ProductoId = ?
      ON CONFLICT ("ProductoId", "AlmacenId") DO UPDATE
        SET "ProductoAlmacenStock" = EXCLUDED."ProductoAlmacenStock",
            "ProductoAlmacenStockUnitario" = EXCLUDED."ProductoAlmacenStockUnitario"
    `;
    return db.query(query, [id]);
  },

  create: (productoData) => {
    return new Promise((resolve, reject) => {
      const imagenBuffer = productoData.ProductoImagen
        ? Buffer.from(productoData.ProductoImagen, "base64")
        : Buffer.from([]);
      const query = `
        INSERT INTO producto (
          ProductoCodigo,
          ProductoNombre,
          ProductoPrecioVenta,
          ProductoPrecioVentaMayorista,
          ProductoPrecioUnitario,
          ProductoPrecioPromedio,
          ProductoStock,
          ProductoStockUnitario,
          ProductoCantidadCaja,
          ProductoIVA,
          ProductoStockMinimo,
          ProductoImagen,
          ProductoImagen_GXI,
          LocalId,
          TipoPrendaId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        // La columna es bigint: quedarse solo con los dígitos
        parseInt(String(productoData.ProductoCodigo).replace(/\D/g, "")) || 0,
        productoData.ProductoNombre,
        productoData.ProductoPrecioVenta,
        productoData.ProductoPrecioVentaMayorista,
        productoData.ProductoPrecioUnitario,
        productoData.ProductoPrecioPromedio,
        productoData.ProductoStock,
        productoData.ProductoStockUnitario,
        productoData.ProductoCantidadCaja,
        productoData.ProductoIVA,
        productoData.ProductoStockMinimo,
        imagenBuffer,
        productoData.ProductoImagen_GXI || null,
        productoData.LocalId,
        productoData.TipoPrendaId || null,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        Producto.syncAlmacen(result.insertId)
          .then(() =>
            resolve({
              ProductoId: result.insertId,
              ...productoData,
            })
          )
          .catch(reject);
      });
    });
  },

  update: (id, productoData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "ProductoCodigo",
        "ProductoNombre",
        "ProductoPrecioVenta",
        "ProductoPrecioVentaMayorista",
        "ProductoPrecioUnitario",
        "ProductoPrecioPromedio",
        "ProductoStock",
        "ProductoStockUnitario",
        "ProductoCantidadCaja",
        "ProductoIVA",
        "ProductoStockMinimo",
        "ProductoImagen",
        "ProductoImagen_GXI",
        "LocalId",
        "TipoPrendaId",
      ];
      camposActualizables.forEach((campo) => {
        if (campo === "ProductoImagen_GXI") {
          updateFields.push(`${campo} = ?`);
          values.push(productoData.ProductoImagen_GXI || null);
        } else if (campo === "ProductoImagen") {
          // La columna es NOT NULL: imagen nueva -> reemplazar; "" -> borrar (bytea vacío);
          // ausente -> conservar la existente
          if (productoData.ProductoImagen) {
            updateFields.push(`${campo} = ?`);
            values.push(Buffer.from(productoData.ProductoImagen, "base64"));
          } else if (productoData.ProductoImagen === "") {
            updateFields.push(`${campo} = ?`);
            values.push(Buffer.from([]));
          }
        } else if (productoData[campo] !== undefined && productoData[campo] !== null) {
          updateFields.push(`${campo} = ?`);
          values.push(
            campo === "ProductoCodigo"
              ? parseInt(String(productoData[campo]).replace(/\D/g, "")) || 0
              : productoData[campo]
          );
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE producto 
        SET ${updateFields.join(", ")}
        WHERE ProductoId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        // Sincronizar el almacén (por si se editó el stock) y devolver el producto
        Producto.syncAlmacen(id)
          .then(() => Producto.getById(id))
          .then(resolve)
          .catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      // Primero el detalle por almacén (FK); las demás referencias (ventas,
      // compras, alquileres) siguen bloqueando el borrado, como corresponde
      db.query(
        "DELETE FROM productoalmacen WHERE ProductoId = ?",
        [id],
        (err) => {
          if (err) return reject(err);
          db.query(
            "DELETE FROM producto WHERE ProductoId = ?",
            [id],
            (err, result) => {
              if (err) return reject(err);
              resolve(result.affectedRows > 0);
            }
          );
        }
      );
    });
  },
};

module.exports = Producto;
