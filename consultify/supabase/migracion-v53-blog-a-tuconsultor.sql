-- ═══ MIGRACIÓN v53 · Blog de Consultify → blog de TuConsultor ═══
-- Copia los artículos de blog_posts (Consultify) a blog_tuconsultor y deja
-- el blog de Consultify retirado (la web redirige a www.tuconsultor.com/blog).
insert into public.blog_tuconsultor (slug, titulo, extracto, contenido, imagen, serie, fecha_publicacion)
select slug, coalesce(titulo, slug), extracto, coalesce(contenido_html, ''),
       'https://www.tuconsultor.com/social-img/' || slug || '.png',
       'NORMAS', fecha_publicacion
from public.blog_posts
where coalesce(estado,'') <> 'borrador'
on conflict (slug) do nothing;

select count(*) as migrados from public.blog_tuconsultor;
