#!/bin/bash
# Build APK directly using Gradle (no Android Studio needed)

set -e  # Exit on error

echo "🔨 Building web app..."
npm run build

echo "📦 Syncing with Capacitor..."
export ANDROID_HOME=/media/jimmy/Projects/Android/Sdk
export ANDROID_SDK_ROOT=/media/jimmy/Projects/Android/Sdk
npx cap sync android

echo "🏗️  Building Android APK..."
cd android

# Build debug APK
echo "Building debug APK..."
./gradlew assembleDebug

# Build release APK (unsigned)
echo "Building release APK (unsigned)..."
./gradlew assembleRelease

cd ..

echo ""
echo "✅ APK build complete!"
echo ""
echo "📱 Debug APK location:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "📱 Release APK location:"
echo "   android/app/build/outputs/apk/release/app-release-unsigned.apk"
echo ""
echo "💡 To install debug APK on connected device:"
echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "💡 For signed release APK, you'll need to set up signing (see documentation)"
