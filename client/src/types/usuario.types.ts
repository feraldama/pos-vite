export interface Usuario {
  id: string | number;
  UsuarioId: string;
  UsuarioNombre: string;
  UsuarioApellido: string;
  UsuarioCorreo: string;
  UsuarioIsAdmin: "S" | "N";
  UsuarioEstado: "A" | "I";
  SucursalId: number;
  SucursalNombre?: string;
  [key: string]: unknown;
}

export type UsuarioConPerfiles = Usuario & { perfilesSeleccionados?: number[] };
