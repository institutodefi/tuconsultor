# Manual de marca · TuConsultor

Documento de referencia de las tres marcas del grupo. Vive junto a los archivos
de logotipo a propósito: si se cambia un archivo, se actualiza aquí.

Última revisión: julio de 2026.

---

## 1 · Los nombres

| Marca | Forma canónica | Nunca |
|---|---|---|
| Marca matriz | **TuConsultor** | Tu Consultor · TUCONSULTOR en prosa · Trescore de cara al cliente |
| Consultoría por suscripción | **Consultify** | Consultify by TuConsultor · Consultify® |
| Herramienta de proyecto | **Orbita.PMTools** | ~~Orbita 360~~ · ~~Orbital~~ · ~~Orbita.PMTool~~ (sin ese) · ~~Orbita PM Tool~~ · ~~Orbita PmTool~~ · ~~Orbita.PmTool~~ |

### Orbita.PMTools

**Se escribe sin espacios, con punto y en plural: `Orbita.PMTools`.**

Carácter a carácter: `O` `r` `b` `i` `t` `a` `.` `P` `M` `T` `o` `o` `l` `s`.
Ni espacios alrededor del punto, ni eme minúscula, ni singular. El punto forma
parte del nombre, no es una separación tipográfica.

**«Orbita 360» está retirado.** Fue el nombre anterior y no debe aparecer en
ningún soporte: ni en texto, ni en logotipos, ni en capturas de pantalla nuevas.
El archivo `orbita-pmtool.svg`, que llevaba ese nombre trazado, se retiró en la
versión v107.

**Orbita se escribe sin tilde**, aunque en español la palabra «órbita» la lleve.
Es un nombre propio y así está registrado.

### En qué documentos aparece cada marca

- **TuConsultor** emite las ofertas y firma los documentos. En el pie de un
  documento comercial pone *TuConsultor · CIF B84867670*, no la razón social.
- **TRESCORE PROYECTOS ITE, S.L.** solo aparece donde la ley lo exige:
  facturas, avisos legales, política de privacidad y contratos.
- **Orbita.PMTools** es el centro de la propuesta de valor de Consultify, no un
  añadido. En la web y en las ofertas se presenta como el sitio donde vive el
  proyecto, no como una herramienta de apoyo.

---

## 2 · Los archivos de logotipo

Todos en `web/marca/`. Los SVG son la fuente; los PNG se generan de ellos.

### Orbita.PMTools

| Archivo | Uso |
|---|---|
| `orbita-pmtool-blanco.svg` | Vertical, fondos oscuros |
| `orbita-pmtool-oscuro.svg` | Vertical, fondos claros |
| `orbita-pmtool-h-blanco.svg` | Horizontal, fondos oscuros |
| `orbita-pmtool-h-oscuro.svg` | Horizontal, fondos claros |
| `orbita-pmtool-*@2x.png` / `@3x.png` | Rásteres con transparencia |
| `orbita-pmtool-email.jpg` | Cabecera de los correos, con el navy incrustado |
| `orbita-esfera-anim.svg` | Solo la esfera, animada. Sin nombre. |

**La aplicación tiene su propia copia**, en `consultify/app/public/marca/`, porque
se sirve desde `/app/`. Son los mismos archivos con otro nombre, y hay que
actualizarlos a la vez:

| Archivo en la app | Copia de |
|---|---|
| `orbita-vertical-anim.svg` | `orbita-pmtool-blanco.svg` |
| `orbita-horizontal.svg` | `orbita-pmtool-h-blanco.svg` |
| `orbita-isotipo-anim.svg` | Solo la esfera. No lleva nombre, no hay que tocarlo. |

Y una tercera copia en `consultify/netlify/functions/marca/orbita.png`, para el
pie de las ofertas en PDF. **Son tres sitios**: si se cambia el logotipo y solo
se toca `web/marca/`, la aplicación sigue mostrando el anterior. Es exactamente
lo que pasó en la v109.

