-- ═══════════════════════════════════════════════════════════════════════════
-- v79 · PONER `presupuestos` AL DÍA, DE UNA VEZ
--
-- Diagnóstico: en la tabla hay UNA sola oferta. No es un problema de lectura,
-- es que no se guardan. Reproducida la tabla y probado el alta real, aparecen
-- dos causas:
--
--  1 · Faltan columnas. Entre la v98 y la v133 el generador pasó a guardar la
--      complejidad, las sedes, el equipo, las fases contratadas, los ajustes,
--      las notas, la forma de pago y el nombre y los apellidos por separado.
--      Cada una vino en su migración y basta con no haber ejecutado una para
--      que el alta falle.
--
--  2 · `email` es NOT NULL. Al ofertar a un cliente del CRM cuyo contacto no
--      tiene correo, el alta se cae entera. Un correo es deseable, pero lo que
--      identifica una oferta es su número, no el correo.
--
-- Esta migración es acumulativa e idempotente: se puede ejecutar aunque ya
-- hayas aplicado la v74, la v75, la v76 o la v77. Añade lo que falte y nada más.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Todas las columnas que el generador escribe hoy ──
alter table public.presupuestos
  add column if not exists cif                text,
  add column if not exists cargo              text,
  add column if not exists comercial          text,
  add column if not exists requerimiento      text,
  add column if not exists numero_oferta      text,
  add column if not exists url_pdf            text,
  add column if not exists url_pptx           text,
  add column if not exists complejidad        text,
  add column if not exists sedes              integer default 1,
  add column if not exists equipo             jsonb,
  add column if not exists fases_plan         jsonb,
  add column if not exists forma_pago         text,
  add column if not exists modelo_mantenimiento text,
  add column if not exists empresa_id         uuid,
  add column if not exists contacto_id        uuid,
  add column if not exists precio_catalogo    integer,
  add column if not exists ajuste_oferta      numeric(12,2) not null default 0,
  add column if not exists notas_oferta       text,
  add column if not exists notas_internas     text,
  add column if not exists contacto_nombre    text,
  add column if not exists contacto_apellidos text;

-- Las restricciones se ponen aparte y sin romper si ya existen.
alter table public.presupuestos drop constraint if exists presupuestos_complejidad_check;
alter table public.presupuestos add constraint presupuestos_complejidad_check
  check (complejidad is null or complejidad in ('baja','media','alta'));

alter table public.presupuestos drop constraint if exists presupuestos_forma_pago_check;
alter table public.presupuestos add constraint presupuestos_forma_pago_check
  check (forma_pago is null or forma_pago in ('unico','dos'));

alter table public.presupuestos drop constraint if exists presupuestos_tipo_check;
alter table public.presupuestos add constraint presupuestos_tipo_check
  check (tipo in ('mes','bolsa','proyecto'));

-- ── 2 · El correo deja de ser obligatorio ──
-- Ofertar a un cliente cuyo contacto aún no tiene correo es normal. Perder la
-- oferta entera por eso, no.
alter table public.presupuestos alter column email drop not null;

-- ── 3 · Comprobación con el alta real ──
-- Se inserta una fila con TODOS los campos que manda el generador y se borra.
-- Si esto pasa, el alta desde la aplicación también pasará.
do $$
declare e text; ok boolean := true;
begin
  begin
    insert into public.presupuestos (
      empresa, nombre, email, telefono, cif, cargo, normas, modelo, precio, tipo,
      numero_oferta, comercial, requerimiento, contacto_nombre, contacto_apellidos,
      complejidad, sedes, equipo, fases_plan, precio_catalogo, ajuste_oferta,
      notas_oferta, notas_internas, forma_pago, modelo_mantenimiento)
    values (
      'PRUEBA v79', 'Nombre Apellidos', null, null, 'B00000000', 'Cargo',
      '{igualdad}', 'Implantación', 9875, 'proyecto',
      '__PRUEBA_V79__', 'Alejandro', null, 'Nombre', 'Apellidos',
      'media', 1, '{"Senior":1}'::jsonb, '{"igualdad":["1","2"]}'::jsonb, 9875, 0,
      'Nota que sí sale', 'Nota que no sale', 'unico', 'Implicación');
  exception when others then
    ok := false;
    get stacked diagnostics e = message_text;
    raise notice '✗ EL ALTA SIGUE FALLANDO: %', e;
  end;

  delete from public.presupuestos where numero_oferta = '__PRUEBA_V79__';
  if ok then
    raise notice '✓ El alta con todos los campos funciona. El generador ya puede guardar.';
  end if;

  raise notice '--- ofertas en el histórico: % ---', (select count(*) from public.presupuestos);
end $$;

notify pgrst, 'reload schema';

select 'v79 aplicada' as ok;
