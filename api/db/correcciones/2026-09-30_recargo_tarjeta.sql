-- CORRECCIÓN ÚNICA (manual, no es una migración).
--
-- Hasta la versión del 2026-09-30, al crear un alquiler pagado con tarjeta se
-- guardaba en AlquilerEntrega el monto CON el recargo (3% débito / 5% crédito),
-- así que el saldo del cliente quedó por debajo de lo real. La caja está bien:
-- registró lo que pasó por el posnet.
--
-- Esto descuenta ese recargo de AlquilerEntrega en los alquileres afectados.
-- Se reconocen por el movimiento de caja "Alquiler #N - Tarjeta ..." sin enlace
-- en alquilerpago (los que se crean con la versión nueva sí lo tienen, así que
-- quedan afuera aunque el texto sea igual).
--
-- Redondeo: el recargo se deduce del monto en caja (monto - monto / 1,03), así
-- que puede diferir en ±1 Gs del original.
--
-- Uso:
--   1. Correr solo el bloque "VISTA PREVIA" y revisar el resultado.
--   2. Correr el bloque "APLICAR" completo. Si ya se aplicó, falla sin tocar
--      nada (queda registrado en schema_migrations).

-- ========================= VISTA PREVIA =========================
WITH recargos AS (
  SELECT
    substring(r."RegistroDiarioCajaDetalle" FROM '^Alquiler #([0-9]+) - ')::int AS "AlquilerId",
    r."RegistroDiarioCajaMonto" - ROUND(
      r."RegistroDiarioCajaMonto"
      / CASE WHEN r."RegistroDiarioCajaDetalle" LIKE '%Débito%' THEN 1.03 ELSE 1.05 END
    ) AS recargo
  FROM registrodiariocaja r
  WHERE r."RegistroDiarioCajaDetalle" ~ '^Alquiler #[0-9]+ - Tarjeta (Débito|Crédito)'
    AND NOT EXISTS (
      SELECT 1 FROM alquilerpago ap
      WHERE ap."RegistroDiarioCajaId" = r."RegistroDiarioCajaId"
    )
)
SELECT
  a."AlquilerId",
  a."AlquilerTotal" AS total,
  a."AlquilerEntrega" AS entrega_actual,
  SUM(x.recargo) AS recargo_a_descontar,
  GREATEST(a."AlquilerEntrega" - SUM(x.recargo), 0) AS entrega_corregida,
  a."AlquilerTotal" - GREATEST(a."AlquilerEntrega" - SUM(x.recargo), 0)
    - a."AlquilerDescuento" AS saldo_corregido
FROM recargos x
JOIN alquiler a ON a."AlquilerId" = x."AlquilerId"
GROUP BY a."AlquilerId", a."AlquilerTotal", a."AlquilerEntrega", a."AlquilerDescuento"
ORDER BY a."AlquilerId";

-- =========================== APLICAR ============================
BEGIN;

-- Falla (y no aplica nada) si ya se corrió antes
INSERT INTO schema_migrations (nombre) VALUES ('correccion_2026-09-30_recargo_tarjeta');

WITH recargos AS (
  SELECT
    substring(r."RegistroDiarioCajaDetalle" FROM '^Alquiler #([0-9]+) - ')::int AS "AlquilerId",
    r."RegistroDiarioCajaMonto" - ROUND(
      r."RegistroDiarioCajaMonto"
      / CASE WHEN r."RegistroDiarioCajaDetalle" LIKE '%Débito%' THEN 1.03 ELSE 1.05 END
    ) AS recargo
  FROM registrodiariocaja r
  WHERE r."RegistroDiarioCajaDetalle" ~ '^Alquiler #[0-9]+ - Tarjeta (Débito|Crédito)'
    AND NOT EXISTS (
      SELECT 1 FROM alquilerpago ap
      WHERE ap."RegistroDiarioCajaId" = r."RegistroDiarioCajaId"
    )
),
por_alquiler AS (
  SELECT "AlquilerId", SUM(recargo) AS recargo FROM recargos GROUP BY "AlquilerId"
)
UPDATE alquiler a
SET "AlquilerEntrega" = GREATEST(a."AlquilerEntrega" - p.recargo, 0)
FROM por_alquiler p
WHERE a."AlquilerId" = p."AlquilerId";

COMMIT;
