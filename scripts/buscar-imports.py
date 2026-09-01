#!/usr/bin/env python3
"""
Busca componentes usados en JSX que no están importados ni definidos.

Por qué hace falta: esbuild NO comprueba esto. Un `<EquipoProyecto />` sin su
`import` compila perfectamente y revienta en el navegador con
«X is not defined», y solo cuando alguien entra en esa pantalla concreta. Ha
pasado dos veces.

Detecta un componente como «usado» si aparece como `<Nombre` con inicial
mayúscula, y lo da por resuelto si está importado, definido en el mismo archivo,
o es un elemento conocido de React.

Uso:
    python3 scripts/buscar-imports.py            revisa consultify/app/src
    python3 scripts/buscar-imports.py ruta/      revisa otra carpeta
"""
import os
import re
import sys

RAIZ = sys.argv[1] if len(sys.argv) > 1 else 'consultify/app/src'

# Elementos que React resuelve sin import.
CONOCIDOS = {'Fragment', 'Suspense', 'StrictMode', 'Profiler'}


def sin_comentarios(txt):
    """Quita comentarios de bloque y de línea.

    Sin esto, un comentario como «PR-<PREFIJO>-NN» o «la calculadora viva es
    <GeneradorOfertas>» se contaba como uso de un componente. Los dos primeros
    avisos que dio este script eran exactamente eso.
    """
    txt = re.sub(r'/\*.*?\*/', '', txt, flags=re.S)
    txt = re.sub(r'^\s*//.*$', '', txt, flags=re.M)
    # Comentarios al final de una línea de código, sin tocar las URL (http://)
    txt = re.sub(r'(?<![:"\'])//[^\n]*$', '', txt, flags=re.M)
    return txt


def analizar(path):
    crudo = open(path, encoding='utf-8').read()
    # Los imports se leen del texto ORIGINAL: quitar comentarios podría
    # comerse alguno mal formado y dar un falso positivo peor.
    txt = crudo

    # Lo que el archivo tiene disponible
    disponibles = set(CONOCIDOS)
    #   import X from …   /   import X, { a, b } from …
    for m in re.finditer(r'^import\s+(\w+)\s*(?:,\s*\{([^}]*)\})?\s*from', txt, re.M):
        disponibles.add(m.group(1))
        if m.group(2):
            for n in m.group(2).split(','):
                disponibles.add(n.strip().split(' as ')[-1].strip())
    #   import { a, b } from …
    for m in re.finditer(r'^import\s*\{([^}]*)\}\s*from', txt, re.M):
        for n in m.group(1).split(','):
            disponibles.add(n.strip().split(' as ')[-1].strip())
    #   import * as X from …
    for m in re.finditer(r'^import\s+\*\s+as\s+(\w+)\s+from', txt, re.M):
        disponibles.add(m.group(1))
    #   definidos aquí mismo
    for m in re.finditer(r'^\s*(?:export\s+default\s+)?(?:export\s+)?(?:function|class)\s+(\w+)', txt, re.M):
        disponibles.add(m.group(1))
    for m in re.finditer(r'^\s*(?:export\s+)?const\s+(\w+)\s*=', txt, re.M):
        disponibles.add(m.group(1))

    # Lo que se usa en JSX, ya sin comentarios.
    codigo = sin_comentarios(crudo)
    fallos = []
    for m in re.finditer(r'<([A-Z]\w*)[\s/>]', codigo):
        nombre = m.group(1)
        if nombre in disponibles:
            continue
        linea = codigo[:m.start()].count('\n') + 1
        fallos.append((linea, nombre))
    return fallos


def main():
    total = 0
    for r, d, fs in os.walk(RAIZ):
        if 'node_modules' in r:
            continue
        for f in sorted(fs):
            if not f.endswith('.jsx'):
                continue
            p = os.path.join(r, f)
            vistos = set()
            for linea, nombre in analizar(p):
                if nombre in vistos:
                    continue
                vistos.add(nombre)
                print(f'  ⚠ {p}:{linea}  «{nombre}» se usa pero no está importado')
                total += 1

    print(f'\ncomponentes sin importar: {total}')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
