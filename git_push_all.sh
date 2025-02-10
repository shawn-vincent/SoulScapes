#!/bin/bash
# git_push_all.sh
# This script adds all files, commits them, and pushes the changes.
# Usage:
#   ./git_push_all.sh [-m "Your commit message"]
#
# If the -m flag is not provided, a default commit message is used.

# Set a default commit message including the current date and time.
commit_message="Auto commit on $(date)"

# Parse command line options.
while getopts "m:" opt; do
  case "$opt" in
    m) commit_message="$OPTARG" ;;
    *) ./slog "Usage: $0 [-m \"commit message\"]" >&2; exit 1 ;;
  esac
done

# Add all changes.
./slog "➕ Adding all changes..."
git add .

# Commit with the provided or default commit message.
./slog "📝 Committing changes with message: \"$commit_message\""
git commit -m "$commit_message"

# Push to the remote repository.
./slog "🚀 Pushing changes..."
git push

./slog "✅ Done!"
