const db = require("../config/db");

const Caja = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Caja", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Caja WHERE CajaId = ?", [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : null);
      });
    });
  },

  create: (cajaData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Caja (CajaDescripcion, CajaMonto, CajaGastoCantidad, CajaTipoId) VALUES (?, ?, ?, ?)`;
      const values = [
        cajaData.CajaDescripcion,
        cajaData.CajaMonto,
        cajaData.CajaGastoCantidad,
        cajaData.CajaTipoId || null,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        // Obtener la caja recién creada
        Caja.getById(result.insertId)
          .then((caja) => resolve(caja))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, cajaData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Caja SET CajaDescripcion = ?, CajaMonto = ?, CajaGastoCantidad = ?, CajaTipoId = ? WHERE CajaId = ?`;
      const values = [
        cajaData.CajaDescripcion,
        cajaData.CajaMonto,
        cajaData.CajaGastoCantidad,
        cajaData.CajaTipoId || null,
        id,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Caja.getById(id)
          .then((caja) => resolve(caja))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM Caja WHERE CajaId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "CajaId", sortOrder = "ASC", cajaTipoId = null) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CajaId",
        "CajaDescripcion",
        "CajaMonto",
        "CajaGastoCantidad",
        "CajaTipoId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "CajaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      let query = `SELECT * FROM Caja`;
      let countQuery = `SELECT COUNT(*) as total FROM Caja`;
      const queryParams = [];
      const countParams = [];

      if (cajaTipoId !== null && cajaTipoId !== undefined && cajaTipoId !== "") {
        query += ` WHERE CajaTipoId = ?`;
        countQuery += ` WHERE CajaTipoId = ?`;
        queryParams.push(cajaTipoId);
        countParams.push(cajaTipoId);
      }

      query += ` ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      db.query(query, queryParams, (err, results) => {
        if (err) return reject(err);

        db.query(countQuery, countParams, (err, countResult) => {
          if (err) return reject(err);

          resolve({
            cajas: results,
            total: countResult[0].total,
          });
        });
      });
    });
  },

  searchCajas: (term, limit, offset, sortBy = "CajaId", sortOrder = "ASC", cajaTipoId = null) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CajaId",
        "CajaDescripcion",
        "CajaMonto",
        "CajaGastoCantidad",
        "CajaTipoId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "CajaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchValue = `%${term}%`;
      let searchQuery = `
        SELECT * FROM Caja
        WHERE (CajaDescripcion LIKE ?
        OR CAST(CajaMonto AS CHAR) LIKE ?
        OR CAST(CajaGastoCantidad AS CHAR) LIKE ?)`;
      let countQuery = `
        SELECT COUNT(*) as total FROM Caja
        WHERE (CajaDescripcion LIKE ?
        OR CAST(CajaMonto AS CHAR) LIKE ?
        OR CAST(CajaGastoCantidad AS CHAR) LIKE ?)`;
      
      const searchParams = [searchValue, searchValue, searchValue];
      const countParams = [searchValue, searchValue, searchValue];

      if (cajaTipoId !== null && cajaTipoId !== undefined && cajaTipoId !== "") {
        searchQuery += ` AND CajaTipoId = ?`;
        countQuery += ` AND CajaTipoId = ?`;
        searchParams.push(cajaTipoId);
        countParams.push(cajaTipoId);
      }

      searchQuery += ` ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`;
      searchParams.push(limit, offset);

      db.query(searchQuery, searchParams, (err, results) => {
        if (err) return reject(err);

        db.query(countQuery, countParams, (err, countResult) => {
          if (err) return reject(err);
          resolve({
            cajas: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = Caja;
