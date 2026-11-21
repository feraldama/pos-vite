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

  getAllPaginated: (
    limit,
    offset,
    sortBy = "RegistroDiarioCajaId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza sortOrder y sortBy para evitar SQL Injection
      const allowedSortFields = [
        "RegistroDiarioCajaId",
        "RegistroDiarioCajaFecha",
        "RegistroDiarioCajaMonto",
        "RegistroDiarioCajaDetalle",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "UsuarioId",
        "CajaId",
        // agrega los campos que quieras permitir
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "RegistroDiarioCajaFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const query = `
        SELECT r.*, 
          c.CajaDescripcion, 
          t.TipoGastoDescripcion, 
          tg.TipoGastoGrupoDescripcion
        FROM registrodiariocaja r
        LEFT JOIN Caja c ON r.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON r.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON r.TipoGastoId = tg.TipoGastoId AND r.TipoGastoGrupoId = tg.TipoGastoGrupoId
        ORDER BY r.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [limit, offset], (err, results) => {
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
      });
    });
  },

  search: async (
    term,
    limit,
    offset,
    sortBy = "RegistroDiarioCajaFecha",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza los campos para evitar SQL Injection
      const allowedSortFields = [
        "RegistroDiarioCajaId",
        "RegistroDiarioCajaFecha",
        "RegistroDiarioCajaMonto",
        "RegistroDiarioCajaDetalle",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "UsuarioId",
        "CajaId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "RegistroDiarioCajaFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT r.*, 
          c.CajaDescripcion, 
          t.TipoGastoDescripcion, 
          tg.TipoGastoGrupoDescripcion
        FROM registrodiariocaja r
        LEFT JOIN Caja c ON r.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON r.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON r.TipoGastoId = tg.TipoGastoId AND r.TipoGastoGrupoId = tg.TipoGastoGrupoId
        WHERE r.RegistroDiarioCajaDetalle LIKE ? 
          OR CAST(r.UsuarioId AS CHAR) LIKE ?
          OR CAST(r.CajaId AS CHAR) LIKE ?
          OR CAST(r.TipoGastoId AS CHAR) LIKE ?
          OR CAST(r.TipoGastoGrupoId AS CHAR) LIKE ?
          OR CAST(r.RegistroDiarioCajaMonto AS CHAR) LIKE ?
          OR DATE_FORMAT(r.RegistroDiarioCajaFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
        ORDER BY r.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue, // Detalle
          searchValue, // UsuarioId
          searchValue, // CajaId
          searchValue, // TipoGastoId
          searchValue, // TipoGastoGrupoId
          searchValue, // Monto
          searchValue, // Fecha
          limit,
          offset,
        ],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM registrodiariocaja 
            WHERE RegistroDiarioCajaDetalle LIKE ? 
              OR CAST(UsuarioId AS CHAR) LIKE ?
              OR CAST(CajaId AS CHAR) LIKE ?
              OR CAST(TipoGastoId AS CHAR) LIKE ?
              OR CAST(TipoGastoGrupoId AS CHAR) LIKE ?
              OR CAST(RegistroDiarioCajaMonto AS CHAR) LIKE ?
              OR DATE_FORMAT(RegistroDiarioCajaFecha, '%d/%m/%Y %H:%i:%s') LIKE ?
          `;

          db.query(
            countQuery,
            [
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
              searchValue,
            ],
            (err, countResult) => {
              if (err) {
                console.error("Error en la consulta de conteo:", err);
                return reject(err);
              }

              const total = countResult[0]?.total || 0;

              resolve({
                data: results,
                pagination: {
                  totalItems: total,
                  totalPages: Math.ceil(total / limit),
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
          UsuarioId
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        registroData.CajaId,
        registroData.RegistroDiarioCajaFecha || new Date(),
        registroData.TipoGastoId,
        registroData.TipoGastoGrupoId,
        // La columna es varchar(50); MySQL truncaba en silencio, PG rechaza
        String(registroData.RegistroDiarioCajaDetalle || "").slice(0, 50),
        registroData.RegistroDiarioCajaMonto,
        registroData.UsuarioId,
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
      ];

      camposActualizables.forEach((campo) => {
        if (registroData[campo] !== undefined && registroData[campo] !== null) {
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

  // Alquileres a los que un movimiento aplicó un cobro (tabla alquilerpago).
  // Vacío para movimientos que no son cobros de alquiler o son anteriores
  getPagosAlquiler: (id) =>
    db.query(
      "SELECT AlquilerId, AlquilerPagoMonto FROM alquilerpago WHERE RegistroDiarioCajaId = ?",
      [id]
    ),

  // Borra el movimiento. Si era un cobro de alquiler, en la misma transacción
  // descuenta de cada alquiler lo que le había aplicado: si no, el alquiler
  // seguiría contando como entregada plata que ya no figura en caja.
  // Devuelve null si no existe, o { alquileres: [{ AlquilerId, monto }] }
  delete: (id) =>
    db.withTransaction(async (client) => {
      const { rows: pagos } = await client.q(
        `SELECT AlquilerId, AlquilerPagoMonto FROM alquilerpago
         WHERE RegistroDiarioCajaId = ? ORDER BY AlquilerId FOR UPDATE`,
        [id]
      );
      for (const pago of pagos) {
        await client.q(
          `UPDATE alquiler SET AlquilerEntrega = GREATEST(AlquilerEntrega - ?, 0)
           WHERE AlquilerId = ?`,
          [pago.AlquilerPagoMonto, pago.AlquilerId]
        );
      }
      // alquilerpago se borra en cascada
      const { rowCount } = await client.q(
        "DELETE FROM registrodiariocaja WHERE RegistroDiarioCajaId = ?",
        [id]
      );
      if (rowCount === 0) return null;
      return {
        alquileres: pagos.map((p) => ({
          AlquilerId: p.AlquilerId,
          monto: Number(p.AlquilerPagoMonto),
        })),
      };
    }),

  getUltimaApertura: (cajaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT * FROM registrodiariocaja WHERE CajaId = ? AND TipoGastoId = 2 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
        [cajaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getUltimoCierre: (cajaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT * FROM registrodiariocaja WHERE CajaId = ? AND TipoGastoId = 1 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
        [cajaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getEstadoAperturaPorUsuario: (usuarioId) => {
    return new Promise((resolve, reject) => {
      // Buscar la última apertura del usuario
      db.query(
        `SELECT RegistroDiarioCajaId, CajaId FROM registrodiariocaja WHERE UsuarioId = ? AND TipoGastoId = 2 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
        [usuarioId],
        (err, aperturas) => {
          if (err) return reject(err);
          const apertura = aperturas[0] || {
            RegistroDiarioCajaId: 0,
            CajaId: null,
          };
          // Buscar la última cierre del usuario
          db.query(
            `SELECT RegistroDiarioCajaId FROM registrodiariocaja WHERE UsuarioId = ? AND TipoGastoId = 1 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
            [usuarioId],
            (err, cierres) => {
              if (err) return reject(err);
              const cierre = cierres[0] || { RegistroDiarioCajaId: 0 };
              resolve({
                aperturaId: apertura.RegistroDiarioCajaId || 0,
                cierreId: cierre.RegistroDiarioCajaId || 0,
                cajaId: apertura.CajaId || null,
              });
            }
          );
        }
      );
    });
  },

  // Reporte de cierres: los cierres (TipoGasto 1, grupo 2) con fecha entre
  // desde y hasta (aaaa-mm-dd), opcionalmente de un usuario o una caja, del
  // más nuevo al más viejo
  getCierresDetallados: async ({ desde, hasta, usuarioId, cajaId }) => {
    const filtros = [
      "r.TipoGastoId = 1",
      "r.TipoGastoGrupoId = 2",
      "r.RegistroDiarioCajaFecha >= ?",
      "r.RegistroDiarioCajaFecha <= ?",
    ];
    const params = [desde, hasta];
    if (usuarioId) {
      filtros.push("r.UsuarioId = ?");
      params.push(usuarioId);
    }
    if (cajaId) {
      filtros.push("r.CajaId = ?");
      params.push(cajaId);
    }
    const cierres = await db.query(
      `${SELECT_CIERRES} WHERE ${filtros.join(" AND ")}
       ORDER BY r.RegistroDiarioCajaId`,
      params
    );
    return detallarCierres(cierres);
  },

  // Último cierre del usuario, con el mismo detalle que el reporte. Es lo
  // que imprime el resumen de cierre del cajero. null si no tiene cierres
  getUltimoCierreDeUsuario: async (usuarioId) => {
    const cierres = await db.query(
      `${SELECT_CIERRES}
       WHERE r.TipoGastoId = 1 AND r.TipoGastoGrupoId = 2 AND r.UsuarioId = ?
       ORDER BY r.RegistroDiarioCajaId DESC
       LIMIT 1`,
      [usuarioId]
    );
    const [cierre] = await detallarCierres(cierres);
    return cierre || null;
  },
};

const SELECT_CIERRES = `SELECT r.*, c.CajaDescripcion, u.UsuarioNombre, u.UsuarioApellido
       FROM registrodiariocaja r
       LEFT JOIN caja c ON c.CajaId = r.CajaId
       LEFT JOIN usuario u ON u.UsuarioId = r.UsuarioId`;

// Recibe cierres ordenados por id ascendente y los devuelve armados, del más
// nuevo al más viejo
async function detallarCierres(cierres) {
  // Por usuario: se traen sus registros desde la apertura de su primer
  // cierre hasta el último, y se arman las sesiones en memoria
  const porUsuario = new Map();
  for (const cierre of cierres) {
    const lista = porUsuario.get(cierre.UsuarioId) || [];
    lista.push(cierre);
    porUsuario.set(cierre.UsuarioId, lista);
  }
  const resultado = [];
  for (const [uid, lista] of porUsuario) {
    const primero = lista[0].RegistroDiarioCajaId;
    const ultimo = lista[lista.length - 1].RegistroDiarioCajaId;
    const [apertura] = await db.query(
      `SELECT MAX(RegistroDiarioCajaId) AS desdeid FROM registrodiariocaja
       WHERE UsuarioId = ? AND TipoGastoId = 2 AND TipoGastoGrupoId = 2
         AND RegistroDiarioCajaId < ?`,
      [uid, primero]
    );
    const registros = await db.query(
      `SELECT * FROM registrodiariocaja
       WHERE UsuarioId = ? AND RegistroDiarioCajaId BETWEEN ? AND ?
       ORDER BY RegistroDiarioCajaId`,
      [uid, apertura?.desdeid ?? primero, ultimo]
    );
    resultado.push(...armarCierres(lista, registros));
  }
  return resultado.sort((a, b) => b.CierreId - a.CierreId);
}

// aaaa-mm-dd de una columna DATE (pg la entrega como Date a medianoche local)
function fechaISO(valor) {
  if (!(valor instanceof Date)) return valor ? String(valor).slice(0, 10) : null;
  const dos = (n) => String(n).padStart(2, "0");
  return `${valor.getFullYear()}-${dos(valor.getMonth() + 1)}-${dos(valor.getDate())}`;
}

const esApertura = (r) => r.TipoGastoId === 2 && r.TipoGastoGrupoId === 2;
const esCierre = (r) => r.TipoGastoId === 1 && r.TipoGastoGrupoId === 2;

// Arma cada cierre con la última apertura del mismo usuario anterior a él y
// los movimientos entre ambos. Es la única cuenta del cierre: la usan este
// reporte y el resumen PDF de AperturaCierreCajaPage. Si entre esa apertura y el cierre hay otro cierre,
// la apertura ya era de ese otro: el cierre queda sin apertura
function armarCierres(cierres, registros) {
  return cierres.map((cierre) => {
    const anteriores = registros.filter(
      (r) => r.RegistroDiarioCajaId < cierre.RegistroDiarioCajaId
    );
    let apertura = null;
    for (let i = anteriores.length - 1; i >= 0; i--) {
      if (esCierre(anteriores[i])) break;
      if (esApertura(anteriores[i])) {
        apertura = anteriores[i];
        break;
      }
    }
    const movimientos = apertura
      ? anteriores.filter(
          (r) => r.RegistroDiarioCajaId > apertura.RegistroDiarioCajaId
        )
      : [];

    let efectivo = 0;
    let pos = 0;
    let transfer = 0;
    let voucher = 0;
    let egresos = 0;
    let egresosTransfer = 0;
    for (const m of movimientos) {
      const monto = Number(m.RegistroDiarioCajaMonto) || 0;
      if (m.TipoGastoId === 2) {
        if (m.TipoGastoGrupoId === 4) pos += monto;
        else if (m.TipoGastoGrupoId === 6) transfer += monto;
        // (2, 5) DESCUENTO: solo se carga a mano, no es efectivo
        else if (m.TipoGastoGrupoId === 5) voucher += monto;
        else if (m.TipoGastoGrupoId !== 2) efectivo += monto;
      } else if (m.TipoGastoId === 1) {
        // (1, 6) DEVOLUCIÓN TRANSFER no sale del cajón
        if (m.TipoGastoGrupoId === 6) egresosTransfer += monto;
        else if (m.TipoGastoGrupoId !== 2) egresos += monto;
      }
    }

    const montoCierre = Number(cierre.RegistroDiarioCajaMonto) || 0;
    const montoApertura = apertura
      ? Number(apertura.RegistroDiarioCajaMonto) || 0
      : null;
    const esperado = apertura ? montoApertura + efectivo - egresos : null;
    return {
      CierreId: cierre.RegistroDiarioCajaId,
      AperturaId: apertura ? apertura.RegistroDiarioCajaId : null,
      Fecha: fechaISO(cierre.RegistroDiarioCajaFecha),
      AperturaFecha: apertura ? fechaISO(apertura.RegistroDiarioCajaFecha) : null,
      UsuarioId: cierre.UsuarioId,
      UsuarioNombre: [cierre.UsuarioNombre, cierre.UsuarioApellido]
        .filter(Boolean)
        .join(" "),
      CajaId: cierre.CajaId,
      CajaDescripcion: cierre.CajaDescripcion || "",
      Apertura: montoApertura,
      Cierre: montoCierre,
      IngresosEfectivo: efectivo,
      IngresosPOS: pos,
      IngresosTransfer: transfer,
      IngresosVoucher: voucher,
      // Egresos en efectivo (los que se restan del cajón)
      Egresos: egresos,
      EgresosTransfer: egresosTransfer,
      EfectivoEsperado: esperado,
      // Negativa = faltante, positiva = sobrante
      Diferencia: apertura ? montoCierre - esperado : null,
      Movimientos: movimientos.map((m) => ({
        RegistroDiarioCajaId: m.RegistroDiarioCajaId,
        Fecha: fechaISO(m.RegistroDiarioCajaFecha),
        TipoGastoId: m.TipoGastoId,
        TipoGastoGrupoId: m.TipoGastoGrupoId,
        RegistroDiarioCajaDetalle: m.RegistroDiarioCajaDetalle,
        RegistroDiarioCajaMonto: Number(m.RegistroDiarioCajaMonto) || 0,
      })),
    };
  });
}

module.exports = RegistroDiarioCaja;