**El nombre está trazado, no es texto.** Se generó desde `Rubik-500.ttf` con
fontTools, así que no depende de que la tipografía esté instalada. Si hay que
cambiar el nombre, se regenera con el script de la v107; no se edita a mano.

**Composición del nombre:** «Orbita» en el color principal (blanco o navy según
el fondo), el punto en **naranja `#F99001`** y «PMTools» en **teal `#1FA1A6`**.
Tracking **−3 %**.

### TuConsultor

| Archivo | Uso |
|---|---|
| `horizontal-dark.svg` | Horizontal para **fondos oscuros** (el texto es blanco) |
| `horizontal-dark@2x.png` | Igual, con el navy incrustado |
| `isotipo-dark.svg` | Solo la casita isométrica |

**Cuidado con el nombre de estos archivos.** «dark» significa *para fondo
oscuro*, no *logotipo oscuro*: el texto va en blanco. Sobre fondo claro
desaparece. **No existe versión para fondo claro**, y es la causa de que el pie
de las ofertas en PDF tenga banda navy. Si se quiere pie blanco, hay que crear
esa versión.

### Consultify

| Archivo | Uso |
|---|---|
| `consultify-horizontal-light.svg` | Para **fondos claros** (texto en azul) |
| `consultify-horizontal-blanco.svg` | Para fondos oscuros |
| `consultify-isotipo.svg` | Símbolo aislado |

**El logotipo de Consultify no se altera, no se anima ni se recompone.** Para
favicons y pantallas de carga existe el símbolo concéntrico animado. Su eje real
de rotación está en `(738, 781)` de las coordenadas originales, que **no** es el
centro de su caja: cualquier animación orbital debe usar ese punto.

---

## 3 · Color

| Nombre | Hex | Uso |
|---|---|---|
| Navy TuConsultor | `#0E1730` | Fondo de marca matriz |
| Navy Orbita | `#0A2B3A` | Fondo de Orbita.PMTools y cabeceras |
| Navy profundo | `#061F2B` | Degradados y bandas |
| Naranja | `#F99001` | Acento, llamadas a la acción, el punto de Orbita.PMTools |
| Teal | `#1FA1A6` | Acento secundario, «PMTools» |
| Azul Consultify | `#014695` | Marca Consultify |
| Azul Consultify oscuro | `#013886` | Variante |

**Degradado de familia:** `#1FA1A6` → `#F99001` a 135°.

**Contraste.** Cualquier texto sobre estos fondos tiene que medirse con el color
**real compuesto**, no con el valor del CSS: con opacidades por debajo de 1, el
valor declarado engaña. Mínimos: 4,5:1 para texto normal y 3:1 desde 18,66 px o
14 px en negrita. Los logotipos están exentos.

---

## 4 · Tipografía

- **Rubik** para logotipos y titulares. El nombre de Orbita.PMTools va en
  **Medium 500**.
- **Manrope** para texto corrido.
- **Noto Sans Arabic** como respaldo en la versión árabe del sitio.
- En correos y PDF, **Rubik incrustada**: los clientes de correo y los lectores
  de PDF no descargan tipografías web.

---

## 5 · Reglas de redacción

- **Lenguaje con perspectiva de género** en todo el contenido: «personas
  trabajadoras», «equipo consultor», «Consultoría» y «Dirección de Proyecto»
  para referirse a roles, no «consultor» ni «director».
- **Nombres propios y marcas registradas, literales** en cualquier traducción:
  MAGIC®, TRG23, Premios Vanguardistas, Orbita.PMTools.
- **MAGIC® siempre con el símbolo de registro**, y «Modelo MAGIC®» como lo
  escribe su propia web, no «MODELO MAGIC®».
- **La casita isométrica de TuConsultor no rota nunca.** La esfera de
  Orbita.PMTools sí.
