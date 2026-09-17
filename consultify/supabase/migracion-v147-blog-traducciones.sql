-- ════════════════════════════════════════════════════════════════════════════
-- v147 · Blog multiidioma
--
-- Tabla aparte y no columnas nuevas en `blog_tuconsultor`: el artículo es uno y
-- sus traducciones son N, y así traducir nunca toca el original. `huella` es la
-- firma del texto español en el momento de traducir: si el artículo se edita
-- después, deja de cuadrar y el lote sabe que hay que rehacer esa traducción.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists blog_traducciones (
  id bigserial primary key,
  slug text not null references blog_tuconsultor(slug) on delete cascade on update cascade,
  idioma text not null check (idioma in ('en','fr','de','ar')),
  titulo text not null, extracto text, contenido text not null,
  huella text, modelo text,
  creado timestamptz default now(), updated_at timestamptz default now(),
  unique (slug, idioma)
);
create index if not exists blog_traducciones_idioma on blog_traducciones (idioma);
alter table blog_traducciones enable row level security;

-- Una traducción no puede verse antes que su original.
create policy blog_trad_lectura_publica on blog_traducciones for select
  using (exists (select 1 from blog_tuconsultor b
                  where b.slug = blog_traducciones.slug
                    and b.fecha_publicacion <= current_date));
create policy blog_trad_escritura_equipo on blog_traducciones for all
  using (mi_rol() = any (array['superadmin','admin','consultor','gestion']))
  with check (mi_rol() = any (array['superadmin','admin','consultor','gestion']));

-- Lo que leen las páginas: original y traducciones en una sola consulta.
create or replace view blog_publico with (security_invoker = off) as
  select b.slug, 'es'::text as idioma, b.titulo, b.extracto, b.contenido,
         b.imagen, b.serie, b.fecha_publicacion
    from blog_tuconsultor b where b.fecha_publicacion <= current_date
  union all
  select t.slug, t.idioma, t.titulo, t.extracto, t.contenido,
         b.imagen, b.serie, b.fecha_publicacion
    from blog_traducciones t join blog_tuconsultor b on b.slug = t.slug
   where b.fecha_publicacion <= current_date;
grant select on blog_publico to anon, authenticated;
