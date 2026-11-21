-- TipoGastoCantGastos es el contador con el que tipogastogrupo.model.create
-- arma el id del grupo nuevo (contador + 1). En EGRESOS quedó atrasado (4,
-- con grupos hasta 5 y ahora 6 por DEVOLUCIÓN TRANSFER): crear un grupo desde
-- la pantalla chocaba con la clave. Se lleva al máximo grupo existente.
UPDATE public.tipogasto t
SET "TipoGastoCantGastos" = g.maximo
FROM (
  SELECT "TipoGastoId", MAX("TipoGastoGrupoId") AS maximo
  FROM public.tipogastogrupo
  GROUP BY "TipoGastoId"
) g
WHERE g."TipoGastoId" = t."TipoGastoId"
  AND t."TipoGastoCantGastos" < g.maximo;
