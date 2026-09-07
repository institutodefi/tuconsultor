# Cambios v279 · 7 de septiembre de 2026

## Órbita · Control de horas por consultor
- `consultify/app/src/portal/consultores/ControlHoras.jsx` · **pantalla nueva** (`/consultores/control-horas`, menú «Agendas › Control de horas»). Una ficha por consultor: proyectos asignados y, por cada uno, horas comprometidas, programadas, ejecutadas, pendientes y sin programar; total; carga mensual exigida (pendientes ÷ meses que quedan) frente a la capacidad de producción del mes; veredicto «le entra otro proyecto / va justo / sin capacidad»; barras de las tres bolsas del mes. Dirección y administración ven a todo el equipo; consultoría, su ficha.
- `consultify/app/src/lib/controlHoras.js` · el cálculo, en funciones puras. Reparto de las horas de un proyecto entre su equipo (tarea con consultor → suya; el resto, entre quienes ejecutan, en proporción a `horas_asignadas` o a partes iguales).
- `consultify/app/src/lib/jornada.js` · **nuevo**: lo que era la parte pura de `agenda.js` (convenio, festivos, capacidad) sin dependencia de Supabase, para poder probarlo desde Node. `agenda.js` lo reexporta: nada cambia para quien importaba de ahí.
- `scripts/test-control-horas.mjs` · 41 comprobaciones (capacidad por mes con festivos, vacaciones e intensiva de verano; reparto entre equipo; caso real CECE + DICS; veredicto).
- `consultify/app/src/portal/consultores/Dashboard.jsx` · la tarjeta «Carga del equipo» usa el mismo cálculo (antes: 150 h/mes fijas y solo tareas con consultor asignado, que casi nunca lo tienen) y enlaza al control de horas.

## Reparto de la jornada: 70 / 10 / 20
- `consultify/app/src/lib/jornada.js` · 70 % proyectos, 10 % gestión y coordinación, 20 % procesos internos (antes cuatro bolsas: 70/10/10/10). La coordinación cuenta dentro de gestión; las tareas antiguas de tipo `coordinacion` no se pierden.
- El reparto se lee de `parametros_precio` (grupo `jornada`) al arrancar, con `reglasComerciales.cargarReglas()`: se puede ajustar sin desplegar.
- `perfiles.pct_jornada` (v116): porcentaje de jornada de cada persona. Se edita en **Accesos** (invitación y edición de perfil). `netlify/functions/admin-usuarios.mjs` lo guarda; si la migración no está aplicada, guarda el resto y avisa.

## Tareas de gestión y procesos internos en el calendario
- `consultify/app/src/portal/consultores/TareasInternas.jsx` · **nuevo**, en Mi agenda. El consultor crea tareas de gestión y coordinación o de procesos internos (elige el proceso —y subproceso— del mapa de procesos del portal), les pone horas previstas y las programa en sesiones con el mismo calendario que las tareas de proyecto. Enseña cuánto lleva de cada bolsa este mes.
- `consultify/supabase/migracion-v116-control-horas-y-tareas-internas.sql` · **pendiente de aplicar**. Tabla `tareas_internas`, columna `tarea_sesiones.tarea_interna_id`, `perfiles.pct_jornada`, parámetros del reparto, vista `v_horas_consultor_mes`, y lectura de `procesos_internos` también para dirección. Probada en seco contra producción (transacción con rollback).
- `components/MisSesiones.jsx`, `portal/consultores/AgendaTareas.jsx`, `portal/consultores/Inicio.jsx` · las sesiones de tareas internas aparecen en Mi agenda, en la agenda del equipo y en Inicio, con la etiqueta de su bolsa (G · PI).
- `portal/consultores/SesionesTarea.jsx` · admite `campoTarea="tarea_interna_id"` y propone al propio consultor como responsable.
- `portal/consultores/MiAgenda.jsx` · capacidad real de los meses elegidos (laborables × convenio × % jornada × 70 %) en vez de 160 h fijas; desglose en tres bolsas.
- `lib/agenda.js` · capa de datos de `tareas_internas` y vacaciones de todo el equipo. Datos de demo para proyectos, equipo, tareas y sesiones (`lib/supabase.js`, `lib/data.js`).

