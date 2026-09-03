#!/usr/bin/env python3
"""
Campaña de los Premios Vanguardistas para LinkedIn e Instagram.

Sobre la frecuencia: se pidió publicación diaria hasta el 30 de octubre. Son 58
días, y publicar todos los días lo mismo en LinkedIn agota a la audiencia y
baja el alcance de la propia cuenta —el algoritmo penaliza a quien satura—.

Así que se genera el calendario completo, día a día, pero con **rotación de
ángulos**: cada día se cuenta algo distinto de los premios, no el mismo aviso.
Y las dos redes llevan tono distinto porque no se lee igual una cosa que otra.

Además, tres piezas se marcan como `intensidad=alta`: apertura, mitad de plazo
y últimos días. Son las que conviene impulsar si hay presupuesto.

    python3 scripts/premios-social.py
"""
import csv
import json
import os
import sys
from datetime import date, timedelta

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON = os.path.join(RAIZ, 'web', 'premios', 'bases-2026.json')
DESTINO = os.path.join(RAIZ, 'social-calendario')

URL = 'https://www.tuconsultor.com/premios/'

# ── Los ángulos, en el orden en que se van rotando ──
# Cada uno cuenta algo distinto: el premio no cambia, lo que se cuenta de él sí.
ANGULOS = [
    ('apertura',    'Abrimos plazo'),
    ('espiritu',    'Premiamos proyectos, no organizaciones'),
    ('ambito',      'Un ámbito concreto'),
    ('categoria',   'A quién va dirigido'),
    ('requisito',   'Qué buscamos'),
    ('facilidad',   'Siete minutos'),
    ('premio',      'El Premio Especial XX Aniversario'),
    ('devolucion',  'Todas reciben evaluación'),
    ('edicion',     'Ediciones anteriores'),
    ('pregunta',    'Una de las cinco preguntas'),
    ('jurado',      'Cómo se evalúa'),
    ('acto',        'El acto de entrega'),
    ('cuenta',      'Cuenta atrás'),
]


def cargar():
    return json.load(open(JSON, encoding='utf-8'))


