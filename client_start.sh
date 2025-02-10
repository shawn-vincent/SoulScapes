#!/bin/bash
# client_start.sh
# This script changes directory to the client folder (soulscapes-client) and starts the client.
# Usage: ./client_start.sh

# Define the client directory relative to the project root.
CLIENT_DIR="soulscapes-client"

# Check if the client directory exists.
if [ ! -d "$CLIENT_DIR" ]; then
  ./slog error "❌ Directory '$CLIENT_DIR' not found. Please ensure you are running this script from the root of your project."
  exit 1
fi

# Change to the client directory.
cd "$CLIENT_DIR" || { ./slog error "❌ Failed to change directory to '$CLIENT_DIR'."; exit 1; }

# Check if package.json exists in the client directory.
if [ ! -f package.json ]; then
  ../slog error "❌ package.json not found in '$CLIENT_DIR'. Please ensure your client is correctly set up."
  exit 1
fi

../slog "🚀 Starting the SoulScapes client in $(pwd)..."
export DANGEROUSLY_DISABLE_HOST_CHECK=true
npm start
