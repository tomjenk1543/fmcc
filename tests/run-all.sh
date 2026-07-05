#!/usr/bin/env bash
# Runs every tests/*_test.js file against index.html's real <script> body, using the mock
# DOM in tests/harness/ (no real browser needed — plain Node). For each test file this:
#   1. Extracts index.html's <script>...</script> body to a temp file.
#   2. Concatenates harness/mockdom.js + harness/domsetup.js + that script body + the test
#      file into one temp script (they share one top-level scope this way, same as a
#      browser's single <script> tag would).
#   3. Runs it with `node` and reports pass/fail.
#
# Usage: ./tests/run-all.sh   (run from anywhere — paths are resolved relative to this file)

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Extract the <script>...</script> body out of index.html.
python3 - "$ROOT/index.html" "$TMP/appjs.js" << 'PYEOF'
import re, sys
content = open(sys.argv[1]).read()
m = re.search(r'<script>(.*)</script>', content, re.DOTALL)
open(sys.argv[2], 'w').write(m.group(1))
PYEOF

node --check "$TMP/appjs.js"

export FMCC_INDEX_HTML="$ROOT/index.html"

total_fail=0
for test_file in "$DIR"/*_test.js; do
  name="$(basename "$test_file")"
  run_file="$TMP/run_$name"
  cat "$DIR/harness/mockdom.js" "$DIR/harness/domsetup.js" "$TMP/appjs.js" "$test_file" > "$run_file"
  echo "=== $name ==="
  if ! node "$run_file"; then
    total_fail=$((total_fail + 1))
  fi
  echo
done

if [ "$total_fail" -gt 0 ]; then
  echo "$total_fail test file(s) had failures."
  exit 1
else
  echo "All test files passed."
fi
