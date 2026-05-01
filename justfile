set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := true

# Required env:
# - R2_ACCOUNT_ID
# - R2_ACCESS_KEY_ID
# - R2_SECRET_ACCESS_KEY
# - R2_BUCKET (e.g. smls-frontend-prod)
# - CLOUDFLARE_API_TOKEN
# - CLOUDFLARE_ZONE_ID (for sømløs.com)
# Optional:
# - APP_HOST (default: admin.sømløs.com)
# - BUILD_DIR (default: dist)

APP_HOST := env_var_or_default("APP_HOST", "admin.sømløs.com")
BUILD_DIR := env_var_or_default("BUILD_DIR", "dist")

_default:
    @just --list

format-check:
    bun run format:check

lint:
    bun run lint

test:
    bun run test:run

typecheck:
    bun run check

build:
    bun run build

verify:
    bun run format:check
    bun run lint
    bun run check
    bun run test:run

# Local CI pipeline (run this on your cloud runner)
ci:
    just verify
    bun run build

# Deploys current build to a timestamped release and to root, then purges CDN cache for HTML.
_deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    : "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
    : "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
    : "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
    : "${R2_BUCKET:?R2_BUCKET is required}"
    : "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
    : "${CLOUDFLARE_ZONE_ID:?CLOUDFLARE_ZONE_ID is required}"

    release_id=$(date -u +"%Y%m%dT%H%M%SZ")
    endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    echo "Uploading release: $release_id"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      aws s3 sync "{{BUILD_DIR}}/" "s3://${R2_BUCKET}/releases/$release_id/" \
      --endpoint-url "$endpoint" --delete

    echo "Publishing to root"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      aws s3 sync "{{BUILD_DIR}}/" "s3://${R2_BUCKET}/" \
      --endpoint-url "$endpoint" --delete --exclude "releases/*"

    printf '%s\n' "$release_id" > .last_release

    #    echo "Purging CDN HTML cache"
    #    curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    #      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    #      -H "Content-Type: application/json" \
    #      --data "{\"files\":[\"https://{{APP_HOST}}/\",\"https://{{APP_HOST}}/index.html\"]}"

    echo "Deployed release $release_id"

deploy:
    just ci
    just _deploy

# Roll back by release id. Example: just rollback 20260501T120000Z
rollback release_id:
    #!/usr/bin/env bash
    set -euo pipefail
    : "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
    : "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
    : "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"
    : "${R2_BUCKET:?R2_BUCKET is required}"
    : "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
    : "${CLOUDFLARE_ZONE_ID:?CLOUDFLARE_ZONE_ID is required}"

    endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    echo "Checking release exists: {{release_id}}"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      aws s3 ls "s3://${R2_BUCKET}/releases/{{release_id}}/" --endpoint-url "$endpoint" >/dev/null

    echo "Restoring release {{release_id}} to root"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      aws s3 sync "s3://${R2_BUCKET}/releases/{{release_id}}/" "s3://${R2_BUCKET}/" \
      --endpoint-url "$endpoint" --delete --exclude "releases/*"

    echo "Purging CDN HTML cache"
    curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "{\"files\":[\"https://{{APP_HOST}}/\",\"https://{{APP_HOST}}/index.html\"]}"

    echo "Rollback complete: {{release_id}}"

# Keep newest N releases (default 20) and delete older ones from releases/ prefix.
cleanup keep="20":
    ./scripts/cleanup-releases.sh {{keep}}
