# -*- coding: utf-8 -*-
"""
Campaña «ventajas» de Orbita · PM Tool (v279ao).

Genera:
  · 60 creatividades (30 mensajes × LinkedIn 1200×627 / Instagram 1080×1080) en web/social-img/orbita/V??X_*.png
  · las filas del calendario: cada día, tres publicaciones
        linkedin            19:00  página de empresa TuConsultor
        linkedin_alejandro  08:45  perfil personal de Alejandro (texto en primera persona)
        instagram           19:00  @tuconsultor_com
    desde START hasta END, rotando los 30 mensajes (V01A, V02A … V10A, V01B …).
  · deja SIN FECHA (no se borran) las filas antiguas de Orbita (ids 233-884) con fecha ≥ START,
    para que no salgan dos mensajes de Orbita el mismo día.
  · actualiza web/data/publicacion.json (ultima_id).

Ejecutar desde la raíz del repo:  python3 orbita_web/generador/gen_ventajas.py [--sin-imagenes]
Idempotente: si las filas de la campaña ya existen (misma id), no se duplican.
"""
import csv, json, datetime as dt, os, sys, asyncio, re

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.dirname(__file__))
from banco_ventajas import BANCO, VENTAJAS, HASH_BASE, CTA_EMPRESA, CTA_YO, CTA_IG, CLAIM

WEB = os.path.join(RAIZ, "web")
IMG_DIR = os.path.join(WEB, "social-img", "orbita")
CSV = os.path.join(WEB, "data", "calendario_publicacion.csv")
JSON = os.path.join(WEB, "data", "publicacion.json")
FONTS = os.path.join(os.path.dirname(__file__), "fonts")
BASE = open(os.path.join(os.path.dirname(__file__), "base.css"), encoding="utf-8").read().replace("</style>", "").replace('url("./fonts/', f'url("file://{FONTS}/')

SITE = "https://www.tuconsultor.com"
IMGBASE = f"{SITE}/social-img/orbita"
DEST = f"{SITE}/orbita/"
START = dt.date(2026, 9, 14)
END = dt.date(2027, 7, 31)
CAMPANA = "orbita-ventajas"

def utm(fuente, codigo):
    return f"{DEST}?utm_source={fuente}&utm_medium=social&utm_campaign={CAMPANA}&utm_content={codigo.lower()}"

def texto_empresa(m, ciclo):
    cod, v, tit, rem, sub, cuerpo, _ = m
    return f"{tit} {rem}\n\n{cuerpo}\n\n{CTA_EMPRESA[ciclo % 3]}\n👉 {utm('linkedin', cod)}\n\n{HASH_BASE} {VENTAJAS[v][1]}"

def texto_yo(m, ciclo):
    cod, v, tit, rem, sub, _, yo = m
    return f"{tit} {rem}\n\n{yo}\n\n{CTA_YO[ciclo % 3]}\n👉 {utm('linkedin_alejandro', cod)}\n\n{HASH_BASE} {VENTAJAS[v][1]}"

EMOJI = {"V01": "🧭", "V02": "🧩", "V03": "🤝", "V04": "📚", "V05": "🔐", "V06": "⚡", "V07": "📊", "V08": "🗂️", "V09": "🕐", "V10": "📱"}
def texto_ig(m, ciclo):
    cod, v, tit, rem, sub, _, _ = m
    return f"{EMOJI[v]} {tit} {rem}\n\n{sub}\n\n{CTA_IG[ciclo % 3]}\nEnlace en bio.\n\n❤️ Gestión con corazón desde 2006.\n\n{HASH_BASE} {VENTAJAS[v][1]} #GestiónConCorazón #Orbita"

# ── Calendario ──────────────────────────────────────────────────────────────
def leer_csv():
    with open(CSV, encoding="utf-8", newline="") as fh:
        r = csv.reader(fh); cab = next(r); filas = list(r)
    return cab, filas

def escribir_csv(cab, filas):
    with open(CSV, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh); w.writerow(cab); w.writerows(filas)

def fecha_es(s):
    try: return dt.datetime.strptime(s, "%d/%m/%Y").date()
    except Exception: return None

