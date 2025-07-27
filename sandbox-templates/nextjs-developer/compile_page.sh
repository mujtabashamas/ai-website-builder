#!/usr/bin/env bash
set -euo pipefail

# Find the first package.json anywhere under /home/user
PROJECT_DIR="$(dirname "$(find /home/user -maxdepth 4 -name package.json | head -n 1 || true)")"

if [ -z "$PROJECT_DIR" ] || [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo "❌ No package.json found in sandbox. Abort."
  exit 1
fi

echo "📦 Project dir: $PROJECT_DIR"
cd "$PROJECT_DIR"


# Ensure pnpm exists (or fallback to npm)
if ! command -v pnpm >/dev/null 2>&1; then
  npm i -g pnpm
fi

echo "Installing deps…"
pnpm install || npm install


# after cd "$PROJECT_DIR"
need_install=0
node -e "require.resolve('autoprefixer')" 2>/dev/null || need_install=1
node -e "require.resolve('postcss')" 2>/dev/null || need_install=1
node -e "require.resolve('tailwindcss')" 2>/dev/null || need_install=1

if [ "$need_install" = "1" ]; then
  echo "Installing missing CSS deps (tailwindcss/postcss/autoprefixer)..."
  pnpm add -D tailwindcss postcss autoprefixer
fi

echo "Starting Next.js…"
pnpm dev -p 3000 &

echo "Waiting for server…"
until curl -sf -o /dev/null http://127.0.0.1:3000; do
  sleep 0.3
done
echo "✅ Server up"

wait -n
