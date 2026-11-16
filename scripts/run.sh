#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f runtime/game/original_main.lua ]; then
  mkdir -p runtime/game
  cp -R reference/apk/assets/gc64/. runtime/game/
  cp runtime/game/main.lua runtime/game/original_main.lua
fi
if [ ! -d runtime/desktop_assets ]; then
  python3 scripts/prepare_textures.py
fi
ln -sfn ../desktop_assets runtime/game/_assets
cp scripts/bootstrap.lua runtime/game/main.lua
exec runtime/love.app/Contents/MacOS/love runtime/game
