#!/bin/bash
# tunnel_https.sh
#
# Usage: ./tunnel_https.sh [port]
# If no port is specified, defaults to 3000.

port="${1:-3000}"
echo "Starting ngrok on port $port..."
ngrok http "$port"
