import { useAuth } from "../contexts/useAuth";

export function usePermiso(
  menu: string,
  accion: "crear" | "editar" | "eliminar" | "leer"
) {
  const { permisos } = useAuth();
  return permisos?.[menu]?.[accion] ?? false;
}
