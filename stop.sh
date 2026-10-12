#!/usr/bin/env bash
# EpicycleStudio — stop the background server started by ./start.sh
set -euo pipefail
cd "$(dirname "$0")"
PID_FILE=.epicycle.pid
if [ ! -f "$PID_FILE" ]; then
  echo "EpicycleStudio is not running."
  exit 0
fi
PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  pkill -P "$PID" 2>/dev/null || true
  kill "$PID" 2>/dev/null || true
  echo "Stopped EpicycleStudio (pid $PID)."
else
  echo "EpicycleStudio was not running (stale pid file)."
fi
rm -f "$PID_FILE"
