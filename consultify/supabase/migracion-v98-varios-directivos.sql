-- ═══════════════════════════════════════════════════════════════════════════
-- v98 · VARIOS CONTACTOS DIRECTIVOS POR EMPRESA
--
-- Desde v56 los tres roles nombrados —directivo, facturación, proyecto— eran
-- ÚNICOS por empresa:
--
--   create unique index empresa_contactos_rol_unico
--     on empresa_contactos (empresa_id, rol) where rol <> 'secundario';
--
-- Efecto: al asignar un segundo directivo, la interfaz degradaba al primero a
-- «secundario» para no violar el índice. En una empresa con dirección general,
-- dirección de calidad y responsable del sistema, solo una de las tres podía
-- constar como directiva; las demás quedaban mezcladas con los contactos
-- sueltos y se perdía quién manda de verdad.
--
-- Ahora DIRECTIVO admite varios. Facturación y proyecto siguen siendo únicos:
-- ahí la ambigüedad sí es un problema —a quién se manda la factura, con quién
-- se coordina el proyecto— y tener dos obligaría a elegir igualmente.
--
-- Sigue habiendo UN principal por empresa (`empresa_contactos_un_principal`,
-- de v69): es el que sale en los documentos y en la sincronización con Brevo.
-- Varios directivos, uno principal.
-- ═══════════════════════════════════════════════════════════════════════════

drop index if exists public.empresa_contactos_rol_unico;

-- Únicos: facturación y proyecto. Directivo y secundario, los que hagan falta.
create unique index if not exists empresa_contactos_rol_unico
  on public.empresa_contactos (empresa_id, rol)
  where rol in ('facturacion', 'proyecto');

comment on index public.empresa_contactos_rol_unico is
  'Facturación y proyecto: uno por empresa. Directivo y secundario admiten varios.';

-- ── Coherencia del principal ───────────────────────────────────────────────
-- El principal debe ser uno de los directivos: marcar como principal a un
-- contacto de facturación dejaría los documentos firmados por quien no manda.
-- Se corrige lo que hubiera quedado descolocado antes de poner la regla.
update public.empresa_contactos
   set principal = false
 where principal = true and rol <> 'directivo';

-- Y si una empresa se queda sin principal teniendo directivos, se asciende al
-- más antiguo: es el que llevaba más tiempo ocupando ese papel.
with sin_principal as (
  select ec.empresa_id
    from public.empresa_contactos ec
   where ec.rol = 'directivo'
   group by ec.empresa_id
  having count(*) filter (where ec.principal) = 0
), elegido as (
  select distinct on (ec.empresa_id) ec.id
    from public.empresa_contactos ec
    join sin_principal s on s.empresa_id = ec.empresa_id
   where ec.rol = 'directivo'
   order by ec.empresa_id, ec.creado nulls last, ec.id
)
update public.empresa_contactos ec
   set principal = true
  from elegido e
 where ec.id = e.id;

notify pgrst, 'reload schema';

select 'v98 aplicada' as ok,
       count(*) filter (where rol = 'directivo') as directivos,
       count(distinct empresa_id) filter (where principal) as empresas_con_principal
  from public.empresa_contactos;
