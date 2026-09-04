-- ═══════════════════════════════════════════════════════════════════════════
-- v89 · PUNTUACIÓN DE HOMOLOGACIÓN + TIPOS DE SERVICIO
--
-- 1 · Cada condición se puntúa de 0 a 10. La nota de la homologación es la
--     MEDIA PONDERADA: las obligatorias pesan el doble que las opcionales.
--     Sin ponderar, un proveedor con diez opcionales bordadas y la obligatoria
--     regular saldría mejor que otro impecable en lo que importa.
--
-- 2 · Los tipos de servicio salen de una lista cerrada. Escritos a mano acaban
--     en «Formación», «formacion» y «Form.» como tres cosas distintas, y
--     entonces no se puede buscar «quién nos da formación».
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Puntuación por condición ───────────────────────────────────────────
alter table public.homologacion_condiciones
  add column if not exists puntuacion numeric(4,2),
  add column if not exists peso numeric(4,2);

alter table public.homologacion_condiciones drop constraint if exists condiciones_puntuacion_chk;
alter table public.homologacion_condiciones add constraint condiciones_puntuacion_chk
  check (puntuacion is null or (puntuacion >= 0 and puntuacion <= 10));

comment on column public.homologacion_condiciones.puntuacion is
  'De 0 a 10. Vacía = no evaluada, que NO es lo mismo que un cero.';
comment on column public.homologacion_condiciones.peso is
  'Peso propio. Si está vacío: 2 en las obligatorias, 1 en las opcionales.';

alter table public.homologaciones_norma
  add column if not exists nota numeric(4,2);

/** Nota de una homologación: media ponderada de lo evaluado. */
create or replace function public.nota_homologacion(p_id uuid)
returns numeric language sql stable as $$
  select case when sum(coalesce(peso, case when obligatoria then 2 else 1 end)) > 0
              then round(sum(puntuacion * coalesce(peso, case when obligatoria then 2 else 1 end))
                       / sum(coalesce(peso, case when obligatoria then 2 else 1 end)), 2)
         end
    from public.homologacion_condiciones
   where homologacion_id = p_id and puntuacion is not null;
$$;

grant execute on function public.nota_homologacion(uuid) to authenticated;

-- La nota se guarda al vuelo: así el listado de proveedores no tiene que
-- recalcularla para cada fila.
create or replace function public.refrescar_nota_homologacion()
returns trigger language plpgsql as $$
declare hid uuid;
begin
  hid := coalesce(new.homologacion_id, old.homologacion_id);
  update public.homologaciones_norma set nota = public.nota_homologacion(hid) where id = hid;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_nota_homologacion on public.homologacion_condiciones;
create trigger trg_nota_homologacion
  after insert or update or delete on public.homologacion_condiciones
  for each row execute function public.refrescar_nota_homologacion();

-- ── 2 · Tipos de servicio ──────────────────────────────────────────────────
create table if not exists public.tipos_servicio (
  id      text primary key,
  nombre  text not null,
  familia text not null,
  critico boolean not null default false,   -- afecta a la calidad del servicio al cliente
  orden   int not null default 100,
  activo  boolean not null default true
);

comment on column public.tipos_servicio.critico is
  'Un proveedor crítico influye en lo que recibe el cliente final. La 9001 exige controlarlos más de cerca.';

