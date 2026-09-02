#!/usr/bin/env python3
"""
Busca `useEffect` cuya función devuelve algo que NO es una función de limpieza.

React llama a lo que devuelve el efecto cuando el componente se desmonta. Si eso
es una promesa o el resultado de un `setState`, salta «X is not a function» —y lo
peor: el error aparece en la pantalla a la que se navega, no en la que lo causa,
así que se busca donde no está.

Tres formas de meter la pata:
    useEffect(cargar, [])            si `cargar` devuelve algo
    useEffect(() => setX(1), [])     devuelve el resultado de setX
    useEffect(async () => {…}, [])   devuelve una promesa

Lo correcto: `useEffect(() => { cargar(); }, [])`.
"""
import re, os, sys

RAIZ = sys.argv[1] if len(sys.argv) > 1 else 'consultify/app/src'
COMENTARIO = re.compile(r'^\s*(//|\*|/\*)')

def revisar(path):
    fallos = []
    lineas = open(path, encoding='utf-8').read().split('\n')
    for i, l in enumerate(lineas):
        if COMENTARIO.match(l):
            continue
        if re.search(r'useEffect\(\s*async\b', l):
            fallos.append((i + 1, 'async: devuelve una promesa', l.strip()))
        m = re.search(r'useEffect\(\s*(\w+)\s*,\s*\[', l)
        if m and m.group(1) not in ('function',):
            fallos.append((i + 1, f'referencia directa a «{m.group(1)}»', l.strip()))
        m2 = re.search(r'useEffect\(\s*\(\s*\)\s*=>\s*(?![\{\n])([^,;]+),\s*\[', l)
        if m2:
            fallos.append((i + 1, 'retorno implícito', l.strip()))
    return fallos

total = 0
for r, d, fs in os.walk(RAIZ):
    if 'node_modules' in r:
        continue
    for f in sorted(fs):
        if not f.endswith(('.jsx', '.js')):
            continue
        p = os.path.join(r, f)
        for lin, motivo, txt in revisar(p):
            print(f'  ⚠ {p}:{lin}  {motivo}')
            print(f'      {txt[:90]}')
            total += 1

print(f'\nefectos con retorno peligroso: {total}')
sys.exit(1 if total else 0)
