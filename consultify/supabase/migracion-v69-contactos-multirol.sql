-- ═══════════════════════════════════════════════════════════════════════════
-- v69 · UNA PERSONA, VARIOS ROLES EN LA MISMA EMPRESA
--
-- `empresa_contactos` tenía `unique (empresa_id, contacto_id)`: cada persona
-- solo podía ocupar un rol. En una pyme eso no se sostiene — la misma persona
-- es quien manda, quien firma las facturas y quien está en el proyecto.
--
-- La clave pasa a ser (empresa, contacto, ROL): la misma persona puede estar
-- como directiva y de facturación a la vez, sin duplicar su ficha.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.empresa_contactos drop constraint if exists empresa_contactos_empresa_id_contacto_id_key;
drop index if exists empresa_contactos_empresa_id_contacto_id_key;

-- Por si acaso existe con otro nombre
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.empresa_contactos'::regclass and contype = 'u'
       and pg_get_constraintdef(oid) = 'UNIQUE (empresa_id, contacto_id)'
  loop
    execute format('alter table public.empresa_contactos drop constraint %I', r.conname);
  end loop;
end $$;

create unique index if not exists empresa_contactos_unico
  on public.empresa_contactos (empresa_id, contacto_id, rol);

-- Solo puede haber UN principal por empresa. Antes se confiaba en la interfaz.
drop index if exists empresa_contactos_un_principal;
create unique index empresa_contactos_un_principal
  on public.empresa_contactos (empresa_id) where principal;

comment on index empresa_contactos_unico is
  'Una persona puede ocupar varios roles en la misma empresa, pero no el mismo dos veces.';

notify pgrst, 'reload schema';

select 'v69 aplicada' as ok;
