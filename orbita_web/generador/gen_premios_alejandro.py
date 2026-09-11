# -*- coding: utf-8 -*-
"""
Premios Vanguardistas en el perfil personal de Alejandro (v279ap).

Cadencia menor que la página de empresa: martes y jueves a las 09:15, del
15/09 al 30/10/2026. Cada publicación reutiliza el texto de LinkedIn de la
página de ese día, con una entrada en primera persona, y lleva una creatividad
propia con la foto de Alejandro (1200×627).

Ejecutar desde la raíz del repo:  python3 orbita_web/generador/gen_premios_alejandro.py
Idempotente: si ya hay filas de esta campaña (red linkedin_alejandro con
/premios/creatividades/pv-alejandro-…), no añade nada.
"""
import csv, json, datetime as dt, os, sys, re, asyncio, base64

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WEB = os.path.join(RAIZ, "web")
CSV = os.path.join(WEB, "data", "calendario_publicacion.csv")
JSON = os.path.join(WEB, "data", "publicacion.json")
IMG_DIR = os.path.join(WEB, "premios", "creatividades")
FONTS = os.path.join(os.path.dirname(__file__), "fonts")
BASE = open(os.path.join(os.path.dirname(__file__), "base.css"), encoding="utf-8").read().replace("</style>", "").replace('url("./fonts/', f'url("file://{FONTS}/')
FOTO = os.path.join(WEB, "equipo", "alejandro-san-nicolas-sq.jpg")
SITE = "https://www.tuconsultor.com"
DIAS = (1, 3)          # martes y jueves
HORA = "09:15"

TITULOS = {
    "convocatoria": ("Abrimos la IV edición", "Premiamos proyectos, no trayectorias."),
    "consejo": ("Un consejo para tu candidatura", "Cuenta lo que cambió, no lo que hicisteis."),
    "caso": ("Un caso de una edición anterior", "Así se ve un proyecto premiado."),
    "evaluacion": ("Todas las candidaturas reciben evaluación", "Presentarse ya te devuelve algo."),
    "ambito": ("Cuatro ámbitos, un premio", "¿En cuál encaja tu proyecto?"),
    "ambiente": ("Lo que buscamos", "Iniciativas concretas que un equipo sacó adelante."),
    "aniversario": ("20 años de TuConsultor", "De ahí salieron estos premios."),
    "cuentaatras": ("Cuenta atrás", "Candidaturas hasta el 30 de octubre."),
}
ENTRADAS = [
    "Desde TuConsultor organizamos los Premios Vanguardistas y os cuento por qué merece la pena presentarse.",
    "Llevo veinte años viendo proyectos que nadie cuenta fuera de su organización. Por eso existen estos premios.",
    "Cada semana comparto algo de los Premios Vanguardistas. Hoy, esto:",
    "Si tienes un proyecto que cambió algo en tu organización en 2025 o 2026, esto va contigo.",
]

def leer():
    with open(CSV, encoding="utf-8", newline="") as fh:
        r = csv.reader(fh); cab = next(r); filas = list(r)
    return cab, filas

def escribir(cab, filas):
    with open(CSV, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh); w.writerow(cab); w.writerows(filas)

