# institutoexcelencia.com → ficha del grupo

Cómo redirigir el dominio **sin romper el correo**.

---

## Lo primero: por qué esto es delicado

Un dominio no redirige por DNS. El DNS solo dice «esta web está en este
servidor»; el redirección la hace el servidor con una respuesta 301. Así que
para redirigir hay que apuntar la web del dominio a Netlify.

El problema es que **el mismo dominio sirve la web y el correo**, con registros
distintos:

| Registro | Para qué sirve | ¿Hay que tocarlo? |
|---|---|---|
| `A` / `AAAA` del dominio raíz | Dónde está la web | **Sí** |
| `CNAME` de `www` | Dónde está la web con www | **Sí** |
| `MX` | **A dónde llega el correo** | **NO** |
| `TXT` con `v=spf1…` | Quién puede enviar correo en tu nombre | **NO** |
| `CNAME`/`TXT` de DKIM (`selector._domainkey`) | Firma de tus correos | **NO** |
| `TXT` de `_dmarc` | Política antisuplantación | **NO** |
| `CNAME` de `autodiscover` / `autoconfig` | Configuración automática de Outlook | **NO** |

**El error que rompe el correo es cambiar los servidores de nombres.** Si
delegas el dominio a Netlify DNS, empieza de cero: los MX, el SPF y el DKIM
dejan de existir salvo que los recrees uno a uno. El correo deja de entrar ese
mismo día y sin aviso, porque quien te escribe recibe el rebote, tú no.

---

## Antes de tocar nada: inventario

En el panel DNS actual del dominio, **exporta o captura todos los registros**.
Si algo sale mal, esto es lo que permite volver atrás. Anota especialmente:

- Los `MX` con su prioridad
- Cualquier `TXT` que empiece por `v=spf1`
- Cualquier registro con `_domainkey` en el nombre
- El `TXT` de `_dmarc`

---

## Opción recomendada · no tocar los servidores de nombres

Se queda el DNS donde está y solo se cambian los dos registros de la web.

**1 · En Netlify**, sitio de TuConsultor → *Domain management* → *Add domain
alias* → añadir `institutoexcelencia.com` y `www.institutoexcelencia.com`.
Netlify indicará los valores exactos a poner.

**2 · En el DNS actual del dominio**, cambiar solo estos dos:

| Nombre | Tipo | Valor |
|---|---|---|
| `@` | `A` | `75.2.60.5` *(el que indique Netlify; verificarlo en el panel)* |
| `www` | `CNAME` | `<tu-sitio>.netlify.app` |

**3 · No tocar nada más.** Los `MX`, el SPF, el DKIM y el DMARC se quedan
exactamente como están.

**4 · Esperar la propagación** (de minutos a un par de horas) y que Netlify
emita el certificado del dominio nuevo.

---

## Comprobación, en este orden

**Primero el correo, antes que la web.** Si algo se rompió, quieres saberlo
antes de que pasen horas:

```bash
# Los MX deben seguir apuntando a tu proveedor de correo
dig MX institutoexcelencia.com +short

# El SPF debe seguir ahí
dig TXT institutoexcelencia.com +short | grep spf1
```

Y **manda un correo de prueba desde fuera** a una dirección del dominio. Que el
registro exista no garantiza que el buzón reciba.

Después, la web:

```bash
curl -sI https://www.institutoexcelencia.com | head -3
# Debe responder: HTTP/2 301
# location: https://www.tuconsultor.com/grupo/instituto-excelencia.html
```

---

## Lo que ya está hecho

En `netlify.toml` están las cuatro redirecciones —con y sin `www`, en `http` y
en `https`— apuntando a la ficha del Instituto. Son **301**, traslado
permanente: así la autoridad de los enlaces que apuntaban al dominio antiguo
pasa a la ficha del grupo, en vez de perderse.

Están con `force = true` para que ganen a cualquier archivo del sitio.

---

## Dos cosas que decidir

**El correo `hola@institutoexcelencia.com`** aparece en modelo-magic.com. Si el
dominio deja de tener web pero conserva el correo, esa dirección sigue viva y no
hay problema. Si además quieres retirarla, hay que actualizar antes las webs que
la publican, o quedará un contacto que no responde.

**modelo-magic.com** es un dominio distinto y esta redirección no le afecta. Si
también debe apuntar a la ficha, es el mismo procedimiento repetido — pero
piénsalo dos veces: el Modelo MAGIC® tiene entidad propia y su web está viva.
