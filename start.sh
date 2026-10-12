#!/usr/bin/env bash
# EpicycleStudio — start the app in the background
#   ./start.sh          development server with hot reload (http://localhost:5173)
#   ./start.sh --prod   serve the production build (http://localhost:4173)
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || ./install.sh
PID_FILE=.epicycle.pid
LOG_FILE=.epicycle.log
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "EpicycleStudio is already running (pid $(cat "$PID_FILE")). Use ./stop.sh first."
  exit 0
fi
if [ "${1:-}" = "--prod" ]; then
  [ -d dist ] || ./build.sh
  nohup npx vite preview --port 4173 --strictPort >"$LOG_FILE" 2>&1 &
  URL="http://localhost:4173"
else
  nohup npx vite --port 5173 --strictPort >"$LOG_FILE" 2>&1 &
  URL="http://localhost:5173"
fi
echo $! >"$PID_FILE"
sleep 2
echo "EpicycleStudio running at $URL (pid $(cat "$PID_FILE"), log: $LOG_FILE)"
command -v open >/dev/null 2>&1 && open "$URL" || true
