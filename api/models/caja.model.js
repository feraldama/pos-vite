const db = require("../config/db");

const Caja = {
  getAll: async () => {
    const result = await db.query('SELECT * FROM "caja"');
    return result.rows;
  },

  getById: async (id) => {
    const result = await db.query(
      'SELECT * FROM "caja" WHERE "CajaId" = $1',
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  },

  create: async (cajaData) => {
    const result = await db.query(
      'INSERT INTO "caja" ("CajaDescripcion", "CajaMonto") VALUES ($1, $2) RETURNING "CajaId"',
      [cajaData.CajaDescripcion, cajaData.CajaMonto]
    );
    return Caja.getById(result.rows[0].CajaId);
  },

  update: async (id, cajaData) => {
    const result = await db.query(
      'UPDATE "caja" SET "CajaDescripcion" = $1, "CajaMonto" = $2 WHERE "CajaId" = $3',
      [cajaData.CajaDescripcion, cajaData.CajaMonto, id]
    );
    if (result.rowCount === 0) return null;
    return Caja.getById(id);
  },

  delete: async (id) => {
    const result = await db.query(
      'DELETE FROM "caja" WHERE "CajaId" = $1',
      [id]
    );
    return result.rowCount > 0;
  },

  getAllPaginated: async (limit, offset, sortBy = "CajaId", sortOrder = "ASC") => {
    const allowedSortFields = ["CajaId", "CajaDescripcion", "CajaMonto"];
    const allowedSortOrders = ["ASC", "DESC"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "CajaId";
    const order = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "ASC";

    const result = await db.query(
      `SELECT * FROM "caja" ORDER BY "${sortField}" ${order} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM "caja"'
    );

    return {
      cajas: result.rows,
      total: countResult.rows[0].total,
    };
  },

  searchCajas: async (term, limit, offset, sortBy = "CajaId", sortOrder = "ASC") => {
    const allowedSortFields = ["CajaId", "CajaDescripcion", "CajaMonto"];
    const allowedSortOrders = ["ASC", "DESC"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "CajaId";
    const order = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "ASC";

    const searchValue = `%${term}%`;

    const result = await db.query(
      `SELECT * FROM "caja"
        WHERE "CajaDescripcion" LIKE $1
        OR CAST("CajaMonto" AS TEXT) LIKE $2
        ORDER BY "${sortField}" ${order}
        LIMIT $3 OFFSET $4`,
      [searchValue, searchValue, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM "caja"
        WHERE "CajaDescripcion" LIKE $1
        OR CAST("CajaMonto" AS TEXT) LIKE $2`,
      [searchValue, searchValue]
    );

    return {
      cajas: result.rows,
      total: countResult.rows[0]?.total || 0,
    };
  },
};

module.exports = Caja;
