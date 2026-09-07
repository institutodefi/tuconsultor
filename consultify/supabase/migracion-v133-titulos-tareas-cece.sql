-- =============================================================================
-- MIGRACIÓN v133 · Nombre de las tareas de CECE sin la razón social delante
--
-- Las 65 tareas de CECE se volcaron con el título antiguo
--   «CONFEDERACIÓN ESPAÑOLA DE CENTROS DE ENSEÑANZA (CECE) - 9001 - PE1 … - S1 PE1 …»
-- (razón social - norma - proceso - subproceso). DICS y FGUP, y todo lo que
-- se vuelca ahora, llevan solo el subproceso: el cliente y la norma ya van en
-- el código (CECE-9001-03) y en sus columnas, y en pantalla el nombre
-- comercial va delante del código. Se deja igual que el resto.
--
-- Después de v132. Idempotente: solo toca títulos con el formato largo que
-- terminan en su propio subproceso.
-- =============================================================================
begin;

update public.cliente_tareas
   set titulo = subproceso
 where subproceso is not null and subproceso <> ''
   and titulo like '% - % - %'
   and upper(titulo) like '% - ' || upper(subproceso);

commit;
