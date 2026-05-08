#!/bin/bash
set -e

echo "================================================"
echo "  Setting up Android SDK for Codespace"
echo "================================================"

ANDROID_HOME="/opt/android-sdk"
SDK_VERSION="commandlinetools-linux-11076708_latest.zip"
SDK_URL="https://dl.google.com/android/repository/${SDK_VERSION}"

# Install dependencies
sudo apt-get update -q
sudo apt-get install -y -q wget unzip zipalign

# Create SDK directory
sudo mkdir -p $ANDROID_HOME/cmdline-tools
sudo chown -R $USER:$USER /opt/android-sdk

# Download Android Command Line Tools
echo "📥 Downloading Android SDK..."
cd /tmp
wget -q $SDK_URL -O cmdline-tools.zip
unzip -q cmdline-tools.zip
mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest

# Add to PATH
echo "export ANDROID_HOME=$ANDROID_HOME" >> ~/.bashrc
echo "export ANDROID_SDK_ROOT=$ANDROID_HOME" >> ~/.bashrc
echo "export PATH=\$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/33.0.2" >> ~/.bashrc

export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"

# Accept licenses
yes | sdkmanager --licenses 2>/dev/null || true

# Install required SDK components
echo "📦 Installing Android SDK components..."
sdkmanager --install \
  "platform-tools" \
  "platforms;android-33" \
  "build-tools;33.0.2" \
  "cmdline-tools;latest"

echo ""
echo "✅ Android SDK setup complete!"
echo ""

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "================================================"
echo "  ✅ Setup complete! Run ./build-apk.sh"
echo "================================================"
