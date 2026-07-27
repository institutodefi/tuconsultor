-- ═══════════════════════════════════════════════════════════════════════════
-- v61 · AUDITORÍA INTERNA DE ACCESIBILIDAD PERMANENTE
--
-- Checklist de UNE 139803:2012 (61 criterios: A, AA y AAA) con, para cada uno:
--   · si es APLICABLE al sitio y, si no lo es, por qué
--   · con qué MÉTODO se ha verificado
--   · en qué ESTADO está y con qué evidencia
--   · quién lo revisó y cuándo
--
-- La declaración de accesibilidad que exige el RD 1112/2018 se sostiene en esto:
-- sin registro de método y fecha, una declaración de conformidad no se sostiene
-- ante una revisión. Los criterios NO aplicables necesitan justificación escrita:
-- es lo primero que se mira en una revisión externa.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.accesibilidad_criterios (
  codigo      text primary key,
  titulo      text not null,
  nivel       text not null check (nivel in ('A','AA','AAA')),
  principio   text not null,

  -- Aplicabilidad: null = sin decidir todavía
  aplicable   boolean,
  justificacion text,                      -- obligatoria si aplicable = false

  -- Verificación
  metodos     text[] default '{}',        -- manual, automatico, lector, teclado, contraste, usuarios
  estado      text not null default 'pendiente'
                check (estado in ('pendiente','cumple','parcial','no_cumple')),
  observaciones text,
  evidencia   text,                        -- enlace o referencia de la prueba

  revisado_por uuid references public.perfiles(id) on delete set null,
  revisado_en  timestamptz,
  updated_at   timestamptz not null default now()
);

create index if not exists accesibilidad_nivel_idx on public.accesibilidad_criterios (nivel, codigo);

-- Un criterio marcado como NO aplicable sin justificación no vale: se bloquea.
alter table public.accesibilidad_criterios drop constraint if exists accesibilidad_justifica_no_aplicable;
alter table public.accesibilidad_criterios add constraint accesibilidad_justifica_no_aplicable check (
  aplicable is not false or (justificacion is not null and btrim(justificacion) <> '')
);

-- Los nueve requisitos de conformidad de WCAG 2.0, que se evalúan aparte de los
-- criterios: sin ellos no hay conformidad aunque todos los criterios cumplan.
create table if not exists public.accesibilidad_conformidad (
  codigo      text primary key,
  requisito   text not null,
  verificacion text,
  estado      text not null default 'pendiente'
                check (estado in ('pendiente','cumple','parcial','no_cumple')),
  observaciones text,
  updated_at  timestamptz not null default now()
);

create or replace function public.accesibilidad_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists accesibilidad_touch on public.accesibilidad_criterios;
create trigger accesibilidad_touch before update on public.accesibilidad_criterios
  for each row execute function public.accesibilidad_touch();
drop trigger if exists conformidad_touch on public.accesibilidad_conformidad;
create trigger conformidad_touch before update on public.accesibilidad_conformidad
  for each row execute function public.accesibilidad_touch();

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
alter table public.accesibilidad_criterios enable row level security;
alter table public.accesibilidad_conformidad enable row level security;

do $$
declare t text;
begin
  foreach t in array array['accesibilidad_criterios','accesibilidad_conformidad'] loop
    execute format('drop policy if exists %I_lectura on public.%I', t, t);
    execute format('create policy %I_lectura on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_escritura on public.%I', t, t);
    execute format($f$
      create policy %I_escritura on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                       and p.rol in ('superadmin','admin','director')))
      with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                       and p.rol in ('superadmin','admin','director')))
    $f$, t, t);
  end loop;
end $$;

