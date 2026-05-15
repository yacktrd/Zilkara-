#!/usr/bin/env bash
set -euo pipefail

echo "==> Fusion CSS Xyvala: ui.css -> app/globals.css"

ROOT_DIR="$(pwd)"
UI_FILE="$ROOT_DIR/ui.css"
GLOBAL_FILE="$ROOT_DIR/app/globals.css"
LAYOUT_FILE="$ROOT_DIR/app/layout.tsx"
BACKUP_DIR="$ROOT_DIR/.backup_xyvala_css_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "==> Vérification des fichiers..."
if [ ! -f "$UI_FILE" ]; then
  echo "ERREUR: ui.css introuvable à la racine."
  exit 1
fi

if [ ! -f "$LAYOUT_FILE" ]; then
  echo "ERREUR: app/layout.tsx introuvable."
  exit 1
fi

mkdir -p "$ROOT_DIR/app"

if [ -f "$GLOBAL_FILE" ]; then
  cp "$GLOBAL_FILE" "$BACKUP_DIR/globals.css.bak"
  echo "Backup globals.css -> $BACKUP_DIR/globals.css.bak"
fi

cp "$UI_FILE" "$BACKUP_DIR/ui.css.bak"
cp "$LAYOUT_FILE" "$BACKUP_DIR/layout.tsx.bak"

echo "==> Fusion dans app/globals.css"

if [ -f "$GLOBAL_FILE" ]; then
  if grep -q "Fusion source: ui.css" "$GLOBAL_FILE"; then
    echo "globals.css semble déjà fusionné. Passage à la suite."
  else
    {
      printf '\n\n/* ===== Fusion source: ui.css ===== */\n\n'
      cat "$UI_FILE"
      printf '\n'
    } >> "$GLOBAL_FILE"
  fi
else
  {
    printf '/* ===== Fusion source: ui.css ===== */\n\n'
    cat "$UI_FILE"
    printf '\n'
  } > "$GLOBAL_FILE"
fi

echo "==> Correction de app/layout.tsx"

python3 <<'PY'
from pathlib import Path
import re

layout = Path("app/layout.tsx")
text = layout.read_text(encoding="utf-8")

# Supprime les imports ui.css ou globals.css existants
text = re.sub(r'^\s*import\s+["\'].*ui\.css["\'];?\s*\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*import\s+["\']\.\/globals\.css["\'];?\s*\n', '', text, flags=re.MULTILINE)

# Réinjecte un import unique en tête
text = 'import "./globals.css";\n' + text.lstrip()

layout.write_text(text, encoding="utf-8")
PY

echo "==> Suppression de ui.css"
rm -f "$UI_FILE"

echo "==> Vérification des références restantes à ui.css"
if grep -R "ui.css" . --exclude-dir=node_modules --exclude-dir=.next; then
  echo "ATTENTION: il reste encore des références à ui.css ci-dessus."
else
  echo "OK: aucune référence restante à ui.css."
fi

echo "==> Nettoyage cache Next"
rm -rf .next

echo
echo "Terminé."
echo "Backups disponibles dans: $BACKUP_DIR"
echo
echo "Commandes suivantes recommandées:"
echo "  npm run dev"


