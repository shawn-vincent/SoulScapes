#!/bin/bash
# tags_generate.sh
#
# This script generates an Emacs TAGS file for all source files tracked by Git,
# respecting your .gitignore.
#
# It uses:
#   - git ls-files to list all tracked files,
#   - etags (the Emacs tag generator) to produce the TAGS file,
#   - and the ./slog command to log progress.
#
# Usage:
#   ./tags_generate.sh
#
# Requirements:
#   - This script must be run from within a Git repository.
#   - etags must be installed (it is usually included with Emacs).
#   - The slog command (our Node.js CLI for slogger) must be accessible.
#
# Note: On macOS, etags expects the output file to be specified as “-oTAGS”
#       (without a space).
#
set -euo pipefail

# Verify that we're inside a Git repository.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ./slog error "Error: This script must be run within a Git repository."
  exit 1
fi

# Count the number of tracked files.
file_count=$(git ls-files | wc -l | tr -d ' ')
./slog "Processing $file_count files for TAGS generation..."

# Generate the TAGS file.
# Use null-delimited output from git ls-files (-z) and pass it with xargs (-0) to etags.
# Note: Use "-oTAGS" (without a space) as the option.
git ls-files -z | xargs -0 etags -oTAGS

./slog "✅ TAGS file generated successfully for $file_count files."
