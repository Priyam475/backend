#!/bin/bash
# Setup Android SDK environment variables

export ANDROID_HOME=/media/jimmy/Projects/Android/Sdk
export ANDROID_SDK_ROOT=/media/jimmy/Projects/Android/Sdk

# Add Android SDK tools to PATH
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/emulator

echo "Android SDK environment variables set:"
echo "  ANDROID_HOME=$ANDROID_HOME"
echo "  ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
echo ""
echo "To make this permanent, add these lines to your ~/.bashrc or ~/.zshrc:"
echo ""
echo "export ANDROID_HOME=/media/jimmy/Projects/Android/Sdk"
echo "export ANDROID_SDK_ROOT=/media/jimmy/Projects/Android/Sdk"
echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
echo "export PATH=\$PATH:\$ANDROID_HOME/tools"
echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin"
echo "export PATH=\$PATH:\$ANDROID_HOME/emulator"
