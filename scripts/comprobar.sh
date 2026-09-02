#!/bin/sh
# Todo lo que hay que pasar antes de entregar.
#
# ESLint sustituye a `buscar-imports.py`: hace lo mismo pero entendiendo el
# ámbito de las variables, en vez de con expresiones regulares. Mi versión con
# regex daba 128 falsos positivos, que es lo mismo que no tener detector.
set -e
cd "$(dirname "$0")/.."

echo "── ESLint · variables y componentes sin declarar ──"
(cd consultify/app && npx eslint src --quiet)
echo "  sin errores"

echo ""
echo "── Efectos con retorno peligroso ──"
python3 scripts/buscar-efectos.py

echo ""
echo "── Variables leídas antes de declararse ──"
python3 scripts/buscar-tdz.py

echo ""
echo "── Compilación ──"
(cd consultify/app && npm run build >/dev/null 2>&1 && echo "  correcta")
