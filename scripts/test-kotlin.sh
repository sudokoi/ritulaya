#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"

if [ ! -d "$ANDROID_DIR" ]; then
  echo "==> android/ directory not found. Running expo prebuild..."
  cd "$PROJECT_DIR"
  npx expo prebuild --platform android --no-install
fi

cd "$ANDROID_DIR"

TASKS=()
for module_dir in "$PROJECT_DIR"/modules/*/; do
  module_name="$(basename "$module_dir")"
  if [ -d "$module_dir/android/src/test" ]; then
    TASKS+=(":$module_name:testDebugUnitTest")
  fi
done

if [ ${#TASKS[@]} -eq 0 ]; then
  echo "==> No native module tests found."
  exit 0
fi

echo "==> Running Kotlin unit tests for native modules..."
./gradlew "${TASKS[@]}" --continue "$@"
echo "==> Done."
