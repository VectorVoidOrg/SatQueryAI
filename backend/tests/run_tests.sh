#!/usr/bin/env bash
# CPU-only. stub_env.py fakes torch/transformers/peft/rasterio so the REAL
# app.py is exercised over real HTTP with no GPU and no model download.
set -uo pipefail
cd "$(dirname "$0")/.."
rc=0
for t in tests/test_backend.py tests/test_sar_preprocess.py tests/test_evidence_report_ui.py; do
  echo "=== $t ==="
  python3 "$t" || rc=$((rc + 1))
done
echo
if [ "$rc" -eq 0 ]; then echo " ALL BACKEND TESTS GREEN"; else echo " $rc SUITE(S) FAILED"; fi
exit "$rc"
