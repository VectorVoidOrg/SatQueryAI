#!/usr/bin/env bash
# Launch the SatQuery AI backend. Run from inside backend/ so the default
# adapter paths (./artifacts/adapter_a, ./artifacts/adapter_b) resolve.
set -euo pipefail
cd "$(dirname "$0")"

for a in adapter_a adapter_b; do
  if [ ! -f "artifacts/$a/adapter_model.safetensors" ]; then
    echo "!! artifacts/$a/adapter_model.safetensors is missing."
    echo "!! Unzip satquery_${a}_clean.zip from Kaggle into artifacts/$a/"
    echo "!! so the .safetensors file lands directly in that folder."
    exit 1
  fi
done

if python -c "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('torchao') else 1)"; then
  echo "!! torchao is installed. peft 0.20 breaks on torchao < 0.16.0."
  echo "!! Run: pip uninstall -y torchao"
  exit 1
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
echo "SatQuery AI backend -> http://${HOST}:${PORT}  (docs at /docs)"
echo "  ADAPTER_A_PATH=${ADAPTER_A_PATH:-./artifacts/adapter_a}"
echo "  ADAPTER_B_PATH=${ADAPTER_B_PATH:-./artifacts/adapter_b}"
exec uvicorn app:app --host "$HOST" --port "$PORT"
