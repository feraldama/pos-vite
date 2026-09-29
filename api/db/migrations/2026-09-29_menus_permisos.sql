-- Menús que usa el sistema actual para los permisos (usePermiso en el frontend
-- y verificarPermiso en la API). La tabla solo tenía los del sistema anterior
-- (WPVENTA, WWPRODUCTO...), así que no se podían asignar permisos por perfil.
-- Idempotente: solo agrega los que faltan.
INSERT INTO public.menu ("MenuId", "MenuNombre")
SELECT v.nombre, v.nombre
FROM (VALUES
  ('ALMACENES'),
  ('ALQUILER'),
  ('CAJAS'),
  ('CLIENTES'),
  ('COMBOS'),
  ('COMPRAS'),
  ('FACTURAS'),
  ('INVENTARIO'),
  ('LOCALES'),
  ('MENUS'),
  ('PERFILES'),
  ('PRODUCTOS'),
  ('REGISTRODIARIOCAJA'),
  ('REPORTES'),
  ('TIPOPRENDA'),
  ('TIPOSGASTO'),
  ('USUARIOS'),
  ('VENTAS')
) AS v(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu m WHERE m."MenuNombre" = v.nombre
);
