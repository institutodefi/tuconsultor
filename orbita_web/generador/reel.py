# -*- coding: utf-8 -*-
import asyncio, os, sys, subprocess, shutil
sys.path.insert(0,"/home/claude/rrss/orbita/v3"); from banco import BANCO, EJES
ROOT="/home/claude/rrss/orbita"; L=f"{ROOT}/manrope/svg"; OUT=f"{ROOT}/v3/reels"; os.makedirs(OUT,exist_ok=True)
BASE=open(f"{ROOT}/creas/base.css").read().replace("</style>","")
FPS=30; DUR=7.0
def html(tema,a,acc,sub):
    return f'''<style>{BASE}
html,body{{width:1080px;height:1920px}}
.card{{width:1080px;height:1920px;padding:120px 96px;background:var(--navy);color:var(--blanco);position:relative;display:flex;flex-direction:column;justify-content:center;gap:48px}}
.up{{opacity:0;transform:translateY(40px);animation:up .6s cubic-bezier(.42,0,.58,1) forwards}}
@keyframes up{{to{{opacity:1;transform:none}}}}
@keyframes pop{{0%{{opacity:0;transform:scale(.92)}}60%{{transform:scale(1.03)}}100%{{opacity:1;transform:none}}}}
.pop{{opacity:0;animation:pop .7s cubic-bezier(.42,0,.58,1) forwards}}
@keyframes bar{{to{{width:100%}}}}
.bar{{position:absolute;left:0;bottom:0;height:14px;width:0;background:var(--grad);animation:bar {DUR}s linear forwards}}
</style><body><div class="card">
 <img class="up" src="/marca/20-aniversario/tuconsultor-20-horizontal-sobre-oscuro-transp.png" style="position:absolute;top:120px;right:96px;height:118px">
 <div class="tag up" style="color:var(--teal);font-size:26px;animation-delay:.2s;position:absolute;top:160px;left:96px">{tema}</div>
 <h1 class="up" style="font-size:104px;animation-delay:.7s">{a}</h1>
 <h1 class="pop acc" style="font-size:112px;animation-delay:1.9s">{acc}</h1>
 <p class="sub up" style="font-size:42px;color:var(--gris);animation-delay:3.2s;max-width:820px">{sub}</p>
 <img class="up" src="{L}/horizontal-dark.svg" style="height:120px;position:absolute;left:96px;bottom:150px;animation-delay:4.2s">
 <div class="bar"></div>
</div></body>'''
async def render(codes):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1080,"height":1920})
        for c in codes:
            ax=c[0]; n=int(c[1:])-1; t,acc,sub=BANCO[ax][n]
            hf=f"{OUT}/{c}.html"; open(hf,"w").write(html({"A":"PORTAL INTEGRADO","B":"MEJORA ISO","C":"PROCESOS Y TAREAS","D":"DASHBOARD EN TIEMPO REAL","E":"TU ISO EN SEMANAS","F":"MODELOS DE RELACIÓN"}[ax],t,acc,sub))
            await pg.goto("file://"+hf); await pg.wait_for_timeout(300)
            await pg.evaluate("document.getAnimations().forEach(a=>a.pause())")
            fd=f"{OUT}/frames_{c}"; shutil.rmtree(fd,ignore_errors=True); os.makedirs(fd)
            N=int(DUR*FPS)
            for i in range(N):
                ms=i*1000/FPS
                await pg.evaluate(f"document.getAnimations().forEach(a=>{{a.currentTime={ms}}})")
                await pg.screenshot(path=f"{fd}/f{i:04d}.png")
            subprocess.run(["ffmpeg","-y","-loglevel","error","-framerate",str(FPS),"-i",f"{fd}/f%04d.png","-c:v","libx264","-pix_fmt","yuv420p","-crf","20","-movflags","+faststart",f"{OUT}/{c}.mp4"],check=True)
            shutil.rmtree(fd); print("reel",c,os.path.getsize(f"{OUT}/{c}.mp4")//1024,"KB")
        await b.close()
asyncio.run(render(sys.argv[1:]))
