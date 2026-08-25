#!/usr/bin/env bash

# ==============================================================================
# CLI Music Player - Automated Setup & Launch Script
# Interactive Runtime Selection (Bun vs Node.js / npm)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================="
echo "    CLI Music Player Setup & Launcher     "
echo "=========================================="
echo ""

# 1. Host Subsystem Check
if ! command -v afplay >/dev/null 2>&1; then
    echo "Warning: macOS 'afplay' utility not detected. Audio playback requires Darwin subsystems." >&2
fi

# 2. Interactive Runtime Selection
HAS_BUN=false
HAS_NODE=false

if command -v bun >/dev/null 2>&1; then
    HAS_BUN=true
fi

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    HAS_NODE=true
fi

if [ "$HAS_BUN" = false ] && [ "$HAS_NODE" = false ]; then
    echo "Error: Neither Bun nor Node.js/npm is installed on your system." >&2
    echo "Please install Bun (https://bun.sh) or Node.js (https://nodejs.org)." >&2
    exit 1
fi

echo "Select your preferred runtime / package manager:"
echo "  1) Bun       (Recommended for OpenTUI)"
echo "  2) Node.js / npm"
echo ""

read -rp "Enter choice [1 or 2] (Default: 1): " USER_CHOICE

# Default to 1 (Bun) if empty, or validate selection
case "$USER_CHOICE" in
    2|"node"|"npm")
        SELECTED_RUNTIME="node"
        ;;
    1|"bun"|"")
        SELECTED_RUNTIME="bun"
        ;;
    *)
        echo "Invalid selection. Defaulting to Bun (or Node.js if Bun is missing)..."
        if [ "$HAS_BUN" = true ]; then
            SELECTED_RUNTIME="bun"
        else
            SELECTED_RUNTIME="node"
        fi
        ;;
esac

# Fallback check if user selected a runtime that is not installed
if [ "$SELECTED_RUNTIME" = "bun" ] && [ "$HAS_BUN" = false ]; then
    echo "Notice: Bun is not installed on this system. Falling back to Node.js/npm."
    SELECTED_RUNTIME="node"
elif [ "$SELECTED_RUNTIME" = "node" ] && [ "$HAS_NODE" = false ]; then
    echo "Notice: Node.js/npm is not installed on this system. Falling back to Bun."
    SELECTED_RUNTIME="bun"
fi

echo ""
echo "Using runtime: $SELECTED_RUNTIME"
echo "------------------------------------------"

# 3. Dependency Installation & Execution
if [ "$SELECTED_RUNTIME" = "bun" ]; then
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies with Bun..."
        bun install
    else
        echo "Dependencies verified."
    fi
    echo "Launching CLI Music Player via Bun..."
    exec bun run index.js "$@"
else
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        echo "Installing dependencies with npm..."
        npm install
    else
        echo "Dependencies verified."
    fi
    echo "Note: @opentui/core relies on native FFI bindings built into Bun."
    echo "Launching CLI Music Player via Node.js..."
    exec node index.js "$@"
fi
