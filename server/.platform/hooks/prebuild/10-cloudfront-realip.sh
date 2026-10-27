#!/bin/bash
set -euo pipefail
APP_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
exec python3 "$APP_ROOT/.platform/generate_realip.py"
