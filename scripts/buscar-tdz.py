#!/usr/bin/env python3
"""
Busca variables leídas ANTES de su declaración dentro de un componente.

JavaScript no permite leer una `const` o `let` antes de su línea de declaración:
lanza «Cannot access X before initialization». Y esbuild NO lo detecta, porque
solo es un error si esa línea llega a ejecutarse.

Tres sitios donde pasa, y los tres han ocurrido de verdad:

    const importables = useMemo(() => vista[x], [vista]);   // ← vista más abajo
    const vista = form || empresa;

    useEffect(() => {…}, [candidatas.length]);              // ← el ARRAY DE
    const candidatas = useMemo(…);                          //   DEPENDENCIAS se
                                                            //   evalúa en el
                                                            //   render, aquí

    const x = nombreCli(id);                                // ← nombreCli abajo
    const nombreCli = (id) => …;

El tercero es el más traicionero: el array de dependencias de un `useEffect` se
evalúa DURANTE el render, en el punto donde está escrito, no cuando el efecto
corre. Poner el efecto antes de lo que depende revienta la pantalla entera.

Uso:
    python3 scripts/buscar-tdz.py [carpeta]
"""
import os
import re
import sys

RAIZ = sys.argv[1] if len(sys.argv) > 1 else 'consultify/app/src'

PALABRAS = {
    'if', 'else', 'return', 'const', 'let', 'var', 'function', 'true', 'false',
    'null', 'undefined', 'new', 'typeof', 'await', 'async', 'try', 'catch',
    'for', 'while', 'switch', 'case', 'break', 'continue', 'this', 'default',
    'import', 'export', 'from', 'as', 'of', 'in', 'delete', 'void', 'yield',
}


def sin_texto(linea):
    """Vacía cadenas y comentarios: dentro no hay código que analizar."""
    linea = re.sub(r'//.*$', '', linea)
    linea = re.sub(r'"[^"]*"', '""', linea)
    linea = re.sub(r"'[^']*'", "''", linea)
    linea = re.sub(r'`[^`]*`', '``', linea)
    return linea


def analizar(path):
    lineas = open(path, encoding='utf-8').read().split('\n')

    # Declaraciones en el cuerpo del componente (dos espacios de sangría).
    decl = {}
    for i, l in enumerate(lineas):
        m = re.match(r'^  (?:const|let)\s+(\w+)\s*=', l)
        if m and m.group(1) not in decl:
            decl[m.group(1)] = i

    fallos = []
    for nombre, lin in decl.items():
        if nombre in PALABRAS:
            continue
        for i in range(lin):
            l = sin_texto(lineas[i])
            if re.match(r'\s*(?:\*|/\*)', l):
                continue
            if not re.search(r'(?<![\w.])' + re.escape(nombre) + r'(?![\w:])', l):
                continue

            # ¿Se evalúa en el render, o está dentro de algo diferido?
            atras = '\n'.join(sin_texto(x) for x in lineas[max(0, i - 60):i + 1])

            # Array de dependencias: `}, [ … ]);` — SIEMPRE se evalúa en render.
            if re.search(r'\}\s*,\s*\[[^\]]*$', atras) or re.match(r'\s*\},?\s*\[', l):
                fallos.append((i + 1, lin + 1, nombre, lineas[i].strip()[:70], 'dependencias'))
                break

            # `() => cargar()` es SEGURO: la llamada ocurre cuando alguien
            # invoca la función, no ahora. Es el patrón de `useLote(lista, () => cargar())`.
            if re.search(r'\(\s*\)\s*=>\s*' + re.escape(nombre) + r'\s*\(', l):
                continue

            difs = list(re.finditer(
                r'\n  (?:async )?function \w+|\n  const \w+ = (?:async )?(?:\([^)]*\)|\w+) =>\s*\{'
                r'|onClick=\{|onChange=\{|onSubmit=\{|\.then\(|catch\s*\(', atras))
            memos = list(re.finditer(r'useMemo\(|useCallback\(|useEffect\(', atras))
            if memos and (not difs or memos[-1].start() > difs[-1].start()):
                fallos.append((i + 1, lin + 1, nombre, lineas[i].strip()[:70], 'hook'))
                break
    return fallos


def main():
    total = 0
    for r, d, fs in os.walk(RAIZ):
        if 'node_modules' in r:
            continue
        for f in sorted(fs):
            if not f.endswith(('.jsx', '.js')):
                continue
            p = os.path.join(r, f)
            for uso, dec, nombre, txt, tipo in analizar(p):
                marca = ' ← ARRAY DE DEPENDENCIAS' if tipo == 'dependencias' else ''
                print(f'  ⚠ {p}:{uso}  «{nombre}» se lee aquí y se declara en la {dec}{marca}')
                print(f'      {txt}')
                total += 1

    print(f'\nvariables leídas antes de declararse: {total}')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
