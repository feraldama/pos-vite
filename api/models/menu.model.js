const db = require("../config/db");

const Menu = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM menu", (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },
  getAllPaginated: (
    page = 1,
    itemsPerPage = 10,
    sortBy = "MenuId",
    sortOrder = "ASC",
    search = ""
  ) => {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * itemsPerPage;
      const allowedSortFields = ["MenuId", "MenuNombre"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "MenuId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      let where = "";
      let params = [];
      if (search) {
        where = "WHERE MenuId LIKE ? OR MenuNombre LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
      }
      params.push(parseInt(itemsPerPage), parseInt(offset));

      const query = `
        SELECT *, COUNT(*) OVER() AS total_rows FROM menu
        ${where}
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      db.query(query, params, (err, results) => {
        if (err) return reject(err);
        const total = results.length > 0 ? Number(results[0].total_rows) : 0;
        const data = results.map(({ total_rows, ...row }) => row);
        resolve({
          data,
          pagination: {
            totalItems: total,
            totalPages: Math.ceil(total / itemsPerPage),
            currentPage: page,
            itemsPerPage: itemsPerPage,
          },
        });
      });
    });
  },
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM menu WHERE MenuId = ?", [id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  },
  create: (data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO menu (MenuId, MenuNombre) VALUES (?, ?)",
        [data.MenuId, data.MenuNombre],
        (err, result) => {
          if (err) return reject(err);
          resolve({ MenuId: data.MenuId, ...data });
        }
      );
    });
  },
  update: (id, data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "UPDATE menu SET MenuNombre = ? WHERE MenuId = ?",
        [data.MenuNombre, id],
        (err) => {
          if (err) return reject(err);
          resolve({ MenuId: id, ...data });
        }
      );
    });
  },
  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM menu WHERE MenuId = ?", [id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },
};

module.exports = Menu;