## Pendiente
- Aplicar `migracion-v115-suelos-y-cliente-antiguo.sql` (si no se ha hecho), `migracion-v116-control-horas-y-tareas-internas.sql`, `migracion-v117-iso-27701.sql`, `migracion-v118-certificados-y-auditoria-externa.sql`, `migracion-v119-reparto-niveles.sql` y `migracion-v120-reparto-niveles-proyecto.sql`, en ese orden.
- Revisar en Accesos el % de jornada de cada persona (todas quedan al 100 %).

## Normas · ISO 27701 (privacidad de la información)
- `consultify/app/src/lib/calcEngine.js` · nueva norma `27701` (ISO 27701, J2, 55 h de apoyo), complementaria de la 27001: contratada con ella cuesta el 70 %.
- `consultify/app/src/lib/catalogoTareas.js` · 20 tareas por modelo (92 / 92 / 116 / 148 / 69,6 h; Implantación = 60 % de Implicación al decimal por arriba). Las del mapa común llevan lo que la 27701 añade al SGSI; las cinco de **PA19 Gestión de la privacidad** son las propias: registro de tratamientos, EIPD, derechos, brechas y transferencias.
- `consultify/app/src/lib/codigos.js` · abreviatura `277` en el código de proyecto.
- `consultify/netlify/functions/catalogo-anexo.mjs`, `generar-oferta.mjs` · el anexo de la oferta incluye las tareas de la 27701 (bloque «Gestión de la privacidad»). `brevo-lead.mjs` · atributo `ISO_27701`.
- `consultify/supabase/migracion-v117-iso-27701.sql` · **pendiente de aplicar** (tras la v116): `normas_catalogo`, 100 filas en `tareas_catalogo` y `codigo_proyecto` con `277`. Probada en seco contra producción.
- La web ya tenía su página (`/areas/ciberseguridad/iso-27701.html`) y su imagen social; no se toca.

## Corrección · tareas de otro proyecto al cambiar de proyecto
- `consultify/app/src/portal/consultores/ProyectosConfig.jsx` · al pasar de un proyecto a otro había un render en el que el proyecto ya era el nuevo pero las normas y el modelo en pantalla eran los del anterior; el volcado automático metió 24 tareas de Diversidad (Implantación) en CECE. Ahora el volcado espera a que la configuración cargada sea la de ese proyecto (`configPara`) y, además, filtra las candidatas contra las normas y el modelo del proyecto guardado (`candidatasDelProyecto`): nada de otra norma ni de otro modelo entra en un proyecto. Las 24 tareas erróneas de CECE se han borrado (no tenían sesiones).

## CRM · documentos sin esperar al primer proyecto
- `portal/consultores/FichaEmpresa.jsx`, `portal/consultores/CarteraEmpresa.jsx` · la ficha de `clientes` (de la que cuelgan documentos y proyectos) se crea en cuanto hace falta si la empresa está dada de alta como cliente en el CRM: al abrir la pestaña Documentos, o al pulsar «+ Nuevo proyecto». Por CIF (o nombre), sin duplicar (`asegurarCliente`). Si la empresa no es cliente, lo dice y pide marcarla.

## Sistemas de gestión · guardar y replanificar
- `portal/consultores/Sistemas.jsx` · las horas ya no se escriben en la base a cada tecla: las celdas editadas se marcan y el botón **Guardar y replanificar** escribe el catálogo y actualiza las tareas de los proyectos abiertos (misma norma, modelo y subproceso, no hechas ni ajustadas a mano), con su agenda. Botón «Descartar».
- **Implantación = 60 % de Implicación**, redondeado al alza al primer decimal (4,25 → 2,6): se recalcula sola al cambiar Implicación, salvo que se haya tocado a mano en esa misma tanda; botón «Implantación = 60 % Implicación» para recalcular toda la norma. La ISO 27701 sale ya con esta regla (69,6 h).