def textos(b, angulo, i, dias_restantes):
    """Devuelve (texto_linkedin, texto_instagram) para un ángulo."""
    ed, pe, acto = b['edicion'], b['premioEspecial'], b['actoEntrega']
    amb = b['ambitos'][i % len(b['ambitos'])]
    cat = b['categorias'][i % len(b['categorias'])]
    req = b['requisitos'][i % len(b['requisitos'])]
    blq = b['candidatura']['bloques'][i % len(b['candidatura']['bloques'])]
    ant = b['edicionesAnteriores'][i % len(b['edicionesAnteriores'])]
    cri = b['evaluacion']['criterios'][i % len(b['evaluacion']['criterios'])]
    quedan = f'Quedan {dias_restantes} días' if dias_restantes > 1 else 'Último día'

    T = {
        'apertura': (
            f"Abrimos la {ed['ordinal']} edición de los Premios Vanguardistas.\n\n"
            f"{ed['claim']}\n\n"
            "Veinte años trabajando con más de 150 organizaciones al año nos han enseñado algo: "
            "el avance real no lo traen los grandes anuncios, sino los proyectos que un equipo "
            "se empeña en sacar adelante.\n\n"
            "Esos son los que premiamos.\n\n"
            f"Plazo hasta el 30 de octubre. {URL}",
            f"Abrimos la {ed['ordinal']} edición de los Premios Vanguardistas ✨\n\n"
            f"{ed['claim']}\n\n"
            "Si tu equipo ha sacado adelante un proyecto que cambió algo, cuéntanoslo.\n\n"
            "Enlace en la bio · Hasta el 30 de octubre"),

        'espiritu': (
            f"{b['introduccion']['espiritu']}\n\n"
            "No pedimos que la organización sea perfecta. Pedimos un proyecto concreto, "
            "con un antes y un después que se pueda medir.\n\n"
            f"{quedan} de plazo. {URL}",
            "Estos premios no reconocen organizaciones.\n\nReconocen proyectos.\n\n"
            "Iniciativas concretas que un equipo se empeñó en sacar adelante y que "
            "cambiaron algo dentro de su organización.\n\nEnlace en la bio"),

        'ambito': (
            f"Ámbito: {amb['nombre']}.\n\n{amb['descripcion']}\n\n"
            "Es uno de los cuatro ámbitos de los Premios Vanguardistas. Si tu equipo ha "
            "trabajado en esta línea durante 2025 o 2026, la candidatura son siete minutos.\n\n"
            f"{URL}",
            f"{amb['nombre']}\n\n{amb['descripcion']}\n\n"
            f"Uno de los cuatro ámbitos de los Premios Vanguardistas.\n\n{quedan} · Enlace en la bio"),

        'categoria': (
            f"Categoría: {cat['nombre']} — {cat['alcance']}.\n\n"
            "Los premios se evalúan por categoría, así que una pyme no compite contra una "
            "multinacional. Lo que se compara es el avance, no el tamaño.\n\n"
            f"{quedan} de plazo. {URL}",
            f"{cat['nombre']} · {cat['alcance']}\n\n"
            "Cada categoría se evalúa por separado: lo que se compara es el avance, "
            "no el tamaño.\n\nEnlace en la bio"),

        'requisito': (
            f"Qué buscamos: {req['nombre'].lower()}.\n\n{req['descripcion']}\n\n"
            "Es uno de los tres requisitos de los Premios Vanguardistas. Los otros dos, "
            f"en las bases.\n\n{URL}",
            f"{req['nombre']}\n\n{req['descripcion']}\n\n"
            "Uno de los tres requisitos de los Premios Vanguardistas.\n\nEnlace en la bio"),

        'facilidad': (
            "Siete minutos.\n\n"
            "Eso es lo que se tarda en presentar una candidatura a los Premios Vanguardistas: "
            "cinco preguntas sobre lo que hicisteis, cómo y qué salió de ello.\n\n"
            "No hay que preparar una memoria ni maquetar nada.\n\n"
            f"{quedan}. {URL}",
            "7 minutos.\n\nEso es lo que cuesta presentar tu candidatura.\n\n"
            "Cinco preguntas. Sin memorias ni maquetación.\n\nEnlace en la bio"),

        'premio': (
            f"{pe['nombre']}.\n\n{pe['descripcion']}\n\n"
            f"Dotación: {pe['dotacion'][0]['importe']:,} € y un Informe GAP Estratégico "
            f"basado en el Modelo MAGIC®, valorado en {pe['dotacion'][1]['importe']:,} €.\n\n"
            f"{URL}".replace(',', '.'),
            f"Premio Especial XX Aniversario 🏆\n\n"
            f"{pe['dotacion'][0]['importe']:,} € + Informe GAP Estratégico "
            f"(Modelo MAGIC®, {pe['dotacion'][1]['importe']:,} €)\n\n"
            "Al mejor vanguardista de esta edición, entre todas las candidaturas.\n\n"
            "Enlace en la bio".replace(',', '.')),

        'devolucion': (
            f"{b['evaluacion']['feedback']}\n\n"
            "Es la parte que más agradecen las organizaciones que se presentan: aunque no "
            "ganen, se llevan una lectura externa de su proyecto.\n\n"
            f"{quedan} de plazo. {URL}",
            "Todas las candidaturas reciben su evaluación.\n\n"
            "Puntos fuertes y aspectos en los que seguir avanzando.\n\n"
            "Ganes o no, te llevas una lectura externa de tu proyecto.\n\nEnlace en la bio"),

        'edicion': (
            f"En {ant['anio']} entregamos {ant['premios']} premios y {ant['menciones']} menciones "
            f"en {ant['lugar']}.\n\n"
            "Cada edición nos enseña algo: que el avance no depende del tamaño ni del sector, "
            "sino de que alguien decida empezar.\n\n"
            f"Esta edición cierra el 30 de octubre. {URL}",
            f"Edición {ant['anio']}: {ant['premios']} premios y {ant['menciones']} menciones.\n\n"
            "El avance no depende del tamaño ni del sector.\n\nEnlace en la bio"),

        'pregunta': (
            f"«{blq['titulo']}»\n\n{blq['ayuda']}\n\n"
            "Es una de las cinco preguntas de la candidatura. Ninguna necesita más de un párrafo.\n\n"
            f"{quedan}. {URL}",
            f"«{blq['titulo']}»\n\n{blq['ayuda']}\n\n"
            "Una de las cinco preguntas de la candidatura.\n\nEnlace en la bio"),

        'jurado': (
            f"Criterio de evaluación: {cri['nombre'].lower()}.\n\n{cri['descripcion']}\n\n"
            "Un jurado de profesionales de la gestión, sin vinculación con los proyectos "
            "presentados y con compromiso de confidencialidad.\n\n"
            f"{URL}",
            f"{cri['nombre']}\n\n{cri['descripcion']}\n\n"
            "Uno de los tres criterios del jurado.\n\nEnlace en la bio"),

        'acto': (
            f"El {acto['diaSemana']} 3 de diciembre, a las {acto['hora']} h, "
            f"en el {acto['lugar']} de {acto['ciudad']}.\n\n"
            f"En el marco del {acto['marco'].lower()}.\n\n"
            f"{quedan} para presentar tu candidatura. {URL}",
            f"3 de diciembre · {acto['hora']} h\n{acto['lugar']}, {acto['ciudad']}\n\n"
            "Acto de entrega de los Premios Vanguardistas, dentro de la celebración "
            "del XX Aniversario.\n\nEnlace en la bio"),

        'cuenta': (
            f"{quedan} para presentar tu candidatura a los Premios Vanguardistas.\n\n"
            "Siete minutos, cinco preguntas, un proyecto que cambió algo en tu organización.\n\n"
            f"{URL}",
            f"{quedan} ⏳\n\nSiete minutos. Cinco preguntas.\n\n"
            "Un proyecto que cambió algo en tu organización.\n\nEnlace en la bio"),
    }
    return T[angulo]


