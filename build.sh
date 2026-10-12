#!/usr/bin/env bash
# EpicycleStudio — production build into dist/
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || ./install.sh
npm run build
echo "Build ready in dist/ — serve it with any static host or ./start.sh --prod"
