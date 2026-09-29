-- Ajustes manuales de lo entregado (editar "Entrega" en /alquileres): quedan
-- registrados en alquilerpago como tipo AJUSTE, así la suma de los pagos del
-- alquiler sigue coincidiendo con AlquilerEntrega. Un ajuste puede ser
-- negativo (corrige una entrega cargada de más).
ALTER TABLE public.alquilerpago
  ADD COLUMN IF NOT EXISTS "AlquilerPagoTipo" varchar(10) NOT NULL DEFAULT 'PAGO';

ALTER TABLE public.alquilerpago
  DROP CONSTRAINT IF EXISTS "alquilerpago_AlquilerPagoMonto_check";

ALTER TABLE public.alquilerpago
  DROP CONSTRAINT IF EXISTS alquilerpago_monto_tipo_check;

-- Un pago siempre suma; un ajuste puede sumar o restar, pero no ser 0
ALTER TABLE public.alquilerpago
  ADD CONSTRAINT alquilerpago_monto_tipo_check CHECK (
    ("AlquilerPagoTipo" = 'PAGO' AND "AlquilerPagoMonto" > 0)
    OR ("AlquilerPagoTipo" = 'AJUSTE' AND "AlquilerPagoMonto" <> 0)
  );
