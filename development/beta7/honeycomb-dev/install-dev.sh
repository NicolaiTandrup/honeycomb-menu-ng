#!/bin/sh
# Development static files only. No HA API, YAML, HACS or production commands.
set -eu
usage() { echo 'Usage: sh install-dev.sh (--from DIR | --url HTTPS_BASE) --www /config/www' >&2; exit 2; }
source_dir='' download_url='' www=''
while [ "$#" -gt 0 ]; do
    [ "$#" -ge 2 ] || usage
    case "$1" in
        --from) [ -z "$source_dir" ] || usage; source_dir=$2 ;;
        --url) [ -z "$download_url" ] || usage; download_url=$2 ;;
        --www) [ -z "$www" ] || usage; www=$2 ;;
        *) usage ;;
    esac
    shift 2
done
[ -n "$www" ] && [ -d "$www" ] || usage
if [ -n "$source_dir" ]; then [ -z "$download_url" ] || usage; else [ -n "$download_url" ] || usage; fi
for tool in jq sha256sum mktemp grep; do command -v "$tool" >/dev/null || { echo "Required tool missing: $tool" >&2; exit 1; }; done
stage=$(mktemp -d); locked=''
cleanup() { if [ -n "$locked" ]; then rmdir "$locked"; fi; rm -rf "$stage"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
if [ -n "$download_url" ]; then
    command -v curl >/dev/null || { echo 'curl required for download' >&2; exit 1; }
    case "$download_url" in https://*) ;; *) echo 'Use HTTPS' >&2; exit 1;; esac
    curl --fail --silent --show-error --location --retry 2 "$download_url/manifest.json" -o "$stage/manifest.json"
else cp "$source_dir/manifest.json" "$stage/manifest.json"; fi
jq -e 'type=="object" and .schema==1 and (.sha256|type=="string" and test("^[0-9a-f]{64}$")) and (.loader_sha256|type=="string" and test("^[0-9a-f]{64}$")) and (.commit|type=="string" and test("^[0-9a-f]{40}$")) and (.version|type=="string" and test("^[0-9]+\\.[0-9]+\\.[0-9]+-beta\\.[0-9]+-dev\\+[0-9a-f]{12}$")) and (.bytes|type=="number" and floor==. and .>=10000) and .file==("honeycomb-build-"+.sha256+".js")' "$stage/manifest.json" >/dev/null
# Validate identity separately without shell evaluation or interpolated jq code.
revision=$(jq -r '.commit' "$stage/manifest.json")
version=$(jq -r '.version' "$stage/manifest.json")
short=$(printf '%.12s' "$revision")
case "$version" in *"+$short") ;; *) echo 'Version/commit mismatch' >&2; exit 1;; esac
file=$(jq -r '.file' "$stage/manifest.json")
hash=$(jq -r '.sha256' "$stage/manifest.json")
loader_hash=$(jq -r '.loader_sha256' "$stage/manifest.json")
bytes=$(jq -r '.bytes' "$stage/manifest.json")
for asset in "$file" honeycomb-menu-ng.js; do
    if [ -n "$download_url" ]; then curl --fail --silent --show-error --location --retry 2 "$download_url/$asset" -o "$stage/$asset";
    else cp "$source_dir/$asset" "$stage/$asset"; fi
done
printf '%s  %s\n%s  %s\n' "$hash" "$file" "$loader_hash" honeycomb-menu-ng.js > "$stage/SHA256SUMS.txt"
(cd "$stage" && sha256sum -c SHA256SUMS.txt)
[ "$(wc -c < "$stage/$file" | tr -d ' ')" = "$bytes" ] || { echo 'Runtime size mismatch' >&2; exit 1; }
grep -Fq "$version" "$stage/$file" && grep -Fq "$revision" "$stage/$file" || { echo 'Runtime identity mismatch' >&2; exit 1; }
destination="$www/honeycomb-dev"
[ ! -L "$destination" ] || { echo 'Refusing symlink destination' >&2; exit 1; }
mkdir -p "$destination"
for asset in "$file" honeycomb-menu-ng.js manifest.json SHA256SUMS.txt; do
    [ ! -L "$destination/$asset" ] || { echo 'Refusing symlink file' >&2; exit 1; }
done
mkdir "$destination/.install.lock" || { echo 'Another install/leftover lock: inspect before retrying' >&2; exit 1; }
locked="$destination/.install.lock"
if [ -f "$destination/$file" ]; then
    cmp "$stage/$file" "$destination/$file" || { echo 'Immutable runtime conflict' >&2; exit 1; }
else cp "$stage/$file" "$destination/$file"; fi
# Every replaced file is staged on the destination filesystem. Manifest commits last.
for asset in honeycomb-menu-ng.js SHA256SUMS.txt manifest.json; do
    temporary=$(mktemp "$destination/.$asset.XXXXXXXX")
    cp "$stage/$asset" "$temporary"
    mv "$temporary" "$destination/$asset"
done
printf 'Installed %s\nSource %s\nSHA256 %s\nReload the development dashboard normally. Resource URL is unchanged.\n' "$version" "$revision" "$hash"
