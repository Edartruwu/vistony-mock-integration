#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

show_help() {
  echo "Uso: ./dev.sh <comando>"
  echo ""
  echo "Comandos:"
  echo "  install   Instala las dependencias del backend y frontend"
  echo "  run       Inicia ambos servicios con hot reload"
  echo "  help      Muestra esta ayuda"
  echo ""
  echo "Ejemplo:"
  echo "  ./dev.sh install"
  echo "  ./dev.sh run"
}

do_install() {
  echo "==> Instalando dependencias del backend..."
  cd "$DIR/backend"
  bun install
  echo ""

  echo "==> Instalando dependencias del frontend..."
  cd "$DIR/frontend"
  bun install
  echo ""

  echo "Listo. Ahora ejecuta: ./dev.sh run"
}

do_run() {
  cleanup() {
    echo ""
    echo "Deteniendo servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "Listo."
  }
  trap cleanup EXIT INT TERM

  echo "[backend]  Iniciando en http://localhost:3001"
  cd "$DIR/backend"
  bun run --hot index.ts 2>&1 | sed 's/^/[backend]  /' &
  BACKEND_PID=$!

  echo "[frontend] Iniciando en http://localhost:5173"
  cd "$DIR/frontend"
  bun run dev 2>&1 | sed 's/^/[frontend] /' &
  FRONTEND_PID=$!

  echo ""
  echo "Ambos servicios corriendo. Presiona Ctrl+C para detener."
  echo ""

  wait
}

case "${1:-}" in
  install)
    do_install
    ;;
  run)
    do_run
    ;;
  help|--help|-h)
    show_help
    ;;
  "")
    echo "Error: falta un comando."
    echo ""
    show_help
    exit 1
    ;;
  *)
    echo "Error: comando desconocido '$1'"
    echo ""
    show_help
    exit 1
    ;;
esac