insert into public.tipos_servicio (id, nombre, familia, critico, orden) values
  -- Los que tocan directamente al servicio que recibe el cliente
  ('consultoria',     'Consultoría especializada',        'Servicio profesional', true, 10),
  ('auditoria',       'Auditoría y certificación',        'Servicio profesional', true, 20),
  ('formacion',       'Formación',                        'Servicio profesional', true, 30),
  ('juridico',        'Asesoría jurídica',                'Servicio profesional', true, 40),
  ('laboral',         'Asesoría laboral y RRHH',          'Servicio profesional', true, 50),
  ('fiscal',          'Gestoría fiscal y contable',       'Servicio profesional', true, 60),
  ('prl',             'Prevención de riesgos laborales',  'Servicio profesional', true, 70),
  ('proteccion_datos','Protección de datos y DPD',        'Servicio profesional', true, 80),
  ('traduccion',      'Traducción e interpretación',      'Servicio profesional', false, 90),
  ('laboratorio',     'Laboratorio, ensayos y calibración','Servicio profesional', true, 100),

  -- Tecnología
  ('software',        'Desarrollo de software',           'Tecnología', true, 110),
  ('nube',            'Alojamiento y servicios en la nube','Tecnología', true, 120),
  ('ciberseguridad',  'Ciberseguridad',                   'Tecnología', true, 130),
  ('soporte_it',      'Soporte informático',              'Tecnología', false, 140),
  ('equipamiento_it', 'Equipamiento informático',         'Tecnología', false, 150),
  ('telecomunicaciones','Telecomunicaciones',             'Tecnología', false, 160),

  -- Comunicación
  ('marketing',       'Marketing y comunicación',         'Comunicación', false, 170),
  ('diseno',          'Diseño gráfico y marca',           'Comunicación', false, 180),
  ('audiovisual',     'Producción audiovisual',           'Comunicación', false, 190),
  ('imprenta',        'Imprenta y artes gráficas',        'Comunicación', false, 200),

  -- Instalaciones y operación
  ('limpieza',        'Limpieza',                         'Instalaciones', false, 210),
  ('mantenimiento',   'Mantenimiento de instalaciones',   'Instalaciones', false, 220),
  ('seguridad',       'Seguridad y vigilancia',           'Instalaciones', false, 230),
  ('residuos',        'Gestión de residuos',              'Instalaciones', true, 240),
  ('suministros',     'Suministros de oficina',           'Instalaciones', false, 250),
  ('alquiler',        'Alquiler de espacios',             'Instalaciones', false, 260),

  -- Apoyo
  ('mensajeria',      'Mensajería y paquetería',          'Apoyo', false, 270),
  ('viajes',          'Viajes y desplazamientos',         'Apoyo', false, 280),
  ('catering',        'Catering y eventos',               'Apoyo', false, 290),
  ('seguros',         'Seguros',                          'Apoyo', false, 300),
  ('banca',           'Servicios financieros',            'Apoyo', false, 310),
  ('otros',           'Otros',                            'Apoyo', false, 999)
on conflict (id) do update
  set nombre = excluded.nombre, familia = excluded.familia,
      critico = excluded.critico, orden = excluded.orden;

-- ── 3 · Qué nos presta cada proveedor ──────────────────────────────────────
create table if not exists public.empresa_servicios (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  servicio_id text not null references public.tipos_servicio(id) on delete restrict,
  notas       text,
  desde       date default current_date,
  creado      timestamptz not null default now(),
  unique (empresa_id, servicio_id)
);
create index if not exists empresa_servicios_empresa on public.empresa_servicios (empresa_id);
create index if not exists empresa_servicios_tipo on public.empresa_servicios (servicio_id);

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
alter table public.tipos_servicio enable row level security;
alter table public.empresa_servicios enable row level security;

drop policy if exists tipos_lectura on public.tipos_servicio;
create policy tipos_lectura on public.tipos_servicio for select to authenticated using (true);
drop policy if exists tipos_escritura on public.tipos_servicio;
create policy tipos_escritura on public.tipos_servicio for all to authenticated
  using (coalesce(public.mi_rol(),'') in ('superadmin','admin'))
  with check (coalesce(public.mi_rol(),'') in ('superadmin','admin'));

drop policy if exists es_todo on public.empresa_servicios;
create policy es_todo on public.empresa_servicios for all to authenticated
  using (coalesce(public.mi_rol(),'') in ('superadmin','admin','director','consultor','gestion'))
  with check (coalesce(public.mi_rol(),'') in ('superadmin','admin','director','consultor','gestion'));

grant select on public.tipos_servicio to authenticated;
grant select, insert, update, delete on public.empresa_servicios, public.tipos_servicio to authenticated;

notify pgrst, 'reload schema';

select 'v89 aplicada' as ok;
