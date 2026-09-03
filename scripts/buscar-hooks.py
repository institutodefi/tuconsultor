#!/usr/bin/env python3
"""
Busca hooks de React declarados DESPUÉS de un `return` temprano.

React exige que un componente ejecute siempre los mismos hooks en el mismo
orden. Un `useMemo` colocado detrás de `if (cargando) return …` no corre en el
primer render y sí en el segundo, y eso lanza:

    Minified React error #310
    Rendered more hooks than during the previous render

La pantalla entera se cae, y esbuild no dice nada: es un error de ejecución.

Esto lo cazaría `eslint-plugin-react-hooks`, pero ese plugin arrastra su propia
cadena de dependencias y ya nos costó tres despliegues fallidos añadir ESLint.
Para una regla concreta, sale más barato esto.

Uso:
    python3 scripts/buscar-hooks.py [carpeta]
"""
import os
import re
import sys

RAIZ = sys.argv[1] if len(sys.argv) > 1 else 'consultify/app/src'
HOOKS = r'use(?:State|Effect|Memo|Callback|Ref|Context|Reducer|LayoutEffect)\s*\('


def analizar(path):
    lineas = open(path, encoding='utf-8').read().split('\n')
    fallos = []
    dentro = False          # dentro del cuerpo de un componente
    corte = None            # línea del primer return de nivel superior

    for i, l in enumerate(lineas):
        if re.match(r'^(?:export default )?function [A-Z]\w*\(', l) \
           or re.match(r'^(?:export )?const [A-Z]\w*\s*=\s*(?:\([^)]*\)|\w+)\s*=>', l):
            dentro, corte = True, None
            continue
        if dentro and re.match(r'^\}', l):
            dentro, corte = False, None
            continue
        if not dentro:
            continue

        # `return` a dos espacios de sangría: sale del componente.
        if re.match(r'^  if\s*\(.*\)\s*return\b', l) or re.match(r'^  return\b', l):
            if corte is None and 'return (' not in l:
                corte = i + 1
            continue

        # Un hook por debajo de ese return: se ejecuta condicionalmente.
        if corte and re.search(r'^\s+const .*=\s*' + HOOKS, l):
            m = re.search(HOOKS, l)
            fallos.append((i + 1, corte, m.group(0).rstrip('('), l.strip()[:70]))
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
            for lin, ret, hook, txt in analizar(p):
                print(f'  ⚠ {p}:{lin}  {hook} después del return de la línea {ret}')
                print(f'      {txt}')
                total += 1

    print(f'\nhooks tras un return: {total}')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