## Web · propuesta de valor de los modelos
- `web/index.html`, `web/en/index.html`, `web/consultoria-como-servicio.html`, `web/en/consultoria-como-servicio.html`, `web/servicios/consultify.html` (es/en/ar) · cada modelo dice sus horas y que hacemos todas las tareas del sistema: Relación **2 h online** por sistema al mes · Implicación **4 h online + 2 h onsite** · Compromiso **4 h online + 3 h onsite**. Sustituye «6 h/mes» y «7 h/mes de consultoría».
- `web/estilo-base.css` · línea de horas destacada (`.model-horas`), «hacemos todas las tareas» en verde, tarjetas con sombra y realce al pasar, badge «Más elegido» en una línea.
- **Pendiente de decidir**: el motor de precios sigue calculando Compromiso con 6 h online + 2 presenciales. Si pasa a 4 + 3, Compromiso 9001 baja de 825 a 725 €/mes y 9001+14001 de 1.377 a 1.116 (por debajo del «desde 800 €» de la web).

## CRM · estructura del grupo
- `components/OrganigramaGrupo.jsx` · cajas más pequeñas (150×44), a tamaño natural (no se estiran al ancho de la ficha), conectores redondeados, banda de color para la matriz y la ficha abierta, degradado suave y nombre completo al pasar el ratón.

## Certificados del cliente y auditorías externas
- `consultify/supabase/migracion-v118-certificados-y-auditoria-externa.sql` · **pendiente de aplicar** (tras la v117). Tabla `cliente_certificados` (norma, entidad, nº, alcance, fecha de certificación, fecha de validez, documento enlazado) y columna `proyectos_cliente.fecha_auditoria_externa`. Probada en seco contra producción.
- `components/CertificadosCliente.jsx` · **nuevo**. En la ficha de empresa (pestaña «Certificados y documentos») y en la cartera: alta, edición y borrado de certificados, con la validez propuesta a tres años y el PDF enlazable desde Documentos. Cada uno enseña su próxima auditoría (seguimiento anual o renovación) con su semáforo.
- `lib/auditorias.js` · la regla, en funciones puras (`scripts/test-auditorias.mjs`, 17 comprobaciones): próxima auditoría = siguiente aniversario de la certificación cada 365 días, sin pasar de la validez; **rojo a 30 días o pasada, ámbar a 90 (tres meses)**; validez vencida = rojo.
- `components/AuditoriasExternas.jsx` · **nuevo**. En el Panel de gestión (completo, con la fecha editable en línea) y en Inicio (solo avisos: rojo, ámbar y sin programar). Si el proyecto tiene fecha programada manda esa; si no, «Sin programar · toca antes del …» estimado desde los certificados del cliente; sin certificado, «sin certificado registrado».
- `portal/consultores/ProyectosConfig.jsx` · campo **Auditoría externa** en la ficha del proyecto (se guarda al elegir la fecha; vacío = sin programar).

