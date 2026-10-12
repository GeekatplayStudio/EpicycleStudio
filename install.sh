#!/usr/bin/env bash
# EpicycleStudio — install dependencies
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js 20+ is required: https://nodejs.org"; exit 1; }
npm install
echo "Done. Run ./start.sh to launch the studio."
