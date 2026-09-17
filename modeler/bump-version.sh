#!/bin/sh
# Bump the cache-busting version on every module import and on index.html.
# Run after any change before deploying: ./bump-version.sh
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M)
sed -i '' -E "s#(from '\./[a-z0-9-]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g" js/*.js
sed -i '' -E "s#style\.css\?v=[0-9]+#style.css?v=$V#; s#js/app\.js\?v=[0-9]+#js/app.js?v=$V#" index.html
sed -i '' -E "s#^const VERSION = '[0-9]+';#const VERSION = '$V';#" sw.js
echo "version $V"
