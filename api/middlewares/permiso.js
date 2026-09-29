const db = require("../config/db");
const PerfilMenu = require("../models/perfilmenu.model");

// Exige un permiso sobre un menú (mismos nombres que usePermiso en el
// frontend, p.ej. "PRODUCTOS", "editar"). Va después de authMiddleware.
// Los administradores pasan siempre, igual que en el frontend.
const verificarPermiso = (menu, accion) => {
  return async (req, res, next) => {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res
          .status(401)
          .json({ success: false, message: "Usuario no identificado" });
      }

      // Se consulta la base y no el token: si se le quita el rol de
      // administrador a alguien, rige sin esperar a que venza su sesión
      const [usuario] = await db.query(
        "SELECT UsuarioIsAdmin FROM usuario WHERE UsuarioId = ?",
        [usuarioId]
      );
      if (String(usuario?.UsuarioIsAdmin || "").trim() === "S") {
        return next();
      }

      const permisos = await PerfilMenu.getPermisosByUsuarioId(usuarioId);
      if (permisos[menu]?.[accion]) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para esta acción",
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = verificarPermiso;
