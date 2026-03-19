#!/bin/zsh

SOURCE="$HOME/Documents/Obsidian"
DEST="$HOME/Documents/backups/obsidian"
DATE=$(date +%Y-%m-%d)
ZIPFILE="$DEST/$DATE.zip"

mkdir -p "$DEST"

# Create today's backup (skip if already done today)
if [ ! -f "$ZIPFILE" ]; then
    zip -r "$ZIPFILE" "$SOURCE" -x "*.DS_Store" -x "__MACOSX"
fi

# Remove backups older than 30 days
find "$DEST" -name "*.zip" -mtime +30 -delete
