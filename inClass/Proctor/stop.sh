#!/usr/bin/env bash
# Stops what ./start.sh started (Electron app, UI server, backend). Safe to run when nothing is running.
# Each pid file holds the real process (start.sh execs it), so one signal reaches the right program.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$ROOT/.run"
GRACE_TRIES=10

say() { printf '\033[1m[athena]\033[0m %s\n' "$*"; }

stop_pid() {
  local name="$1" pid="$2"
  kill -TERM "$pid" 2>/dev/null
  for ((i = 0; i < GRACE_TRIES; i++)); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.3
  done
  # A running exam asks before quitting; the force kill covers that dialog.
  kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null
  say "$name: stopped"
}

stop_one() {
  local name="$1" file="$RUN/$1.pid"
  if [[ -f "$file" ]] && kill -0 "$(cat "$file")" 2>/dev/null; then
    stop_pid "$name" "$(cat "$file")"
  else
    say "$name: not running"
  fi
  rm -f "$file"
}

stop_one electron
# An Athena window opened by hand (npm run electron) from this checkout is closed too.
for pid in $(pgrep -f "$ROOT/app/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" | head -n 1); do
  stop_pid "electron (opened by hand)" "$pid"
done
stop_one vite
stop_one backend
