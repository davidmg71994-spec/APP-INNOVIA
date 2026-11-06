#!/usr/bin/env bash
# Construye «Visitas PRL» (APK firmado) a partir de la app web de /home/claude/pwa/registro-rp.
# Uso: ./build.sh <versionCode> "<versionName>"
set -euo pipefail
cd "$(dirname "$0")"
SDK=/home/claude/android-sdk
BT=$SDK/bt36/android-16
AJ=$SDK/platforms/android-34/android.jar
WEB=/home/claude/pwa/registro-rp
VC=${1:-1}
VN=${2:-1.0}
KS=firma/visitasprl.jks
KP=$(cat firma/clave.txt)

rm -rf build assets/www
mkdir -p build/classes build/dex build/gen/es/visitasprl/registro assets/www

# 1. la app web, sin el service worker (dentro del APK no hace falta)
(cd "$WEB" && tar cf - --exclude=sw.js --exclude='*.DS_Store' .) | (cd assets/www && tar xf -)

# 2. recursos y manifiesto
"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/base.apk -I "$AJ" --manifest AndroidManifest.xml -A assets \
  --min-sdk-version 24 --target-sdk-version 34 --version-code "$VC" --version-name "$VN" \
  --java build/gen build/res.zip

# 3. código Java
cat > build/gen/es/visitasprl/registro/BuildConfigInfo.java <<EOF
package es.visitasprl.registro;
final class BuildConfigInfo { static final String VERSION = "$VN"; }
EOF
javac -nowarn --release 8 -encoding UTF-8 -classpath "$AJ" -d build/classes \
  src/es/visitasprl/registro/*.java build/gen/es/visitasprl/registro/*.java 2>&1 | grep -v "^warning: \[options\]" || true
"$BT/d8" --release --min-api 24 --lib "$AJ" --output build/dex $(find build/classes -name '*.class')

# 4. empaquetar, alinear y firmar
cp build/base.apk build/unsigned.apk
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -p -f 4 build/unsigned.apk build/aligned.apk
"$BT/apksigner" sign --ks "$KS" --ks-pass "pass:$KP" --ks-key-alias visitasprl --key-pass "pass:$KP" --out VisitasPRL.apk build/aligned.apk
"$BT/apksigner" verify --verbose VisitasPRL.apk | head -5
ls -l VisitasPRL.apk
