const db = require("../config/db");

// Obtener ranking global
exports.getRankingGlobal = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M" } = req.query;

    const query = `
      SELECT 
        c.ClienteId as id,
        c.ClienteNombre as nombre,
        c.ClienteCategoria as categoria,
        c.ClienteSexo as sexo,
        SUM(CASE 
          WHEN pj.PartidoJugadorResultado = 'G' THEN 100 
          WHEN pj.PartidoJugadorResultado = 'P' THEN 30 
          ELSE 0 
        END) as puntos,
        COUNT(DISTINCT CASE WHEN pj.PartidoJugadorResultado IS NOT NULL AND pj.PartidoJugadorResultado != '' THEN pj.PartidoId END) as partidosJugados,
        0 as subTorneos
      FROM clientes c
      INNER JOIN PartidoJugador pj ON c.ClienteId = pj.ClienteId
      INNER JOIN Partido p ON pj.PartidoId = p.PartidoId AND p.PartidoSexo != 'X'
      WHERE c.ClienteCategoria = ? AND c.ClienteSexo = ?
      GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteCategoria, c.ClienteSexo
      HAVING partidosJugados > 0
      ORDER BY puntos DESC, partidosJugados DESC
    `;

    db.query(query, [categoria, sexo], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      res.json({ data: results });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener ranking por competencia
exports.getRankingCompetencia = async (req, res) => {
  try {
    const { categoria = "8", sexo = "M", competenciaId } = req.query;

    if (!competenciaId) {
      return res.status(400).json({ message: "ID de competencia requerido" });
    }

    // Primero obtener las fechas de la competencia
    const competenciaQuery = `
      SELECT CompetenciaFechaInicio, CompetenciaFechaFin 
      FROM Competencia 
      WHERE CompetenciaId = ?
    `;

    db.query(competenciaQuery, [competenciaId], (err, competenciaResult) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (competenciaResult.length === 0) {
        return res.status(404).json({ message: "Competencia no encontrada" });
      }

      const { CompetenciaFechaInicio, CompetenciaFechaFin } =
        competenciaResult[0];

      const rankingQuery = `
        SELECT 
          c.ClienteId as id,
          c.ClienteNombre as nombre,
          c.ClienteCategoria as categoria,
          c.ClienteSexo as sexo,
          SUM(CASE 
            WHEN pj.PartidoJugadorResultado = 'G' THEN 100 
            WHEN pj.PartidoJugadorResultado = 'P' THEN 30 
            ELSE 0 
          END) as puntos,
          COUNT(DISTINCT CASE WHEN pj.PartidoJugadorResultado IS NOT NULL AND pj.PartidoJugadorResultado != '' THEN pj.PartidoId END) as partidosJugados
        FROM clientes c
        INNER JOIN PartidoJugador pj ON c.ClienteId = pj.ClienteId
        INNER JOIN Partido p ON pj.PartidoId = p.PartidoId AND p.PartidoSexo != 'X'
        WHERE c.ClienteCategoria = ? 
          AND c.ClienteSexo = ?
          AND p.PartidoFecha >= ? 
          AND p.PartidoFecha <= ?
        GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteCategoria, c.ClienteSexo
        HAVING partidosJugados > 0
        ORDER BY puntos DESC, partidosJugados DESC
      `;

      db.query(
        rankingQuery,
        [categoria, sexo, CompetenciaFechaInicio, CompetenciaFechaFin],
        (err, results) => {
          if (err) {
            return res.status(500).json({ message: err.message });
          }
          res.json({ data: results });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
