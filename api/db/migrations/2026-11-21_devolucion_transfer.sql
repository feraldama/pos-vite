-- Devolución por transferencia: egreso que no sale del cajón. Hasta ahora el
-- POS la guardaba como DEVOLUCIÓN (1, 5) igual que la de efectivo, y el
-- cierre de caja la restaba del efectivo esperado (sobrante falso).
INSERT INTO public.tipogastogrupo ("TipoGastoId", "TipoGastoGrupoId", "TipoGastoGrupoDescripcion")
VALUES (1, 6, 'DEVOLUCIÓN TRANSFER')
ON CONFLICT ("TipoGastoId", "TipoGastoGrupoId") DO NOTHING;

-- Las ya guardadas: el POS les pone el detalle
-- "Devolución Venta #<id> - Transferencia" (ver confirmarDevolucion)
UPDATE public.registrodiariocaja
SET "TipoGastoGrupoId" = 6
WHERE "TipoGastoId" = 1
  AND "TipoGastoGrupoId" = 5
  AND "RegistroDiarioCajaDetalle" LIKE 'Devolución Venta #% - Transferencia';
