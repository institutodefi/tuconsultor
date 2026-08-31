# Barrido más estricto: cualquier uso de una variable de componente antes de su
# declaración, dentro de expresiones que se evalúan DURANTE el render
# (useMemo, useCallback con deps, JSX de nivel superior, llamadas directas).
import re, os

def analizar(path):
    txt = open(path, encoding='utf-8').read()
    lineas = txt.split('\n')
    fallos = []

    # Declaraciones const/let en el cuerpo del componente (sangría de 2)
    decl = {}
    for i, l in enumerate(lineas):
        m = re.match(r'^  (?:const|let) (\w+)\s*=', l)
        if m and m.group(1) not in decl:
            decl[m.group(1)] = i

    # Zonas que se evalúan en render: useMemo(...) y expresiones de nivel 2
    for nombre, lin in decl.items():
        for i in range(lin):
            l = lineas[i]
            if re.match(r'\s*(//|\*|/\*)', l):
                continue
            if not re.search(r'(?<![\w.])' + re.escape(nombre) + r'(?![\w])', l):
                continue
            # ¿está dentro de una función que se ejecuta después?
            atras = '\n'.join(lineas[max(0, i - 60):i + 1])
            # último abridor de bloque diferido antes de esta línea
            difs = list(re.finditer(r'\n  (?:async )?function \w+|\n  const \w+ = (?:async )?(?:\([^)]*\)|\w+) =>\s*\{|onClick=\{|onChange=\{', atras))
            memos = list(re.finditer(r'useMemo\(|useCallback\(', atras))
            ultimo_dif = difs[-1].start() if difs else -1
            ultimo_memo = memos[-1].start() if memos else -1
            if ultimo_memo > ultimo_dif:
                fallos.append((i + 1, lin + 1, nombre, l.strip()[:72]))
                break
    return fallos

total = 0
for r, d, fs in os.walk('.'):
    if 'node_modules' in r: continue
    for f in sorted(fs):
        if not f.endswith(('.jsx', '.js')): continue
        p = os.path.join(r, f)
        for uso, dec, n, l in analizar(p):
            print(f'  ⚠ {p}:{uso} usa «{n}» declarada en {dec}')
            print(f'      {l}')
            total += 1
print('casos:', total)
