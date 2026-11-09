#!/usr/bin/env bash
# Rebuilds the graphify code graph for ChatApp (backend + frontend).
#
# Usage:
#   ./graphify.sh                    build/refresh the graph (no API key needed)
#   ./graphify.sh --install-skills   also install the graphify skill into
#                                    Claude Code, Codex, Cursor and Antigravity
#                                    (writes to those tools' global configs)
#
# Output: graphify-out/ (git-ignored)
#   graph.html       open in a browser to explore
#   graph.json       machine-readable graph
#   GRAPH_REPORT.md  community summary
set -euo pipefail

# Always run from the ChatApp folder, wherever the script is called from
cd "$(dirname "$0")"

if ! command -v graphify &>/dev/null; then
  echo "[graphify] installing graphifyy via uv..."
  uv tool install graphifyy
fi

echo "[graphify] building code graph for $(pwd)..."
graphify update .
echo "[graphify] done, output in graphify-out/"

if [[ "${1:-}" == "--install-skills" ]]; then
  echo ""
  echo "[graphify] installing the graphify skill for Claude Code, Codex, Cursor, Antigravity..."
  for platform in claude codex cursor antigravity; do
    echo "  -> ${platform}"
    graphify "${platform}" install
  done
fi

# With an LLM key, docs and images can be added to the graph too
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "[graphify] ANTHROPIC_API_KEY found. To include docs/images: graphify . --backend claude"
elif [[ -n "${OPENAI_API_KEY:-}" ]]; then
  echo "[graphify] OPENAI_API_KEY found. To include docs/images: graphify . --backend openai"
elif [[ -n "${GEMINI_API_KEY:-}" || -n "${GOOGLE_API_KEY:-}" ]]; then
  echo "[graphify] Gemini key found. To include docs/images: graphify . --backend gemini"
fi
