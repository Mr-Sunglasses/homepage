#!/bin/sh
# Two local Garage stores standing in for Cloudflare R2 and the VPS, so the
# photo scripts can be tested end to end without touching the real ones.
#
#   pnpm stores:dev up      start both and write .dev-stores/env
#   pnpm stores:dev down    stop and remove them (data in .dev-stores/ is kept)
#   pnpm stores:dev reset   down, then delete their data
#
# Photos are then served at http://photos.web.garage.localhost:3902/<key>
# (the R2 stand-in) and :3912 (the VPS stand-in).
set -eu

IMAGE="docker.io/dxflrs/garage:v2.4.1"
DIR="$(cd "$(dirname "$0")/.." && pwd)/.dev-stores"
ENGINE="$(command -v podman || command -v docker || true)"
[ -n "$ENGINE" ] || { echo "Needs podman or docker." >&2; exit 1; }

# name  s3-port  web-port
STORES="r2 3900 3902
vps 3910 3912"

garage() { c="homepage-garage-$1"; shift; "$ENGINE" exec "$c" /garage "$@"; }

up_one() {
	name=$1 s3=$2 web=$3
	mkdir -p "$DIR/$name/meta" "$DIR/$name/data"
	if [ ! -f "$DIR/$name/garage.toml" ]; then
		cat >"$DIR/$name/garage.toml" <<EOF
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "[::]:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "$(openssl rand -hex 32)"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3900"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
EOF
	fi
	"$ENGINE" rm -f "homepage-garage-$name" >/dev/null 2>&1 || true
	"$ENGINE" run -d --name "homepage-garage-$name" \
		-p "127.0.0.1:$s3:3900" -p "127.0.0.1:$web:3902" \
		-v "$DIR/$name/garage.toml:/etc/garage.toml:ro" \
		-v "$DIR/$name/meta:/var/lib/garage/meta" \
		-v "$DIR/$name/data:/var/lib/garage/data" \
		"$IMAGE" >/dev/null

	# Wait for the node, then give it a layout, buckets and a key (first run only).
	i=0
	until garage "$name" status >/dev/null 2>&1; do
		i=$((i + 1)); [ $i -gt 60 ] && { echo "$name did not start" >&2; exit 1; }
		sleep 0.5
	done
	if [ ! -f "$DIR/$name/key" ]; then
		node_id=$(garage "$name" status 2>/dev/null | awk '/NO ROLE ASSIGNED|^[0-9a-f]{16}/ {print $1; exit}')
		garage "$name" layout assign -z local -c 1G "$node_id" >/dev/null
		garage "$name" layout apply --version 1 >/dev/null
		garage "$name" bucket create photos >/dev/null
		garage "$name" bucket create originals >/dev/null
		garage "$name" key create homepage-dev >"$DIR/$name/key"
		for bucket in photos originals; do
			garage "$name" bucket allow --read --write --owner "$bucket" --key homepage-dev >/dev/null
		done
		garage "$name" bucket website --allow photos >/dev/null
	fi

	key_id=$(awk '/Key ID/ {print $NF}' "$DIR/$name/key")
	secret=$(awk '/Secret key/ {print $NF}' "$DIR/$name/key")
	upper=$(echo "$name" | tr '[:lower:]' '[:upper:]')
	cat <<EOF
${upper}_S3_ENDPOINT=http://127.0.0.1:$s3
${upper}_S3_REGION=garage
${upper}_S3_ACCESS_KEY_ID=$key_id
${upper}_S3_SECRET_ACCESS_KEY=$secret
EOF
}

down() {
	echo "$STORES" | while read -r name _ _; do
		"$ENGINE" rm -f "homepage-garage-$name" >/dev/null 2>&1 || true
	done
}

case "${1:-up}" in
up)
	{
		echo "# Written by scripts/dev-stores.sh: local stand-ins, not real stores."
		echo "PHOTO_STORES=r2,vps"
		echo "$STORES" | while read -r name s3 web; do up_one "$name" "$s3" "$web"; done
	} >"$DIR.env.tmp"
	mkdir -p "$DIR" && mv "$DIR.env.tmp" "$DIR/env"
	echo "PUBLIC_PHOTOS_URL=http://photos.web.garage.localhost:3902" >"$DIR/../.env.development.local"
	echo "Local stores running. Settings in .dev-stores/env; photos at http://photos.web.garage.localhost:3902/"
	;;
down) down && echo "Stopped." ;;
reset) down && rm -rf "$DIR" "$DIR/../.env.development.local" && echo "Removed local stores and their data." ;;
*) echo "usage: $0 up|down|reset" >&2; exit 1 ;;
esac