def calendario():
    cab, filas = leer_csv()
    ids = {f[0] for f in filas}
    # 1) Las filas antiguas de Orbita (233-884) a partir de START se quedan sin fecha.
    retiradas = 0
    for f in filas:
        if f[0].isdigit() and 233 <= int(f[0]) <= 884 and f[1] and fecha_es(f[1]) and fecha_es(f[1]) >= START:
            f[1] = ""; retiradas += 1
    # 2) Nuevas filas: id correlativo a partir de la última numérica.
    ultima = max(int(f[0]) for f in filas if f[0].isdigit())
    ya = any(f[6] and "orbita-ventajas" in (f[4] or "") for f in filas)
    nuevas = []; i = ultima + 1; d = START; dia = 0
    while d <= END:
        m = BANCO[dia % len(BANCO)]; ciclo = dia // len(BANCO); cod = m[0]; f = d.strftime("%d/%m/%Y")
        nuevas.append([str(i), f, "08:45", "linkedin_alejandro", texto_yo(m, ciclo), f"{IMGBASE}/{cod}_linkedin.png", DEST, "", ""]); i += 1
        nuevas.append([str(i), f, "19:00", "linkedin", texto_empresa(m, ciclo), f"{IMGBASE}/{cod}_linkedin.png", DEST, "", ""]); i += 1
        nuevas.append([str(i), f, "19:00", "instagram", texto_ig(m, ciclo), f"{IMGBASE}/{cod}_instagram.png", DEST, "", ""]); i += 1
        d += dt.timedelta(days=1); dia += 1
    if ya:
        print("La campaña ya está en el CSV: no se añaden filas."); nuevas = []
    else:
        filas.extend(nuevas)
    escribir_csv(cab, filas)
    pub = json.load(open(JSON, encoding="utf-8"))
    pub["ultima_id"] = max(int(f[0]) for f in filas if f[0].isdigit())
    pub["orbita_ventajas"] = f"{ultima + 1}-{pub['ultima_id']}" if nuevas else pub.get("orbita_ventajas", "")
    pub["actualizado"] = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    json.dump(pub, open(JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"retiradas (sin fecha): {retiradas} · nuevas: {len(nuevas)} · ids {ultima + 1}-{pub['ultima_id']} · {START:%d/%m/%Y} → {END:%d/%m/%Y}")
    if nuevas:
        print("máx. caracteres · LinkedIn", max(len(x[4]) for x in nuevas if x[3] == 'linkedin'), "· Alejandro", max(len(x[4]) for x in nuevas if x[3] == 'linkedin_alejandro'), "· Instagram", max(len(x[4]) for x in nuevas if x[3] == 'instagram'))

# ── Imágenes ────────────────────────────────────────────────────────────────
SEAL = '<img src="file://{raiz}/web/marca/20-aniversario/tuconsultor-20-horizontal-sobre-oscuro-transp.png" style="position:absolute;top:{t}px;right:{r}px;height:{s}px">'
LOGO_ORBITA = f"file://{RAIZ}/web/marca/orbita/svg/horizontal-dark.svg"

def pagina(w, h, tag, tit, rem, sub, cuadrada):
    pad = 96 if cuadrada else 72; h1 = 84 if cuadrada else 70; subsz = 32 if cuadrada else 27; logo = 96 if cuadrada else 66
    if len(tit) + len(rem) > 60: h1 = int(h1 * 0.86)
    if len(tit) + len(rem) > 80: h1 = int(h1 * 0.78)
    sello = SEAL.format(raiz=RAIZ, t=pad - 10, r=pad, s=124 if cuadrada else 90)
    return f'''<style>{BASE}html,body{{width:{w}px;height:{h}px}}</style><body>
<div style="position:relative;width:{w}px;height:{h}px;background:var(--navy);color:var(--blanco);padding:{pad}px;display:flex;flex-direction:column;justify-content:space-between">
 {sello}<div class="tag" style="color:var(--teal)">{tag}</div>
 <h1 style="font-size:{h1}px;max-width:{'820' if cuadrada else '980'}px">{tit}<br><span class="acc">{rem}</span></h1>
 <div class="foot"><p class="sub" style="font-size:{subsz}px;color:var(--gris);max-width:{'600' if cuadrada else '680'}px">{sub}</p><img src="{LOGO_ORBITA}" style="height:{logo}px"></div>
</div></body>'''

async def imagenes():
    from playwright.async_api import async_playwright
    os.makedirs(IMG_DIR, exist_ok=True)
    exe = os.environ.get("CHROMIUM") or None
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=exe) if exe else await p.chromium.launch()
        pg = {"linkedin": await b.new_page(viewport={"width": 1200, "height": 627}), "instagram": await b.new_page(viewport={"width": 1080, "height": 1080})}
        k = 0
        for cod, v, tit, rem, sub, _, _ in BANCO:
            for fmt, page in pg.items():
                sq = fmt == "instagram"; w, h = (1080, 1080) if sq else (1200, 627)
                tmp = os.path.join(IMG_DIR, f"_tmp_{fmt}.html")
                open(tmp, "w", encoding="utf-8").write(pagina(w, h, VENTAJAS[v][0], tit, rem, sub, sq))
                await page.goto("file://" + tmp); await page.wait_for_timeout(200)
                await page.screenshot(path=os.path.join(IMG_DIR, f"{cod}_{fmt}.png")); k += 1
                os.remove(tmp)
        await b.close(); print("imágenes:", k)

if __name__ == "__main__":
    if "--sin-imagenes" not in sys.argv:
        asyncio.run(imagenes())
    if "--solo-imagenes" not in sys.argv:
        calendario()
