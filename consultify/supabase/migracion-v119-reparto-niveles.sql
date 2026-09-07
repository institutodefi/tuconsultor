-- ═══════════════════════════════════════════════════════════════════════════
-- v119 · REPARTO DE LA CARGA POR NIVEL EN LA OFERTA
--
-- Va detrás de la v118. Al ofertar se puede fijar qué porcentaje del trabajo
-- hará cada nivel (J1, J2, J3, Senior) en vez del reparto automático por
-- norma. Se guarda con la oferta para que el informe de rentabilidad y la
-- regeneración del documento usen el mismo reparto que se vio en pantalla.
--
--   {"J1": 60, "J2": 0, "J3": 0, "Senior": 40}   · null = automático
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists reparto_niveles jsonb;

comment on column public.presupuestos.reparto_niveles is
  'Reparto manual de la carga por nivel en % ({J1,J2,J3,Senior}, suma 100). Null = reparto automático por norma.';

notify pgrst, 'reload schema';

select 'v119 aplicada' as ok;
select column_name from information_schema.columns
 where table_name = 'presupuestos' and column_name = 'reparto_niveles';   -- 1 fila
