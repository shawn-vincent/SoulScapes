#!/bin/bash
# copy_sources.sh
#
# Usage: copy_sources.sh "<pattern1>" "<pattern2>" ...
# Example: copy_sources.sh "*.js" "*.sh"
#
# This script uses git ls-files to list all tracked files (which respects .gitignore),
# filters the list based on the provided patterns,
# prepends each file with a header containing its filename,
# concatenates the results and copies them to the clipboard using pbcopy,
# and prints a summary (number of files, character count, and list of files).

if [ "$#" -eq 0 ]; then
    ./slog "Usage: $0 \"<pattern1>\" \"<pattern2>\" ..."
    ./slog "Copies matched files to clipboard.  Remember to quote patterns!"
    exit 1
fi

# Retrieve all tracked files via git ls-files.
all_files=$(git ls-files)

if [ -z "$all_files" ]; then
    ./slog "No tracked files found in this repository."
    exit 0
fi

# Filter the files based on the provided patterns.
# The provided patterns are shell globs (e.g. "*.js"), so we use bash's pattern matching.
filtered_files=""
while IFS= read -r file; do
    for pattern in "$@"; do
        if [[ "$file" == $pattern ]]; then
            filtered_files+="$file"$'\n'
            break  # Stop checking further patterns if one matches.
        fi
    done
done <<< "$all_files"

if [ -z "$filtered_files" ]; then
    ./slog "No files matched the given patterns."
    exit 0
fi

# Initialize variables for output.
file_count=0
output=""
file_list=""

# Process each filtered file.
while IFS= read -r file; do
    # Skip empty lines.
    [ -z "$file" ] && continue

    # Log the filename being copied.
    ./slog "Copying file: $file"

    file_count=$((file_count + 1))
    file_list+="$file"$'\n'
    output+="===== $file ====="$'\n'
    output+=$(cat "$file")
    output+=$'\n'
done <<< "$filtered_files"

# Copy the concatenated output to the clipboard.
echo "$output" | pbcopy

# Calculate the total number of characters.
char_count=$(echo -n "$output" | wc -c)

# Print the summary.
./slog "Copied $file_count files ($char_count characters) to the clipboard."
