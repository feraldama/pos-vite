-- Descuento aplicado a la venta (voucher). No es un ingreso de caja:
-- Saldo = Total - VentaEntrega - VentaDescuento
ALTER TABLE public.venta
  ADD COLUMN IF NOT EXISTS "VentaDescuento" bigint DEFAULT 0 NOT NULL;
