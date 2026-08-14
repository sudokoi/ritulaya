#!/usr/bin/env bash
set -euo pipefail

KTLINT_VERSION="1.8.0"
KTLINT_SHA256="a3fd620207d5c40da6ca789b95e7f823c54e854b7fade7f613e91096a3706d75"
KTLINT_URL="https://github.com/ktlint/ktlint/releases/download/${KTLINT_VERSION}/ktlint"
CACHE_DIR=".cache/ktlint"
KTLINT_JAR="${CACHE_DIR}/ktlint-${KTLINT_VERSION}.jar"

MODE="check"
for arg in "$@"; do
  case "$arg" in
    --format | -F) MODE="format" ;;
    --check) MODE="check" ;;
  esac
done

if ! command -v java >/dev/null 2>&1; then
  echo "[lint-kotlin] java is required to run ktlint" >&2
  exit 1
fi

if [ ! -f "$KTLINT_JAR" ]; then
  mkdir -p "$CACHE_DIR"
  echo "[lint-kotlin] Downloading ktlint ${KTLINT_VERSION}..."
  curl -sSL -o "$KTLINT_JAR" "$KTLINT_URL"

  if command -v shasum >/dev/null 2>&1; then
    ACTUAL_SHA256="$(shasum -a 256 "$KTLINT_JAR" | awk '{print $1}')"
  elif command -v sha256sum >/dev/null 2>&1; then
    ACTUAL_SHA256="$(sha256sum "$KTLINT_JAR" | awk '{print $1}')"
  else
    ACTUAL_SHA256=""
  fi

  if [ -n "$ACTUAL_SHA256" ] && [ "$ACTUAL_SHA256" != "$KTLINT_SHA256" ]; then
    echo "[lint-kotlin] Checksum mismatch for ktlint ${KTLINT_VERSION}" >&2
    echo "  expected: ${KTLINT_SHA256}" >&2
    echo "  actual:   ${ACTUAL_SHA256}" >&2
    rm -f "$KTLINT_JAR"
    exit 1
  fi
fi

FILES="$(find modules -name '*.kt' -not -path '*/build/*' -not -path '*/node_modules/*' 2>/dev/null | sort)"

if [ -z "$FILES" ]; then
  echo "[lint-kotlin] No Kotlin files found"
  exit 0
fi

if [ "$MODE" = "format" ]; then
  echo "[lint-kotlin] Formatting Kotlin files..."
  # shellcheck disable=SC2086
  java -jar "$KTLINT_JAR" --format $FILES
else
  echo "[lint-kotlin] Checking Kotlin files..."
  # shellcheck disable=SC2086
  java -jar "$KTLINT_JAR" $FILES
fi
