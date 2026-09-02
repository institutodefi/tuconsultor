-- ═══════════════════════════════════════════════════════════════════════════
-- v112 · LAS REGLAS COMERCIALES, VISIBLES Y EDITABLES
--
-- Hasta ahora vivían dentro de `calcEngine.js`: tarifas por nivel, margen,
-- suelo por sistema, descuentos por volumen, descuento por pago único, precio
-- del acompañamiento a auditoría… Cambiar una tarifa exigía tocar código y
-- desplegar.
--
-- Eso tiene dos problemas. El obvio: nadie del equipo comercial puede ajustar
-- un precio. Y el que se nota más tarde: las cifras que fijan lo que se cobra
-- no están a la vista de quien las decide, así que se olvidan y se quedan
-- desactualizadas sin que nadie lo note.
--
-- Aquí pasan a una tabla. El motor las lee de la base y cae a sus constantes si
-- la tabla no está: así el sistema sigue calculando aunque esta migración no se
-- haya aplicado, en lugar de dejar de dar precios.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.reglas_comerciales (
  clave       text primary key,
  valor       numeric(12,4) not null,
  -- Para agrupar en la pantalla y para saber qué mueve cada una.
  grupo       text not null default 'general'
                check (grupo in ('tarifas','margen','descuentos','suelos','servicios','general')),
  etiqueta    text not null,
  descripcion text,
  unidad      text not null default 'numero'
                check (unidad in ('euros','porcentaje','numero','horas')),
  -- Límites de cordura: un margen del 900 % o una tarifa negativa son un error
  -- de tecleo, y sin tope se propagan a todas las ofertas.
  minimo      numeric(12,4),
  maximo      numeric(12,4),
  orden       int not null default 100,
  actualizado timestamptz not null default now(),
  actualizado_por uuid references public.perfiles(id) on delete set null
);

comment on table public.reglas_comerciales is
  'Tarifas, márgenes y descuentos que fijan el precio. Las lee el motor de cálculo; las edita Administración.';

-- ── Los valores actuales del motor ─────────────────────────────────────────
-- Se insertan tal y como están hoy en `calcEngine.js`: aplicar esta migración
-- NO cambia ningún precio.
insert into public.reglas_comerciales (clave, valor, grupo, etiqueta, descripcion, unidad, minimo, maximo, orden) values
  ('tarifa_j1',      30, 'tarifas', 'Tarifa J1',      'Coste por hora de un consultor J1.',            'euros', 10, 300, 10),
  ('tarifa_j2',      40, 'tarifas', 'Tarifa J2',      'Coste por hora de un consultor J2.',            'euros', 10, 300, 20),
  ('tarifa_j3',      55, 'tarifas', 'Tarifa J3',      'Coste por hora de un consultor J3.',            'euros', 10, 300, 30),
  ('tarifa_senior',  75, 'tarifas', 'Tarifa Senior',  'Coste por hora de un consultor Senior.',        'euros', 10, 300, 40),

  ('margen',         60, 'margen',  'Margen',         'Margen sobre el coste. Es lo que separa el coste del precio de venta.', 'porcentaje', 0, 90, 10),
  ('iva',            21, 'margen',  'IVA',            'Impuesto que se repercute. Solo informativo: los precios se expresan sin impuestos.', 'porcentaje', 0, 30, 20),

  ('dto_pago_unico',  5, 'descuentos', 'Pago único',            'Descuento por pagar la implantación de una vez.', 'porcentaje', 0, 30, 10),
  ('dto_volumen_2',   5, 'descuentos', 'Volumen · 2 sistemas',  'Descuento al contratar dos sistemas.',            'porcentaje', 0, 40, 20),
  ('dto_volumen_3',  10, 'descuentos', 'Volumen · 3 sistemas',  'Descuento al contratar tres sistemas.',           'porcentaje', 0, 40, 30),
  ('dto_volumen_4',  15, 'descuentos', 'Volumen · 4 o más',     'Descuento al contratar cuatro o más sistemas.',   'porcentaje', 0, 40, 40),
  ('tope_dto_volumen', 15, 'descuentos', 'Tope de volumen',     'Nunca se baja más de aquí por volumen, sumen los que sumen.', 'porcentaje', 0, 50, 50),

  ('suelo_por_sistema', 350, 'suelos', 'Suelo por sistema', 'Cuota mínima mensual de CADA sistema. Con pocas horas, el precio no baja de aquí.', 'euros', 0, 3000, 10),

  ('acompanamiento_auditoria_dia', 600, 'servicios', 'Acompañamiento a auditoría', 'Precio por jornada. Va siempre aparte del modelo.', 'euros', 0, 3000, 10),
  ('meses_cobrados_adelantado',     11, 'servicios', 'Pago adelantado · meses cobrados', 'Mensualidades que se cobran al pagar el año por adelantado.', 'numero', 1, 12, 20),
  ('meses_servicio_adelantado',     12, 'servicios', 'Pago adelantado · meses de servicio', 'Meses de servicio que se prestan a cambio.', 'numero', 1, 24, 30),

  ('pct_productivo', 70, 'general', 'Porcentaje productivo', 'Parte de la jornada que se dedica a trabajo facturable.', 'porcentaje', 10, 100, 10)
on conflict (clave) do nothing;

-- ── Quién las ve y quién las toca ──────────────────────────────────────────
alter table public.reglas_comerciales enable row level security;

-- Las LEE todo el equipo: saber a qué tarifa se factura una hora es información
-- de trabajo, no un secreto. Y el motor las necesita para calcular.
drop policy if exists rc_lectura on public.reglas_comerciales;
create policy rc_lectura on public.reglas_comerciales for select to authenticated
  using (coalesce(public.mi_rol(), '') in
         ('superadmin','admin','director','consultor','gestion'));

-- Las EDITA Administración. Cambiar una tarifa mueve el precio de todas las
-- ofertas que se preparen a partir de ese momento: es una decisión de negocio.
drop policy if exists rc_escritura on public.reglas_comerciales;
create policy rc_escritura on public.reglas_comerciales for update to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

grant select on public.reglas_comerciales to authenticated;
grant update on public.reglas_comerciales to authenticated;

-- ── Rastro de cambios ──────────────────────────────────────────────────────
-- Si dentro de seis meses una oferta parece rara, hay que poder ver qué valía
-- esa regla el día que se emitió y quién la cambió.
create table if not exists public.reglas_comerciales_historico (
  id          uuid primary key default gen_random_uuid(),
  clave       text not null,
  valor_antes numeric(12,4),
  valor_nuevo numeric(12,4),
  quien       uuid references public.perfiles(id) on delete set null,
  cuando      timestamptz not null default now()
);

create index if not exists rch_clave on public.reglas_comerciales_historico (clave, cuando desc);

alter table public.reglas_comerciales_historico enable row level security;
drop policy if exists rch_lectura on public.reglas_comerciales_historico;
create policy rch_lectura on public.reglas_comerciales_historico for select to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director'));
grant select on public.reglas_comerciales_historico to authenticated;

create or replace function public.registrar_cambio_regla()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.valor is distinct from old.valor then
    insert into public.reglas_comerciales_historico (clave, valor_antes, valor_nuevo, quien)
    values (new.clave, old.valor, new.valor, auth.uid());
    new.actualizado := now();
    new.actualizado_por := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_regla_historico on public.reglas_comerciales;
create trigger trg_regla_historico
  before update on public.reglas_comerciales
  for each row execute function public.registrar_cambio_regla();

notify pgrst, 'reload schema';

select 'v112 aplicada' as ok, count(*) as reglas from public.reglas_comerciales;