def pagina(titulo, remate, sub, foto_b64):
    return f'''<style>{BASE}html,body{{width:1200px;height:627px}}
.tarj{{position:relative;width:1200px;height:627px;padding:64px 72px;background:linear-gradient(135deg,#0A2B3A 0%,#0E1730 55%,#1B5D72 100%);color:var(--blanco);display:flex;gap:40px;align-items:center}}
.txt{{flex:1;display:flex;flex-direction:column;justify-content:space-between;height:100%}}
.foto{{width:300px;height:300px;border-radius:50%;object-fit:cover;border:5px solid #F39200;box-shadow:0 20px 60px rgba(0,0,0,.4)}}
.quien{{text-align:center;margin-top:16px;font-size:18px;color:var(--gris);line-height:1.4}}
.quien b{{display:block;color:var(--blanco);font-size:21px;font-weight:600}}
.pie{{display:flex;align-items:center;gap:16px;font-size:16px;color:var(--gris)}}
.sello{{height:84px}}
.linea{{position:absolute;left:0;right:0;bottom:0;height:10px;background:var(--grad)}}
</style><body><div class="tarj">
 <div class="txt">
  <div class="tag" style="color:var(--teal)">Premios Vanguardistas · IV edición · 2026</div>
  <h1 style="font-size:60px;max-width:700px">{titulo}<br><span class="acc">{remate}</span></h1>
  <div class="pie"><img class="sello" src="file://{RAIZ}/web/marca/20-aniversario/tuconsultor-20-horizontal-sobre-oscuro-transp.png"><span>{sub}</span></div>
 </div>
 <div><img class="foto" src="data:image/jpeg;base64,{foto_b64}"><div class="quien"><b>Alejandro San Nicolás</b>TuConsultor · 20 años · Organizamos los premios</div></div>
 <div class="linea"></div>
</div></body>'''

async def imagenes(piezas):
    from playwright.async_api import async_playwright
    foto = base64.b64encode(open(FOTO, "rb").read()).decode()
    exe = os.environ.get("CHROMIUM") or None
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=exe) if exe else await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1200, "height": 627})
        for fecha, angulo, ruta in piezas:
            t, r = TITULOS.get(angulo, ("Premios Vanguardistas", "Candidaturas hasta el 30 de octubre."))
            tmp = os.path.join(IMG_DIR, "_tmp.html")
            open(tmp, "w", encoding="utf-8").write(pagina(t, r, "Candidaturas hasta el 30 de octubre · tuconsultor.com/premios", foto))
            await pg.goto("file://" + tmp); await pg.wait_for_timeout(200); await pg.screenshot(path=ruta)
            os.remove(tmp)
        await b.close()

def main():
    cab, filas = leer()
    if any(f[3] == "linkedin_alejandro" and "/premios/creatividades/pv-alejandro-" in f[5] for f in filas):
        print("La campaña personal de premios ya está en el CSV."); return
    origen = {f[1]: f for f in filas if f[0].startswith("PV") and f[3] == "linkedin" and f[1]}
    ultima = max(int(f[0]) for f in filas if f[0].isdigit())
    i = ultima + 1; nuevas = []; piezas = []
    d = dt.date(2026, 9, 15); k = 0
    while d <= dt.date(2026, 10, 30):
        if d.weekday() in DIAS:
            f = d.strftime("%d/%m/%Y"); base = origen.get(f)
            if base:
                angulo = re.search(r"pv-\d{4}-\d\d-\d\d-(\w+)\.jpg", base[5]).group(1)
                nombre = f"pv-alejandro-{d.isoformat()}-{angulo}.png"
                ruta = os.path.join(IMG_DIR, nombre)
                piezas.append((f, angulo, ruta))
                texto = f"{ENTRADAS[k % len(ENTRADAS)]}\n\n{base[4]}"
                nuevas.append([str(i), f, HORA, "linkedin_alejandro", texto, f"{SITE}/premios/creatividades/{nombre}", base[6], "", ""]); i += 1; k += 1
        d += dt.timedelta(days=1)
    asyncio.run(imagenes(piezas))
    filas.extend(nuevas); escribir(cab, filas)
    pub = json.load(open(JSON, encoding="utf-8"))
    pub["ultima_id"] = max(int(f[0]) for f in filas if f[0].isdigit())
    pub["premios_alejandro"] = f"{ultima + 1}-{pub['ultima_id']}"
    pub["actualizado"] = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    json.dump(pub, open(JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"premios en el perfil: {len(nuevas)} filas, ids {ultima + 1}-{pub['ultima_id']}, {len(piezas)} creatividades")

if __name__ == "__main__":
    main()
