-- Descuento aplicado al alquiler (voucher). No es un ingreso de caja:
-- Saldo = AlquilerTotal - AlquilerEntrega - AlquilerDescuento
ALTER TABLE public.alquiler
  ADD COLUMN IF NOT EXISTS "AlquilerDescuento" bigint DEFAULT 0 NOT NULL;
