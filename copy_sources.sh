#!/bin/bash

# Usage: copy_sources.sh "<pattern1>" "<pattern2>" ...
# Example: copy_sources.sh "*.js" "*.sh"
#
# This script finds all files matching the provided patterns,
# prepends each with a header line containing its filename, and
# copies the concatenated output to the clipboard using pbcopy.

if [ "$#" -eq 0 ]; then
    echo "Usage: $0 \"<pattern1>\" \"<pattern2>\" ..."
    exit 1
fi

# Build the find command with multiple patterns
find_cmd="find . -type f \\( "
first=1

for pattern in "$@"; do
    if [ "$first" -eq 1 ]; then
        first=0
    else
        find_cmd+=" -o "
    fi
    find_cmd+=" -name \"$pattern\""
done

find_cmd+=" \\) "

# Execute the find command, process each file, and copy the output to the clipboard.
{
  eval "$find_cmd" | while read -r file; do
      echo "===== $file ====="
      cat "$file"
      echo ""  # Add a newline for separation
  done
} | pbcopy
