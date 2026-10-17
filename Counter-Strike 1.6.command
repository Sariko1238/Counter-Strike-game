#!/bin/bash
# ==============================================================================
# Counter-Strike 1.6 - 1-Click Desktop App Launcher
# Launches the game in standalone, borderless app mode without address bar.
# ==============================================================================

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

PORT=8080
URL="http://localhost:$PORT"

echo "=========================================================="
echo "   ★ ЗАПУСК COUNTER-STRIKE 1.6 3D (DESKTOP APP) ★"
echo "=========================================================="
echo "Папка игры: $DIR"

# 1. Проверяем, запущен ли уже локальный сервер на порту $PORT
if ! lsof -i :$PORT > /dev/null 2>&1; then
    echo "Запуск автономного игрового сервера на порту $PORT..."
    python3 -m http.server $PORT --directory "$DIR" > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 0.8
else
    echo "Игровой сервер уже активен на $URL"
fi

# 2. Попытка запустить через Electron, если установлен
if [ -d "$DIR/node_modules/electron" ]; then
    echo "Запуск через нативный Electron..."
    npx electron "$DIR" &
    exit 0
fi

# 3. Запуск в режиме отдельного автономного окна без рамок и адресной строки (--app)
if [ -d "/Applications/Google Chrome.app" ]; then
    echo "Открытие в автономном окне Google Chrome (Standalone App)..."
    open -na "Google Chrome" --args --app="$URL" --window-size=1280,800 --disable-infobars
elif [ -d "/Applications/Brave Browser.app" ]; then
    echo "Открытие в автономном окне Brave Browser..."
    open -na "Brave Browser" --args --app="$URL" --window-size=1280,800
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    echo "Открытие в автономном окне Microsoft Edge..."
    open -na "Microsoft Edge" --args --app="$URL" --window-size=1280,800
else
    echo "Открытие в браузере по умолчанию..."
    open "$URL"
fi

echo "Приятной игры!"
sleep 1
exit 0
