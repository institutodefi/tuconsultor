# `_archivo/` · código retirado

Aquí vive código que **ya no se ejecuta** y que se conserva solo por
trazabilidad. Nada de esta carpeta se despliega: `netlify.toml` la excluye
explícitamente de `included_files`.

Si algún día se recupera algo de aquí, sácalo de la carpeta y comprueba que
sigue cuadrando con el resto del sistema antes de enchufarlo.

---

## `documento-oferta.mjs` · archivado el 26/08/2026 (v191)

**Qué era.** El generador del PDF de oferta con la estructura llamada
«Knowledgefy»: portada, objeto, plan de trabajo, dedicación, inversión,
condiciones, confidencialidad, firma y Anexo I / Anexo II.

**Por qué se archiva.** Estaba huérfano: ninguna función lo importaba.
`generar-oferta.mjs` usa `documento-oferta-premium.mjs`, así que el PDF que ha
recibido el cliente ha sido siempre el premium. Los dos comentarios de
`generar-oferta.mjs` que lo mencionaban («delega en el módulo
documento-oferta.mjs») quedaron desfasados cuando se hizo el cambio.

**Por qué era un riesgo dejarlo.** Dos generadores de PDF en paralelo, uno de
ellos sin usar, es la vía directa a que uno se quede atrás sin que nadie lo note.
Y ya habían divergido:

- El premium imprime las cláusulas del Anexo III desde `contenido-oferta.mjs`
  (`clausulas(r)`), donde viven el compromiso de pago de doce meses y la
  cláusula de renovación. Este archivo **no** las tenía: llevaba su propia
  sección 6 de confidencialidad, con otro texto.
- Cada vez que cambiaba una condición legal había que acordarse de tocar los
  dos. En v188 (impuestos) y v189 (compromiso y renovación) se mantuvo
  actualizado a mano, precisamente por no saber aún que estaba muerto.

**Qué se hizo antes de archivarlo.** Se comprobó con una búsqueda en todo el
repositorio que no lo importa ningún `.mjs`, `.js`, `.jsx`, ni lo referencia
`netlify.toml` ni `build-dist.mjs`. Las únicas apariciones eran dos comentarios
y una línea de un documento de traspaso, todos corregidos.

**Si alguna vez hace falta un segundo formato de oferta**, la forma correcta no
es resucitar este archivo, sino añadir una variante de plantilla dentro de
`documento-oferta-premium.mjs` que siga leyendo las cláusulas de
`contenido-oferta.mjs`. Así el texto legal sigue teniendo una sola fuente.
