-- ════════════════════════════════════════════════════════════════════════════
-- v140 · CONTACTOS · perfil de LinkedIn, fuente de los datos y deber de información
--
-- Con el buscador con IA (fuentes públicas) entran contactos que no nos han
-- dado sus datos. Hay que saber de dónde salieron y cuándo se les informó
-- (art. 14 RGPD). Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.contactos
  add column if not exists linkedin_url text,
  add column if not exists fuente_datos text,
  add column if not exists informado_art14_en timestamptz;

comment on column public.contactos.linkedin_url is 'Perfil público de LinkedIn.';
comment on column public.contactos.fuente_datos is 'De dónde salieron los datos cuando no los dio la persona (búsqueda IA en fuentes públicas, tarjeta, referencia…).';
comment on column public.contactos.informado_art14_en is 'Cuándo se informó a la persona de que tenemos sus datos y de dónde salen (art. 14 RGPD).';

notify pgrst, 'reload schema';
select 'v140 aplicada' as ok;
