#!/usr/bin/env python3
"""
Sustituye el logotipo de TuConsultor por el del 20 aniversario en toda la web.

Se ejecuta UNA vez, cuando los archivos del aniversario estén en `web/marca/`.
Hasta entonces avisa y no toca nada: dejar la web con rutas a ficheros que no
existen es peor que no haber empezado.

Qué sustituye
-------------
    horizontal-dark.svg    → 20a-horizontal-solido.svg    (fondos claros)
    horizontal-claro.svg   → 20a-horizontal-blanco.svg    (fondos oscuros)
    horizontal-dark@2x.png → 20a-horizontal-solido.png    (datos estructurados)

El logo del aniversario es más alto que el normal —el isotipo va al 180 % y
lleva el bloque del «20» debajo—, así que las alturas fijas de las cabeceras se
suben un 20 % para que no se vea aplastado.

Uso
---
    python3 scripts/logo-20-aniversario.py            comprueba y avisa
    python3 scripts/logo-20-aniversario.py --aplicar  sustituye de verdad
"""
import glob
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARCA = os.path.join(RAIZ, 'web', 'marca')

# origen → destino. El destino tiene que existir en web/marca/ antes de aplicar.
SUSTITUCIONES = {
    'horizontal-dark.svg': '20a-horizontal-solido.svg',
    'horizontal-claro.svg': '20a-horizontal-blanco.svg',
    'horizontal-dark@2x.png': '20a-horizontal-solido.png',
    'isotipo-dark.svg': '20a-isotipo-solido.svg',
    'isotipo-dark@2x.png': '20a-isotipo-solido.png',
}

# Alturas que hay que subir: el lockup del aniversario es más alto.
ALTURAS = [
    ('height:40px', 'height:48px'),
    ('height:34px', 'height:41px'),
    ('height:28px', 'height:34px'),
    ('height:24px', 'height:29px'),
]


def presentes():
    """Qué destinos existen ya."""
    return {d: os.path.exists(os.path.join(MARCA, d)) for d in set(SUSTITUCIONES.values())}


def main():
    aplicar = '--aplicar' in sys.argv
    hay = presentes()
    faltan = [d for d, ok in hay.items() if not ok]

    print('Archivos del 20 aniversario en web/marca/:')
    for d, ok in sorted(hay.items()):
        print(f'  {"✓" if ok else "✗"} {d}')

    if faltan:
        print(f'\nFaltan {len(faltan)}. No se toca nada.')
        print('Deja los archivos en web/marca/ con esos nombres exactos y vuelve a ejecutar.')
        print('\nQué hace falta de cada uno:')
        print('  · monocromo SÓLIDO (negro o el azul #0F1730) para fondos claros')
        print('  · blanco SÓLIDO para fondos oscuros')
        print('  · SVG para pantalla; el PNG solo para los datos estructurados')
        return 1

    # Inventario antes de tocar
    ficheros = sorted(glob.glob(os.path.join(RAIZ, 'web', '**', '*.html'), recursive=True))
    total = 0
    tocados = 0
    for f in ficheros:
        t = open(f, encoding='utf-8').read()
        original = t
        for viejo, nuevo in SUSTITUCIONES.items():
            n = t.count(f'/marca/{viejo}')
            if n:
                total += n
                t = t.replace(f'/marca/{viejo}', f'/marca/{nuevo}')
        # Alturas, solo en las líneas que llevan el logo nuevo
        if t != original:
            for a, b in ALTURAS:
                t = re.sub(
                    r'(20a-horizontal[^"]*"[^>]*?)' + re.escape(a),
                    lambda m: m.group(1) + b, t)
        if t != original:
            tocados += 1
            if aplicar:
                open(f, 'w', encoding='utf-8').write(t)

    print(f'\n{total} referencias en {tocados} archivos.')
    if aplicar:
        print('Sustituidas. Revisa la cabecera y el pie antes de desplegar.')
    else:
        print('Nada escrito. Ejecuta con --aplicar para hacerlo de verdad.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
