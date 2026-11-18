-- Observaciones del alquiler: pedidos específicos del cliente que no son
-- ajustes de una prenda puntual ("agregar corbata y cinto", "retira el
-- hermano", etc.). Los ajustes por prenda siguen en AlquilerPrendasObservacion.
ALTER TABLE public.alquiler
  ADD COLUMN IF NOT EXISTS "AlquilerObservacion" character varying(500) DEFAULT ''::character varying NOT NULL;