## Ofertas · rentabilidad y reparto de la carga por nivel
- `consultify/supabase/migracion-v119-reparto-niveles.sql` · **pendiente de aplicar** (tras la v118). Columna `presupuestos.reparto_niveles jsonb` con el reparto manual de la oferta. Probada en seco contra producción.
- `lib/calcEngine.js` · `opts.repartoNiveles` (% J1/J2/J3/Senior) redistribuye las horas del proyecto por nivel antes de valorar; el resultado trae `rentabilidad`: precio, horas, €/h cobrado, €/h debido (tarifa × 1,6), coste, **debido según la carga**, diferencia, margen real y veredicto encaja / justo / por debajo, con el detalle por nivel. Exporta `NIVELES`, `normalizarReparto`, `repartoDesdeHoras`, `precioHoraObjetivo`, `calcularRentabilidad`. Sin reparto manual, el motor calcula el automático por norma.
- `components/RentabilidadOferta.jsx` · **nuevo**. Cuadro del lateral del generador interno (no aparece en la oferta pública): precio ofertado, horas a echar, €/h cobrado frente al debido, cuánto falta o sobra y la tabla por nivel.
- `pages/GeneradorOfertas.jsx` · bloque **Reparto de la carga por nivel** (automático o a mano, con comprobación de que suma 100 %); se guarda en el presupuesto y viaja al servidor (`netlify/functions/generar-oferta.mjs`) para que la oferta se calcule con el mismo reparto.
- `components/InformeRentabilidad.jsx` · **nuevo**, en Ofertas: por cada oferta lo que se debería cobrar según la carga y lo que se cobra, diferencia, €/h, margen real, reparto y veredicto; totales separados en cuotas mensuales y bolsas/implantaciones; filtro «solo vivas» y exportación CSV.

## Proyectos · pestaña «Auditorías externas»
- `portal/consultores/PlanAuditorias.jsx` · **nuevo**, tercera pestaña de Proyectos (`/consultores/proyectos?vista=auditorias`). Una fila por certificado: cliente · norma · entidad · validez · auditoría estimada (seguimiento anual o renovación, con los días que faltan) · fecha programada (editable ahí mismo, se guarda en el proyecto) · aviso con el semáforo. Los proyectos vivos cuya norma no tiene certificado registrado salen como «Sin certificado», con enlace a la ficha del cliente para darlo de alta. Filtros (todas / avisos / sin programar), buscador y CSV.
- Debajo, **calendario de los próximos doce meses** con cada auditoría en el mes que manda (programada o estimada) y las pasadas sin resolver, para repartir la carga del año.
- `components/AuditoriasExternas.jsx` · el aviso de Inicio y del Panel enlaza a la planificación.
- `portal/consultores/ProyectosConfig.jsx` · corregido: al cambiar a «Cómo van» (o a la nueva pestaña) la cartera seguía pintándose debajo; ahora solo se ve la vista elegida.
- Datos de demo con dos certificados de Industrias Norte (`lib/supabase.js`, `lib/data.js`).

## Ofertas · horas comprometidas, formato de importes y pago anual
- **Horas según el modelo.** `lib/calcEngine.js` · en los modelos de cuota `hTotal` es ahora lo comprometido con el cliente: horas del modelo por cada sistema más las presenciales (Relación con dos sistemas: **4 h**, no 5). La coordinación, los solapes y los redondeos por nivel siguen en `hInternas` y en la rentabilidad (son para costear y planificar, no lo que se promete). Nuevo `dedicacion` {porSistema, sistemas, online, presenciales, mes, texto}. Es lo que se había ido en la oferta de Royal Mayline.
- **Documentos** (`netlify/functions/contenido-oferta.mjs`, `documento-oferta-premium.mjs`, `generar-oferta.mjs`) · «Dedicación comprometida: 4 h online al mes (2 h por sistema × 2)» en PDF y PPT; el cuadro «Cuándo se factura» lleva una columna **HORAS** (las del mes en cuota; en proyecto o bolsa, el total repartido en proporción a cada cargo) y el total de horas junto al importe.
- **Formato de importes** · `lib/formato.js` (nuevo): punto de miles siempre y coma decimal («1.325,00 €»). `Intl` en es-ES no agrupa los números de cuatro cifras y salía «1325,00 €». Aplicado a `fmtEUR` del motor y a todos los formateadores de euros de la app y de los documentos.
- **Pago anual por adelantado en el generador** (`pages/GeneradorOfertas.jsx`) · en Relación, Implicación y Compromiso se elige «Cuota mensual» o «Pago único al inicio» (12 meses de servicio por 11 mensualidades). El cuadro de precio enseña el importe anual, el ahorro y la equivalencia mensual; se guarda `pago_adelantado` y el PDF sale con la portada, la caja y el cuadro de facturación de un solo cargo.
- **Regenerar en bloque** (`portal/consultores/Ofertas.jsx`) · botón «↻ Regenerar documentos de las vivas»: vuelve a generar PDF y PPT de todas las ofertas en borrador, emitidas o aceptadas, cada una con su precio y su número, sin enviar nada. La regeneración individual también reenvía el reparto por nivel guardado.

