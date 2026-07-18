#!/bin/bash

# ==============================================================================
# Emscripten SDK Activation Script (Bash)
#
# NOTE: To apply these environment variables to your current terminal session,
# you MUST run this script using 'source' or '.':
#
#   source ./active_emsdk.sh
# ==============================================================================

# Dynamically search for emsdk directory
EMSDK_DIR=""

# 1. Check if EMSDK variable is already defined
if [ -n "$EMSDK" ] && [ -d "$EMSDK" ]; then
  EMSDK_DIR="$EMSDK"
fi

# 2. Check typical root/home directories (fast search)
if [ -z "$EMSDK_DIR" ]; then
  for base in "$HOME" "/c/Users/$(whoami)" "/c"; do
    if [ -d "$base/emsdk" ]; then
      EMSDK_DIR="$base/emsdk"
      break
    fi
  done
fi

# 3. Fallback to finding emsdk up to 2 directories deep in the user's home folder
if [ -z "$EMSDK_DIR" ]; then
  echo "Locating emsdk directory dynamically..."
  EMSDK_DIR=$(find "$HOME" -maxdepth 2 -name "emsdk" -type d 2>/dev/null | head -n 1)
fi

if [ -n "$EMSDK_DIR" ] && [ -d "$EMSDK_DIR" ]; then
  echo "Found emsdk at: $EMSDK_DIR"
  
  ORIG_DIR=$(pwd)
  cd "$EMSDK_DIR" || exit 1
  
  # Source the environment variables script
  if [ -f "./emsdk_env.sh" ]; then
    . ./emsdk_env.sh
    echo "Emscripten SDK environment successfully loaded."
  else
    echo "Error: emsdk_env.sh not found inside $EMSDK_DIR"
    cd "$ORIG_DIR" || exit 1
    return 1 2>/dev/null || exit 1
  fi
  
  cd "$ORIG_DIR" || exit 1
else
  echo "Error: emsdk directory could not be located on your machine."
  return 1 2>/dev/null || exit 1
fi
