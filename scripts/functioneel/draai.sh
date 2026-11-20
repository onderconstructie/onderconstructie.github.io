#!/bin/sh
# Draait de korte reeks (alles behalve de zes lange tests) en kijkt bij elke test naar twee dingen:
# de exitcode én wat ze meldt. Een deel van de oudere tests meldt een fout alleen in tekst en stopt toch met 0;
# zonder de tweede controle lijkt zo'n test geslaagd. Gebruik: BASE=http://127.0.0.1:8970 PORT=8970 sh scripts/functioneel/draai.sh
cd "$(dirname "$0")/../.." || exit 2
LOGS=${LOGS:-/tmp/oc-tests}; mkdir -p "$LOGS"; rm -f "$LOGS"/*.log
ls scripts/functioneel/*.js | grep -v -e robuust -e bestand-en-veiligheid -e delen-kladblok-logica -e voorbeeld-eigen-logica -e voorbeeld-herladen-logica -e gegevens-gaan-mee \
  | xargs -P "${PAR:-3}" -I{} sh -c 'timeout 240 node {} >"'"$LOGS"'/$(basename {}).log" 2>&1; echo "$? {}"' > "$LOGS/exit.txt"
mis=0
while read -r code f; do
  log="$LOGS/$(basename "$f").log"
  if [ "$code" != 0 ]; then echo "MISLUKT (exit $code): $f"; mis=$((mis+1));
  elif grep -qE '(^|[^a-z])FOUT|fouten:? *[1-9]|problemen: *[1-9]|paginafouten:? *[1-9]' "$log"; then echo "MELDT EEN FOUT (exit 0): $f"; grep -E 'FOUT|fouten:? *[1-9]|problemen: *[1-9]' "$log" | head -3; mis=$((mis+1)); fi
done < "$LOGS/exit.txt"
echo "$(wc -l < "$LOGS/exit.txt") tests, $mis mislukt"
[ "$mis" = 0 ]
