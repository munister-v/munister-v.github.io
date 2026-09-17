#!/bin/sh
# Bump the cache-busting version on every module import and on index.html.
# Run after any change before deploying: ./bump-version.sh
cd "$(dirname "$0")"
# refuse to stamp a release that does not parse as ES modules
fail=0
for f in js/*.js sw.js; do
  if ! node --input-type=module --check < "$f" 2>/tmp/schemata-check.$$; then echo "Syntax error in $f:"; cat /tmp/schemata-check.$$; fail=1; fi
done
rm -f /tmp/schemata-check.$$
[ "$fail" = 0 ] || { echo "Release aborted"; exit 1; }
V=$(date +%Y%m%d%H%M)
sed -i '' -E "s#(from '\./[a-z0-9-]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g" js/*.js
sed -i '' -E "s#style\.css\?v=[0-9]+#style.css?v=$V#; s#js/app\.js\?v=[0-9]+#js/app.js?v=$V#" index.html
sed -i '' -E "s#^const VERSION = '[0-9]+';#const VERSION = '$V';#" sw.js
echo "version $V"
