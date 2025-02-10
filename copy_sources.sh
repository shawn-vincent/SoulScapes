#!/bin/bash
# copy_sources.sh
#
# Usage: copy_sources.sh "<pattern1>" "<pattern2>" ...
# Example: copy_sources.sh "*.js" "*.sh"
#
# This script finds all files matching the provided patterns,
# ignoring any files that are listed in .gitignore.
# It prepends each file with a header line containing its filename,
# copies the concatenated output to the clipboard using pbcopy,
# and prints a summary (number of files, character count, and list of files).

if [ "$#" -eq 0 ]; then
    echo "Usage: $0 \"<pattern1>\" \"<pattern2>\" ..."
    exit 1
fi

# Build the find command with multiple patterns.
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

# Execute the find command.
files=$(eval "$find_cmd")

if [ -z "$files" ]; then
    echo "No files matched the given patterns."
    exit 0
fi

# Filter out files that are ignored by .gitignore.
filtered_files=""
while IFS= read -r file; do
    # If git check-ignore finds the file, skip it.
    if git check-ignore -q "$file"; then
        continue
    else
        filtered_files+="$file"$'\n'
    fi
done <<< "$files"

# Check if any files remain after filtering.
if [ -z "$filtered_files" ]; then
    echo "No files remain after filtering out those ignored by .gitignore."
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
echo "Copied $file_count files ($char_count characters) to the clipboard."
echo "Files matched (after filtering .gitignore):"
echo "$file_list"
