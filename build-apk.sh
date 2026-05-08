#!/bin/bash
set -e

# ════════════════════════════════════════════════════
#  Roster DCCC Alger — APK Build Script
#  Usage: bash build-apk.sh [debug|release]
# ════════════════════════════════════════════════════

BUILD_TYPE=${1:-debug}
APP_NAME="RosterDCCC"

echo ""
echo "✈  ════════════════════════════════════════"
echo "   ROSTER DCCC ALGER — APK Builder"
echo "   Build type: $BUILD_TYPE"
echo "═══════════════════════════════════════════"
echo ""

# ── Step 1: Check prerequisites ──────────────────
echo "🔍 Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Run: .devcontainer/setup-android.sh"
  exit 1
fi

if ! command -v java &>/dev/null; then
  echo "❌ Java not found. Install Java 17."
  exit 1
fi

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  echo "❌ ANDROID_HOME not set. Run: source ~/.bashrc or setup-android.sh"
  exit 1
fi

echo "  ✓ Node $(node --version)"
echo "  ✓ Java $(java -version 2>&1 | head -1)"
echo "  ✓ Android SDK: ${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
echo ""

# ── Step 2: Install npm deps ──────────────────────
echo "📦 Installing dependencies..."
npm ci --silent
echo "  ✓ Dependencies installed"
echo ""

# ── Step 3: Build web app ─────────────────────────
echo "🏗  Building web app (Vite)..."
npm run build
echo "  ✓ Web build complete → dist/"
echo ""

# ── Step 4: Init Capacitor Android (if needed) ───
if [ ! -d "android" ]; then
  echo "🔌 Adding Capacitor Android platform..."
  npx cap add android
  echo "  ✓ Android platform added"
fi

# ── Step 5: Sync Capacitor ───────────────────────
echo "🔄 Syncing Capacitor..."
npx cap sync android --silent
echo "  ✓ Capacitor synced"
echo ""

# ── Step 6: Build APK ────────────────────────────
echo "🏗  Building $BUILD_TYPE APK..."
cd android
chmod +x gradlew

if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease --no-daemon -q
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
else
  ./gradlew assembleDebug --no-daemon -q
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

# ── Step 7: Copy APK to root ─────────────────────
if [ -f "android/$APK_PATH" ]; then
  cp "android/$APK_PATH" "${APP_NAME}-${BUILD_TYPE}.apk"
  APK_SIZE=$(du -sh "${APP_NAME}-${BUILD_TYPE}.apk" | cut -f1)
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  ✅ APK BUILT SUCCESSFULLY!"
  echo ""
  echo "  📁 File: ${APP_NAME}-${BUILD_TYPE}.apk"
  echo "  📏 Size: $APK_SIZE"
  echo ""
  echo "  👇 Download from Codespace Explorer panel"
  echo "     or run: gh run download"
  echo "═══════════════════════════════════════════"
  echo ""
else
  echo "❌ APK build failed. Check errors above."
  exit 1
fi