-- ═══ SEMILLA ═══════════════════════════════════════════════════════════════
-- Del checklist de UNE 139803:2012. `on conflict do nothing` para poder volver a
-- ejecutarla sin borrar lo ya evaluado.
insert into public.accesibilidad_criterios (codigo, titulo, nivel, principio) values
  ('1.1.1', 'Contenido no textual', 'A', 'Perceptible'),
  ('1.2.1', 'Sólo audio y sólo vídeo (grabado)', 'A', 'Perceptible'),
  ('1.2.2', 'Subtítulos (grabados)', 'A', 'Perceptible'),
  ('1.2.3', 'Audiodescripción o medio alternativo (grabado)', 'A', 'Perceptible'),
  ('1.3.1', 'Información y relaciones', 'A', 'Perceptible'),
  ('1.3.2', 'Secuencia significativa', 'A', 'Perceptible'),
  ('1.3.3', 'Características sensoriales', 'A', 'Perceptible'),
  ('1.4.1', 'Uso del color', 'A', 'Perceptible'),
  ('1.4.2', 'Control del audio', 'A', 'Perceptible'),
  ('2.1.1', 'Teclado', 'A', 'Operable'),
  ('2.1.2', 'Sin trampas para el foco del teclado', 'A', 'Operable'),
  ('2.2.1', 'Tiempo ajustable', 'A', 'Operable'),
  ('2.2.2', 'Poner en pausa, detener, ocultar', 'A', 'Operable'),
  ('2.3.1', 'Umbral de tres destellos o menos', 'A', 'Operable'),
  ('2.4.1', 'Evitar bloques', 'A', 'Operable'),
  ('2.4.2', 'Titulado de páginas', 'A', 'Operable'),
  ('2.4.3', 'Orden del foco', 'A', 'Operable'),
  ('2.4.4', 'Propósito de los enlaces (en contexto)', 'A', 'Operable'),
  ('3.1.1', 'Idioma de la página', 'A', 'Comprensible'),
  ('3.2.1', 'Al recibir el foco', 'A', 'Comprensible'),
  ('3.2.2', 'Al recibir entradas', 'A', 'Comprensible'),
  ('3.3.1', 'Identificación de errores', 'A', 'Comprensible'),
  ('3.3.2', 'Etiquetas o instrucciones', 'A', 'Comprensible'),
  ('4.1.1', 'Procesamiento', 'A', 'Robusto'),
  ('4.1.2', 'Nombre, función, valor', 'A', 'Robusto'),
  ('1.2.4', 'Subtítulos (en directo)', 'AA', 'Perceptible'),
  ('1.2.5', 'Audiodescripción (grabado)', 'AA', 'Perceptible'),
  ('1.4.3', 'Contraste (mínimo)', 'AA', 'Perceptible'),
  ('1.4.4', 'Cambio de tamaño del texto', 'AA', 'Perceptible'),
  ('1.4.5', 'Imágenes de texto', 'AA', 'Perceptible'),
  ('2.4.5', 'Múltiples vías', 'AA', 'Operable'),
  ('2.4.6', 'Encabezados y etiquetas', 'AA', 'Operable'),
  ('2.4.7', 'Foco visible', 'AA', 'Operable'),
  ('3.1.2', 'Idioma de las partes', 'AA', 'Comprensible'),
  ('3.2.3', 'Navegación coherente', 'AA', 'Comprensible'),
  ('3.2.4', 'Identificación coherente', 'AA', 'Comprensible'),
  ('3.3.3', 'Sugerencias ante errores', 'AA', 'Comprensible'),
  ('3.3.4', 'Prevención de errores (legales, financieros, datos)', 'AA', 'Comprensible'),
  ('1.2.6', 'Lengua de señas (grabado)', 'AAA', 'Perceptible'),
  ('1.2.7', 'Audiodescripción ampliada (grabada)', 'AAA', 'Perceptible'),
  ('1.2.8', 'Medio alternativo (grabado)', 'AAA', 'Perceptible'),
  ('1.2.9', 'Sólo audio (en directo)', 'AAA', 'Perceptible'),
  ('1.4.6', 'Contraste (mejorado)', 'AAA', 'Perceptible'),
  ('1.4.7', 'Sonido de fondo bajo o ausente', 'AAA', 'Perceptible'),
  ('1.4.8', 'Presentación visual', 'AAA', 'Perceptible'),
  ('1.4.9', 'Imágenes de texto (sin excepciones)', 'AAA', 'Perceptible'),
  ('2.1.3', 'Teclado (sin excepciones)', 'AAA', 'Operable'),
  ('2.2.3', 'Sin tiempo', 'AAA', 'Operable'),
  ('2.2.4', 'Interrupciones', 'AAA', 'Operable'),
  ('2.2.5', 'Re-autentificación', 'AAA', 'Operable'),
  ('2.3.2', 'Tres destellos', 'AAA', 'Operable'),
  ('2.4.8', 'Ubicación', 'AAA', 'Operable'),
  ('2.4.9', 'Propósito de los enlaces (sólo enlaces)', 'AAA', 'Operable'),
  ('2.4.10', 'Encabezados de sección', 'AAA', 'Operable'),
  ('3.1.3', 'Palabras inusuales', 'AAA', 'Comprensible'),
  ('3.1.4', 'Abreviaturas', 'AAA', 'Comprensible'),
  ('3.1.5', 'Nivel de lectura', 'AAA', 'Comprensible'),
  ('3.1.6', 'Pronunciación', 'AAA', 'Comprensible'),
  ('3.2.5', 'Cambios a petición', 'AAA', 'Comprensible'),
  ('3.3.5', 'Ayuda', 'AAA', 'Comprensible'),
  ('3.3.6', 'Prevención de errores (todos)', 'AAA', 'Comprensible')
on conflict (codigo) do nothing;

insert into public.accesibilidad_conformidad (codigo, requisito, verificacion) values
  ('C1', 'Nivel de conformidad', 'Se cumplen todos los criterios del nivel declarado (y niveles inferiores) o existen versiones alternativas conformes'),
  ('C2', 'Páginas completas', 'La conformidad se evalúa sobre páginas completas, sin excluir partes del contenido'),
  ('C3', 'Procesos completos', 'Todas las páginas de un proceso (compra, registro, matrícula…) son conformes'),
  ('C4', 'Tecnologías compatibles con la accesibilidad', 'Solo se depende de tecnologías usadas de forma compatible con la accesibilidad'),
  ('C5', 'Sin interferencia', 'Las tecnologías no compatibles no bloquean el acceso al resto de la página'),
  ('Declaración de conformidad (apartado 5.2) — elementos obligatorios', '', ''),
  ('Técnicas y fallos de accesibilidad (capítulo 6)', '', ''),
  ('6.1', 'Tener en cuenta las técnicas suficientes documentadas por el W3C (documento de técnicas de WCAG 2.0)', 'Recomendación (debería)'),
  ('6.2', 'Evitar los fallos comunes de accesibilidad documentados por el W3C', 'Obligatorio (debe)')
on conflict (codigo) do nothing;

notify pgrst, 'reload schema';

select nivel, count(*) as criterios from public.accesibilidad_criterios group by nivel order by nivel;
