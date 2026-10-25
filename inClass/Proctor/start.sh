#!/usr/bin/env bash
# Starts Athena: the backend (port 3000), the Vite UI server (port 5173) and the Electron app.
# Safe to run any number of times: whatever is already running and healthy is left alone, so you never
# get a second copy. Dependencies are installed and the database seeded only when they're missing.
#   ./start.sh          start everything that isn't running
#   ./stop.sh           stop what this script started
# Logs: .run/backend.log, .run/vite.log, .run/electron.log
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$ROOT/.run"
BACKEND_PORT=3000
VITE_PORT=5173
WAIT_TRIES=60

mkdir -p "$RUN"

say() { printf '\033[1m[athena]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[athena] %s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null || fail "Node.js is not installed (need Node 22+)."
command -v curl >/dev/null || fail "curl is not installed."

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
backend_healthy() { curl -fsS -m 2 "http://127.0.0.1:$BACKEND_PORT/api/health" 2>/dev/null | grep -q '"status":"ok"'; }
vite_healthy() { curl -fsS -m 2 "http://localhost:$VITE_PORT/" 2>/dev/null | grep -q '<title>Athena</title>'; }
pid_alive() { [[ -f "$1" ]] && kill -0 "$(cat "$1")" 2>/dev/null; }
# Any Athena window from this checkout, whether this script opened it or someone ran `npm run electron`.
athena_window_pid() { pgrep -f "$ROOT/app/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" | head -n 1; }

# Runs a command in the background with no ties to this terminal; the pid file holds the real process.
launch() {
  local dir="$1" log="$2" pidfile="$3"
  shift 3
  (cd "$dir" && exec nohup "$@" </dev/null >"$log" 2>&1) &
  echo $! >"$pidfile"
}

wait_for() {
  local check="$1" name="$2" log="$3"
  for ((i = 0; i < WAIT_TRIES; i++)); do
    "$check" && return 0
    sleep 0.5
  done
  fail "$name did not come up. Last lines of $log:
$(tail -n 15 "$log" 2>/dev/null)"
}

install_if_missing() {
  local dir="$1"
  if [[ ! -d "$dir/node_modules" ]]; then
    say "Installing dependencies in ${dir#"$ROOT"/} (first run only)..."
    (cd "$dir" && npm ci --no-audit --no-fund)
  fi
}

# ---- dependencies and first-run data ----------------------------------------------------------------
install_if_missing "$ROOT/backend"
install_if_missing "$ROOT/app"

if [[ ! -f "$ROOT/backend/data/users.json" ]]; then
  say "Seeding the database (first run only). Logins go to backend/data/seed-credentials.txt"
  (cd "$ROOT/backend" && npm run seed --silent)
fi
mkdir -p "$ROOT/backend/screenshots"

# ---- backend --------------------------------------------------------------------------------------
if backend_healthy; then
  say "Backend already running on http://127.0.0.1:$BACKEND_PORT"
else
  port_busy "$BACKEND_PORT" && fail "Port $BACKEND_PORT is used by something that isn't Athena:
$(lsof -nP -iTCP:$BACKEND_PORT -sTCP:LISTEN | tail -n +2)
Stop it (for Docker: docker stop <name>) and run ./start.sh again."
  say "Starting backend..."
  launch "$ROOT/backend" "$RUN/backend.log" "$RUN/backend.pid" node server.js
  wait_for backend_healthy "Backend" "$RUN/backend.log"
  say "Backend up on http://127.0.0.1:$BACKEND_PORT"
fi

# ---- Vite UI server --------------------------------------------------------------------------------
if vite_healthy; then
  say "UI server already running on http://localhost:$VITE_PORT"
else
  port_busy "$VITE_PORT" && fail "Port $VITE_PORT is used by something that isn't Athena's UI server.
$(lsof -nP -iTCP:$VITE_PORT -sTCP:LISTEN | tail -n +2)"
  say "Starting UI server..."
  (cd "$ROOT/app" && node scripts/copy-mediapipe.js >/dev/null 2>&1 || true)
  launch "$ROOT/app" "$RUN/vite.log" "$RUN/vite.pid" node node_modules/vite/bin/vite.js --port "$VITE_PORT" --strictPort
  wait_for vite_healthy "UI server" "$RUN/vite.log"
  say "UI server up on http://localhost:$VITE_PORT"
fi

# ---- Electron app ----------------------------------------------------------------------------------
EXISTING_WINDOW="$(athena_window_pid || true)"
if [[ -n "$EXISTING_WINDOW" ]]; then
  echo "$EXISTING_WINDOW" >"$RUN/electron.pid"
  say "Athena app already open (pid $EXISTING_WINDOW)"
else
  say "Opening the Athena app..."
  ELECTRON_BIN="$(cd "$ROOT/app" && node -p "require('electron')")"
  launch "$ROOT/app" "$RUN/electron.log" "$RUN/electron.pid" "$ELECTRON_BIN" .
  sleep 2
  pid_alive "$RUN/electron.pid" || fail "The Athena app exited at once. See $RUN/electron.log"
  say "Athena app open"
fi

say "Ready. Screenshots are saved in backend/screenshots/<Candidate>/<Test>/{webcam,screen}/"
say "Logins: backend/data/seed-credentials.txt · Stop everything: ./stop.sh"
