#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FW="$ROOT/ESP32 local code/SeraSmart"
ST="$ROOT/tests/cpp-stubs"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
for file in "$FW"/*.cpp; do
    g++ -std=c++17 -Wall -Wextra -Werror -fsyntax-only -I"$ST" -I"$FW" "$file"
done
g++ -std=c++17 -Wall -Wextra -Werror -fsyntax-only -x c++ -I"$ST" -I"$FW" "$FW/SeraSmart.ino"
g++ -std=c++17 -Wall -Wextra -Werror -I"$ST" -I"$FW" \
  "$ST/firmware-readings.cpp" "$FW/SenzorLumina.cpp" "$FW/SenzorUmiditateSol.cpp" -o "$OUT/readings"
"$OUT/readings"
echo 'PASS: firmware source parses with offline stubs and light/soil mapping tests pass'
