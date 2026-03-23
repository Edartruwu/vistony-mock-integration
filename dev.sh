#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# Backend
echo "[backend]  Starting on http://localhost:3001"
cd "$DIR/backend"
bun run --hot index.ts 2>&1 | sed 's/^/[backend]  /' &
BACKEND_PID=$!

# Frontend
echo "[frontend] Starting on http://localhost:5173"
cd "$DIR/frontend"
bun run dev 2>&1 | sed 's/^/[frontend] /' &
FRONTEND_PID=$!

echo ""
echo "Both services running. Press Ctrl+C to stop."
echo ""

wait
