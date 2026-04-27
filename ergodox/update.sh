#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <oryx-source-url>"
  echo "  e.g. $0 https://oryx.zsa.io/source/nlDgQ0"
  exit 1
fi

URL="$1"
DEST="$(cd "$(dirname "$0")" && pwd)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Downloading $URL..."
curl -sL "$URL" -o "$TMP/source.zip"

echo "Extracting..."
unzip -q "$TMP/source.zip" -d "$TMP/extracted"

SRC=$(find "$TMP/extracted" -name "keymap.c" -maxdepth 2 | head -1 | xargs dirname)
if [[ -z "$SRC" ]]; then
  echo "Error: could not find keymap.c in archive"
  exit 1
fi

cp "$SRC/config.h"  "$DEST/config.h"
cp "$SRC/keymap.c"  "$DEST/keymap.c"
cp "$SRC/rules.mk"  "$DEST/rules.mk"
cp "$SRC/keymap.json" "$DEST/keymap.json"

echo "Updating README..."
sed -i '' "s|https://oryx\.zsa\.io/source/[^)'\ \`]*|$URL|g" "$DEST/README.md"

echo "Updated:"
ls -lh "$DEST/config.h" "$DEST/keymap.c" "$DEST/rules.mk" "$DEST/keymap.json"
