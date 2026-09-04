-- ═══════════════════════════════════════════════════════════════════════════
-- v100 · LOS PRECIOS ADMITEN CÉNTIMOS
--
-- Error en producción al guardar una oferta:
--
--   invalid input syntax for type integer: "537.3"
--
-- `presupuestos.precio` y las columnas de precio de `proyectos` son `int`, de
-- cuando todo importe salía redondeado al escalón de 25 €. Desde la v207 el
-- precio de los modelos recurrentes se forma sumando cada sistema y aplicando
-- un descuento por volumen del 5, 10 o 15 %: ese porcentaje **produce decimales
-- casi siempre**. 596,67 − 10 % = 537,00; otras combinaciones dan 537,30.
--
-- La alternativa era redondear en la aplicación, pero eso significa que la
-- oferta enseña un importe y la base guarda otro. Un céntimo de diferencia
-- entre lo ofertado y lo facturado es justo el tipo de detalle que un cliente
-- detecta y que obliga a dar explicaciones.
--
-- `contratos.importe` ya era `numeric(12,2)` desde la v83. Esto alinea las
-- demás: el importe de un contrato y el de la oferta de la que nace deben poder
-- ser exactamente el mismo número.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Ofertas ────────────────────────────────────────────────────────────────
alter table public.presupuestos
  alter column precio type numeric(12,2) using precio::numeric(12,2);

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'presupuestos'
                and column_name = 'precio_catalogo') then
    alter table public.presupuestos
      alter column precio_catalogo type numeric(12,2) using precio_catalogo::numeric(12,2);
  end if;
end $$;

comment on column public.presupuestos.precio is
  'Importe ofertado, con céntimos. El descuento por volumen (5/10/15 %) casi nunca da un entero.';

-- ── Proyectos ──────────────────────────────────────────────────────────────
-- Mismo motivo: el precio del proyecto sale de la oferta que lo originó.
do $$
declare t text; c text;
begin
  foreach t in array array['proyectos', 'proyectos_cliente'] loop
    foreach c in array array['precio_mes', 'precio_total'] loop
      if exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = t and column_name = c) then
        execute format('alter table public.%I alter column %I type numeric(12,2) using %I::numeric(12,2)', t, c, c);
      end if;
    end loop;
  end loop;
end $$;

notify pgrst, 'reload schema';

select 'v100 aplicada' as ok,
       (select data_type from information_schema.columns
         where table_schema = 'public' and table_name = 'presupuestos' and column_name = 'precio') as tipo_precio;
