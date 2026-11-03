#!/bin/sh
# imprime só gv e iv de um lote
sed -n '1,/^tv(code, name)/p' "$1" | sed '$d'