## Apoyo · solo en la recta final
- `lib/calcEngine.js` · **Apoyo solo se contrata con tres meses o menos hasta la certificación** (`MAX_MESES_APOYO`); antes tenía un mínimo de tres (justo al revés). Con más plazo el motor lo bloquea (`plazoLargo`) y el generador lo deja deshabilitado con el motivo. Se paga como la implantación: **pago único (5 % de descuento) o dos cuotas** (50 % a la firma, 50 % antes de las auditorías); PDF y PPT enseñan las dos tarjetas y el cuadro de facturación las recoge (`lib/facturacion.js`).
- `lib/planificacion.js`, `pages/GeneradorOfertas.jsx` (fin por defecto de Apoyo = inicio + 3 meses; el plazo se mide hasta la certificación), `pages/Calculadora.jsx` y `portal/consultores/Proyectos.jsx` (la vieja regla de «no a menos de 60 días» se sustituye por la nueva). Pruebas `scripts/test-plazos-modelo.mjs` y `test-fin-por-modelo.mjs` actualizadas.

## Panel de proyectos («Cómo van») · horas por planificar hasta la certificación
- `lib/planHoras.js` · **nuevo**, puro (`scripts/test-plan-horas.mjs`, 25 comprobaciones): por proyecto vivo, horas comprometidas (tareas), hechas, en agenda y **sin planificar**; la fecha objetivo es la certificación prevista (o el límite, o el fin); ritmo necesario = sin planificar ÷ meses que quedan; **prorrateo mensual** en proporción a los días de cada mes hasta la certificación, con lo ya programado al lado.
- `portal/consultores/DashboardProyectos.jsx` · sección «Horas por planificar hasta la certificación»: cifras de la cartera, tabla por proyecto (se despliega para ver el prorrateo de sus meses) y vista «Por meses» con la carga sumada de todos los proyectos.

## Generador · carga por nivel como único dato de equipo, rentabilidad en vivo
- Se quita el bloque **«Equipo consultor estimado»**: el reparto de la carga por nivel es lo que dice quién hace el trabajo. El motor ya no sustituye la tarifa por la media del equipo (`tarifaEquipo`): las horas de cada nivel van a su tarifa. Ojo: una oferta antigua guardada con equipo puede dar hoy otro precio de catálogo (el aviso de Ofertas lo enseña; el documento se regenera con su precio).
- El equipo se **deduce del reparto** (`equipoDesdeReparto`: una persona por nivel con carga, hasta tres) y se guarda como dato interno en el presupuesto.
- **Al abrir el proyecto** desde la oferta (`AltaProyecto.jsx`, `lib/ofertasAceptadas.js`) el reparto viaja a `proyectos_cliente.reparto_niveles` (`migracion-v120-reparto-niveles-proyecto.sql`, **pendiente de aplicar**; si falta, el proyecto se crea igual) y la ficha del equipo (`EquipoProyecto.jsx`) enseña «Previsto en la oferta: J1 70 % · Senior 30 %» como guía para asignar.
- Rentabilidad **en tiempo real**: debajo del reparto, una línea que se recalcula con cada porcentaje (encaja/justo/por debajo, margen, cobrado frente a debido, €/h, equipo previsto); el cuadro completo sigue en el lateral. El informe de rentabilidad de Ofertas se abre desplegado.
