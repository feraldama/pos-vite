const db = require("../config/db");

// Solo administradores (UsuarioIsAdmin = 'S'). Va después de authMiddleware.
// Se consulta la base y no el token, igual que en verificarPermiso: si se le
// quita el rol a alguien, rige sin esperar a que venza su sesión
const soloAdmin = async (req, res, next) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res
        .status(401)
        .json({ success: false, message: "Usuario no identificado" });
    }
    const [usuario] = await db.query(
      "SELECT UsuarioIsAdmin FROM usuario WHERE UsuarioId = ?",
      [usuarioId]
    );
    if (String(usuario?.UsuarioIsAdmin || "").trim() === "S") {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Solo el administrador puede acceder",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = soloAdmin;
