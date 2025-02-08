#!/bin/bash
# server_start.sh
# This script changes directory to the server folder (soulscapes-server) and starts the server.
# Usage: ./server_start.sh

# Define the server directory relative to the project root.
SERVER_DIR="soulscapes-server"

# Check if the server directory exists.
if [ ! -d "$SERVER_DIR" ]; then
  echo "❌ Directory '$SERVER_DIR' not found. Please ensure you are running this script from the root of your project."
  exit 1
fi

# Change to the server directory.
cd "$SERVER_DIR" || { echo "❌ Failed to change directory to '$SERVER_DIR'."; exit 1; }

# Check if package.json exists in the server directory.
if [ ! -f package.json ]; then
  echo "❌ package.json not found in '$SERVER_DIR'. Please ensure your server is correctly set up."
  exit 1
fi

echo "🚀 Starting the SoulScapes server in $(pwd)..."
npm start