def main():
    b = cargar()
    inicio = date(2026, 9, 3)          # desde hoy
    cierre = date(2026, 10, 30)

    filas = []
    d = inicio
    i = 0
    while d <= cierre:
        quedan = (cierre - d).days
        # Los últimos siete días son cuenta atrás: el ángulo deja de rotar.
        if quedan <= 7:
            angulo = 'cuenta'
        elif d == inicio:
            angulo = 'apertura'
        else:
            angulo = ANGULOS[(i % (len(ANGULOS) - 2)) + 1][0]   # sin apertura ni cuenta

        li, ig = textos(b, angulo, i, quedan)

        # Intensidad: apertura, mitad de plazo y recta final. Son las que
        # conviene impulsar si hay presupuesto; el resto sostienen la presencia.
        alta = (d == inicio) or (quedan == 28) or (quedan <= 3)

        filas.append({
            'fecha': d.isoformat(), 'hora': '09:00', 'red': 'linkedin',
            'serie': 'PREMIOS', 'tema': angulo, 'texto': li,
            'imagen': f'social-img/premios/{angulo}.png', 'enlace': URL,
            'intensidad': 'alta' if alta else 'normal',
        })
        filas.append({
            'fecha': d.isoformat(), 'hora': '19:00', 'red': 'instagram',
            'serie': 'PREMIOS', 'tema': angulo, 'texto': ig,
            'imagen': f'social-img/premios/{angulo}.png', 'enlace': URL,
            'intensidad': 'alta' if alta else 'normal',
        })
        d += timedelta(days=1)
        i += 1

    os.makedirs(DESTINO, exist_ok=True)
    salida = os.path.join(DESTINO, 'premios-vanguardistas-2026.csv')
    with open(salida, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['fecha', 'hora', 'red', 'serie', 'tema',
                                          'texto', 'imagen', 'enlace', 'intensidad'],
                           delimiter=';', quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(filas)

    dias = (cierre - inicio).days + 1
    print(f'✓ {salida}')
    print(f'  {dias} días · {len(filas)} publicaciones ({dias} LinkedIn + {dias} Instagram)')
    print(f'  {len(set(f["tema"] for f in filas))} ángulos distintos, rotando')
    print(f'  {sum(1 for f in filas if f["intensidad"] == "alta") // 2} días marcados como alta intensidad')
    return 0


if __name__ == '__main__':
    sys.exit(main())
