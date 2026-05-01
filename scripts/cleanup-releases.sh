#!/usr/bin/env bash
set -euo pipefail

keep="${1:-20}"

: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"

endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3 ls "s3://${R2_BUCKET}/releases/" --endpoint-url "$endpoint" \
  | awk '/PRE / {print $2}' | tr -d '/' | sort > "$tmp"

total="$(wc -l < "$tmp" | tr -d ' ')"
if [ "$total" -le "$keep" ]; then
  echo "No cleanup needed ($total releases, keep=$keep)"
  exit 0
fi

to_delete="$((total - keep))"
head -n "$to_delete" "$tmp" | while read -r rel; do
  echo "Deleting releases/$rel/"
  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 rm "s3://${R2_BUCKET}/releases/$rel/" --recursive --endpoint-url "$endpoint"
done
