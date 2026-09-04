# -*- coding: utf-8 -*-
import csv, json, datetime as dt, os, sys, asyncio
sys.path.insert(0, "/home/claude/rrss/orbita/v3")
from banco import BANCO, EJES, CTA
ROOT="/home/claude/rrss/orbita"; L=f"{ROOT}/manrope/svg"; OUT=f"{ROOT}/v3"
IMG=f"{OUT}/img"; os.makedirs(IMG, exist_ok=True)
BASE=open(f"{ROOT}/creas/base.css").read().replace("</style>","")
SITE="https://www.tuconsultor.com"; IMGBASE=f"{SITE}/social-img/orbita"
VIDBASE="https://znrbidycakbbfmynbeot.supabase.co/storage/v1/object/public/videos/orbita"
DEST=f"{SITE}/orbita/"
START=dt.date(2026,9,9); END=dt.date(2027,7,31); ID0=233
AX="ABCDEF"
TAGS={"A":"PORTAL INTEGRADO","B":"MEJORA ISO","C":"PROCESOS Y TAREAS","D":"DASHBOARD EN TIEMPO REAL","E":"TU ISO EN SEMANAS","F":"MODELOS DE RELACIÓN"}

# ---------- mensajes en orden de calendario ----------
def msg_for_day(i):
    ax=AX[i%6]; n=(i//6)%15; cycle=(i//90)
    t,acc,sub=BANCO[ax][n]
    return ax,n,cycle,t,acc,sub
def code(ax,n): return f"{ax}{n+1:02d}"

def li_text(ax,n,cycle,t,acc,sub):
    cta=CTA[ax][cycle%4]
    url=f"{DEST}?utm_source=linkedin&utm_medium=social&utm_campaign=orbita&utm_content={code(ax,n).lower()}"
    return f"{t} {acc}\n\n{sub}\n\n{cta}\n👉 {url}\n\n{EJES[ax][1]}"
def ig_text(ax,n,cycle,t,acc,sub):
    cta=CTA[ax][(cycle+1)%4]
    return f"{t} {acc}\n\n{sub}\n\n{cta}\nEnlace en bio.\n\n❤️ Gestión con corazón desde 2006.\n\n{EJES[ax][1]} #GestiónConCorazón #Orbita"

rows=[]; i=ID0; d=START; day=0
while d<=END:
    ax,n,cycle,t,acc,sub=msg_for_day(day); c=code(ax,n); f=d.strftime("%d/%m/%Y")
    rows.append([str(i),f,"19:00","linkedin",li_text(ax,n,cycle,t,acc,sub),f"{IMGBASE}/{c}_linkedin.png",DEST,"",""]); i+=1
    rows.append([str(i),f,"19:00","instagram",ig_text(ax,n,cycle,t,acc,sub),f"{IMGBASE}/{c}_instagram.png",DEST,"",""]); i+=1
    d+=dt.timedelta(days=1); day+=1
with open(f"{OUT}/calendario_promo_orbita.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.writer(fh); w.writerow(["id","fecha","hora","red","texto","imagen_url","enlace","publicado","lista"]); w.writerows(rows)

# ---------- reels (Video tab): lunes, miércoles, viernes 20:30 ----------
vrows=[]; d=START; day=0; r=1
while d<=END:
    if d.weekday() in (0,2,4):
        ax,n,cycle,t,acc,sub=msg_for_day(day); c=code(ax,n)
        txt=f"{t} {acc}\n\n{sub}\n\n{CTA[ax][(cycle+2)%4]}\nEnlace en bio.\n\n{EJES[ax][1]} #Reels #Orbita"
        vrows.append([f"R{r:03d}",d.strftime("%d/%m/%Y"),"20:30","instagram_reel",txt,"",DEST,"","",f"{VIDBASE}/{c}.mp4",f"{t} {acc}"]); r+=1
    d+=dt.timedelta(days=1); day+=1
with open(f"{OUT}/calendario_reels_orbita_pestana_Video.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.writer(fh); w.writerow(["id","fecha","hora","red","texto","imagen_url","enlace","publicado","lista","video_url","titulo"]); w.writerows(vrows)

print(f"promo: {len(rows)} filas, ids {rows[0][0]}-{rows[-1][0]}, {rows[0][1]} → {rows[-1][1]}")
print(f"reels: {len(vrows)} filas, {vrows[0][0]}-{vrows[-1][0]}")
print("máx car. LI", max(len(x[4]) for x in rows if x[3]=='linkedin'), "IG", max(len(x[4]) for x in rows if x[3]=='instagram'))

# ---------- imágenes: 90 mensajes × 2 formatos ----------
SEAL='''<img src="/marca/20-aniversario/tuconsultor-20-horizontal-sobre-oscuro-transp.png" style="position:absolute;top:{t}px;right:{r}px;height:{s}px">'''
def page(w,h,tema,a,acc,sub,square):
    pad=96 if square else 72; h1=88 if square else 72; subsz=32 if square else 27; logo=96 if square else 66
    if len(a)+len(acc)>70: h1=int(h1*0.86)
    seal=SEAL.format(t=pad-10,r=pad,s=124 if square else 90)
    return f'''<style>{BASE}html,body{{width:{w}px;height:{h}px}}</style><body>
<div style="position:relative;width:{w}px;height:{h}px;background:var(--navy);color:var(--blanco);padding:{pad}px;display:flex;flex-direction:column;justify-content:space-between">
 {seal}<div class="tag" style="color:var(--teal)">{tema}</div>
 <h1 style="font-size:{h1}px;max-width:{'800' if square else '960'}px">{a}<br><span class="acc">{acc}</span></h1>
 <div class="foot"><p class="sub" style="font-size:{subsz}px;color:var(--gris);max-width:{'560' if square else '640'}px">{sub}</p><img src="{L}/horizontal-dark.svg" style="height:{logo}px"></div>
</div></body>'''

async def render():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pages={"linkedin":await b.new_page(viewport={"width":1200,"height":627}),"instagram":await b.new_page(viewport={"width":1080,"height":1080})}
        k=0
        for ax in AX:
            for n,(t,acc,sub) in enumerate(BANCO[ax]):
                c=code(ax,n)
                for fmt,pg in pages.items():
                    sq=fmt=="instagram"; w,h=(1080,1080) if sq else (1200,627)
                    hf=f"{IMG}/_tmp_{fmt}.html"; open(hf,"w").write(page(w,h,TAGS[ax],t,acc,sub,sq)); await pg.goto("file://"+hf); await pg.wait_for_timeout(150)
                    await pg.screenshot(path=f"{IMG}/{c}_{fmt}.png"); k+=1
        await b.close(); print("imágenes:",k)
if "--img" in sys.argv: asyncio.run(render())
