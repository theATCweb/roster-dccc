#!/bin/bash
# ════════════════════════════════════════════════════
#  Quick setup for GitHub Codespace
#  Run this ONCE after opening the Codespace:
#    bash setup-codespace.sh
# ════════════════════════════════════════════════════
set -e

echo ""
echo "✈ Roster DCCC — Codespace Setup"
echo "══════════════════════════════════"
echo ""

# ── Detect / Install Android SDK ─────────────────
ANDROID_SDK_DIR="/home/codespace/android-sdk"

if [ ! -d "$ANDROID_SDK_DIR/cmdline-tools/latest/bin" ]; then
  echo "📥 Installing Android SDK..."

  TOOLS_ZIP="commandlinetools-linux-11076708_latest.zip"
  TOOLS_URL="https://dl.google.com/android/repository/$TOOLS_ZIP"

  sudo apt-get update -qq
  sudo apt-get install -y -qq wget unzip

  mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
  cd /tmp
  wget -q "$TOOLS_URL" -O cmdlinetools.zip
  unzip -q cmdlinetools.zip
  mv cmdline-tools "$ANDROID_SDK_DIR/cmdline-tools/latest"
  cd -

  echo "  ✓ Command-line tools downloaded"
else
  echo "  ✓ Android SDK already installed"
fi

# ── Export env vars ───────────────────────────────
export ANDROID_HOME="$ANDROID_SDK_DIR"
export ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"
export PATH="$PATH:$ANDROID_SDK_DIR/cmdline-tools/latest/bin:$ANDROID_SDK_DIR/platform-tools:$ANDROID_SDK_DIR/build-tools/33.0.2"

# Persist to .bashrc
if ! grep -q "ANDROID_HOME" ~/.bashrc 2>/dev/null; then
  {
    echo ""
    echo "# Android SDK (added by setup-codespace.sh)"
    echo "export ANDROID_HOME=$ANDROID_SDK_DIR"
    echo "export ANDROID_SDK_ROOT=$ANDROID_SDK_DIR"
    echo "export PATH=\$PATH:$ANDROID_SDK_DIR/cmdline-tools/latest/bin:$ANDROID_SDK_DIR/platform-tools:$ANDROID_SDK_DIR/build-tools/33.0.2"
  } >> ~/.bashrc
fi

# ── Install SDK components ────────────────────────
echo "📦 Installing SDK components (platforms, build-tools)..."
yes | sdkmanager --licenses 2>/dev/null || true
sdkmanager \
  "platform-tools" \
  "platforms;android-33" \
  "build-tools;33.0.2" \
  --sdk_root="$ANDROID_SDK_DIR"
echo "  ✓ SDK components installed"
echo ""

# ── npm install ───────────────────────────────────
echo "📦 Installing npm packages..."
npm install
echo "  ✓ npm packages ready"
echo ""

echo "══════════════════════════════════════"
echo "  ✅ Setup complete!"
echo ""
echo "  Now run:"
echo "    bash build-apk.sh debug"
echo ""
echo "  Or for development preview:"
echo "    npm run dev"
echo "══════════════════════════════════════"
echo ""
