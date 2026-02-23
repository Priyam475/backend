#!/bin/bash
# Wrapper script to run Capacitor Android commands with proper SDK path

export ANDROID_HOME=/media/jimmy/Projects/Android/Sdk
export ANDROID_SDK_ROOT=/media/jimmy/Projects/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/emulator

# Run the Capacitor command passed as arguments
npx cap "$@"
