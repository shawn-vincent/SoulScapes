#!/usr/bin/env node
/*
   smore.js — a "less"-like pager for large log files (no stdin).
   No global line-index; uses chunk-based reading forward/backward.
   - Up/Down arrows: move highlight line-by-line
   - PgUp/PgDn: page up/down
   - Home/End: go to start/end of file
   - Left/Right: horizontal scroll
   - 'q' / Esc / Ctrl-C: quit
   - Synthetic markers for top/bottom of file
   - If file grows and you're at bottom, it auto-refreshes to show new lines
*/



if (process.argv.length < 3) {
  console.error('Usage: smore <filename>');
  process.exit(1);
}

const filePath = process.argv[2];

// How many lines to keep in memory at most
// (You can adjust this number to keep more or fewer lines in the buffer.)
const MAX_LINE_BUFFER = 10000;

// How many bytes to read in one chunk
// (Adjust if lines are very large or you want different performance trade-offs.)
const READ_CHUNK_SIZE = 65536; // 64 KB

// ----------------------------------------------------------------------------
// Data Structures
// ----------------------------------------------------------------------------

/**
 * linesInBuffer:
 *   Array of { text: string, start: number, end: number }
 *   - text: the line content (without the newline)
 *   - start: byte offset in file where this line begins
 *   - end: byte offset in file right after the newline (or end-of-file if no newline)
 *
 * We'll keep these lines in sorted order (lowest offset at index 0).
 *
 * highlightIndex: index in linesInBuffer that is currently highlighted.
 * topIndex: index in linesInBuffer that appears at the top of the screen.
 *
 * scrollLeft: horizontal offset for viewing long lines.
 *
 * The file can grow. We'll re-stat the file to see if size changed. If the user
 * is at the bottom, we load newly appended lines.
 */
let linesInBuffer = [];
let highlightIndex = 0;  // Which line in linesInBuffer is highlighted
let topIndex = 0;        // Which line in linesInBuffer is at the top of the screen
let scrollLeft = 0;      // Horizontal scroll offset
let fileSize = 0;        // Tracks the file size on last check

// ----------------------------------------------------------------------------
// File Reading Helpers
// ----------------------------------------------------------------------------

let fd = null;

async function openFile() {
  fd = await fs.promises.open(filePath, 'r');
  const stats = await fd.stat();
  fileSize = stats.size;
}

/**
 * readForward(startOffset, minLines) -> reads forward from startOffset
 * in chunks, parses out lines, and returns an array of parsed lines
 * at least minLines in length (or until EOF).
 *
 * Each returned item is { text, start, end } as described above.
 */
async function readForward(startOffset, minLines) {
  let results = [];
  let offset = startOffset;
  let leftover = ''; // partial line from the previous chunk read
  let bytesRead;

  while (results.length < minLines && offset < fileSize) {
    const toRead = Math.min(READ_CHUNK_SIZE, fileSize - offset);
    const buffer = Buffer.alloc(toRead);
    ({ bytesRead } = await fd.read(buffer, 0, toRead, offset));
    if (bytesRead <= 0) break;

    const chunkStr = leftover + buffer.slice(0, bytesRead).toString('utf8');
    leftover = '';

    let start = 0;
    let idx;
    // Parse out newlines
    while ((idx = chunkStr.indexOf('\n', start)) !== -1) {
      const lineText = chunkStr.substring(start, idx);
      const lineStart = offset + start;
      const lineEnd = offset + idx + 1;
      results.push({ text: lineText, start: lineStart, end: lineEnd });
      start = idx + 1;
    }
    // If there's leftover text (no trailing newline), store it
    if (start < chunkStr.length) {
      leftover = chunkStr.substring(start);
    }
    offset += bytesRead;
  }

  // If there's leftover text at EOF, that becomes a line without a trailing newline.
  if (offset >= fileSize && leftover.length > 0) {
    results.push({
      text: leftover,
      start: offset - leftover.length,
      end: fileSize
    });
    leftover = '';
  }

  return results;
}

/**
 * readBackward(endOffset, minLines) -> reads backward from endOffset
 * in chunks, parses out lines in reverse. Returns an array of lines
 * in ascending order of offsets. e.g. [line1, line2, line3...]
 *
 * We'll read chunk by chunk *before* endOffset, parse lines, and keep going
 * until we get minLines or reach start of file.
 */
async function readBackward(endOffset, minLines) {
  let results = [];
  let offset = endOffset;
  let leftover = ''; // partial line from the *front* of the chunk
  while (results.length < minLines && offset > 0) {
    const toRead = Math.min(READ_CHUNK_SIZE, offset);
    const readStart = offset - toRead;
    const buffer = Buffer.alloc(toRead);
    const { bytesRead } = await fd.read(buffer, 0, toRead, readStart);
    if (bytesRead <= 0) break;

    const chunkStr = buffer.slice(0, bytesRead).toString('utf8') + leftover;
    leftover = '';

    let lines = [];
    let lastPos = chunkStr.length;
    let idx;
    // We look for '\n' from the end backward
    while ((idx = chunkStr.lastIndexOf('\n', lastPos - 1)) !== -1) {
      const lineText = chunkStr.substring(idx + 1, lastPos);
      const lineEnd = readStart + lastPos;
      const lineStart = readStart + idx + 1;
      lines.push({ text: lineText, start: lineStart, end: lineEnd });
      lastPos = idx;
    }
    // Whatever remains from 0..lastPos is leftover text (no leading newline)
    if (lastPos > 0) {
      leftover = chunkStr.substring(0, lastPos);
    }
    // We'll push them in reverse order so they ascend by offset
    lines.reverse();
    results = [...lines, ...results];
    offset = readStart;
  }

  // If leftover remains at the start of file, that forms one line
  if (offset === 0 && leftover.length > 0) {
    results = [{
      text: leftover,
      start: 0,
      end: leftover.length
    }].concat(results);
    leftover = '';
  }

  return results;
}

/**
 * fillBufferForward() -> read more lines from the end of our current buffer
 * up to some number, then push them into linesInBuffer. We also do pruning if
 * we exceed MAX_LINE_BUFFER.
 */
async function fillBufferForward(minLinesNeeded = 100) {
  if (!linesInBuffer.length) {
    // If buffer is empty, read from offset=0
    let newLines = await readForward(0, minLinesNeeded);
    linesInBuffer.push(...newLines);
    pruneBuffer();
    return;
  }
  const lastLine = linesInBuffer[linesInBuffer.length - 1];
  if (lastLine.end < fileSize) {
    // we can read from lastLine.end
    let newLines = await readForward(lastLine.end, minLinesNeeded);
    linesInBuffer.push(...newLines);
    pruneBuffer();
  }
}

/**
 * fillBufferBackward() -> read more lines from the start of our current buffer
 * then unshift them into linesInBuffer. Also prune if needed.
 */
async function fillBufferBackward(minLinesNeeded = 100) {
  if (!linesInBuffer.length) {
    // If buffer is empty, read backward from fileSize
    const stats = await fd.stat();
    fileSize = stats.size; // update
    let newLines = await readBackward(fileSize, minLinesNeeded);
    linesInBuffer.push(...newLines);
    pruneBuffer();
    return;
  }
  const firstLine = linesInBuffer[0];
  if (firstLine.start > 0) {
    let newLines = await readBackward(firstLine.start, minLinesNeeded);
    // unshift them
    linesInBuffer.unshift(...newLines);
    pruneBuffer();
  }
}

/**
 * pruneBuffer(): if linesInBuffer exceeds MAX_LINE_BUFFER lines, remove from
 * the opposite side of whichever area the user is currently viewing.
 *
 * This is a design choice; if the user is near the top, we might remove from the bottom first, etc.
 * For simplicity, let's just remove from the front if highlightIndex is in the second half,
 * or remove from the back if highlightIndex is in the first half. 
 */
function pruneBuffer() {
  if (linesInBuffer.length <= MAX_LINE_BUFFER) return;

  let half = Math.floor(linesInBuffer.length / 2);
  if (highlightIndex >= half) {
    // user is in the "second half," so remove some from the front
    let removeCount = linesInBuffer.length - MAX_LINE_BUFFER;
    linesInBuffer.splice(0, removeCount);
    // adjust highlightIndex and topIndex
    highlightIndex -= removeCount;
    topIndex -= removeCount;
    if (topIndex < 0) topIndex = 0;
    if (highlightIndex < 0) highlightIndex = 0;
  } else {
    // user is in the "first half," so remove from the back
    let removeCount = linesInBuffer.length - MAX_LINE_BUFFER;
    linesInBuffer.splice(linesInBuffer.length - removeCount, removeCount);
  }
}

/**
 * ensureLineInBuffer(i):
 *   If i < 0, that means we're "above" the first stored line, so read backward.
 *   If i >= linesInBuffer.length, read forward.
 */
async function ensureLineInBuffer(i) {
  // If i is below 0, read backward
  while (i < 0) {
    let oldLen = linesInBuffer.length;
    let firstStart = oldLen ? linesInBuffer[0].start : fileSize;
    if (firstStart === 0) {
      // we can't go further
      break;
    }
    await fillBufferBackward();
    i += (linesInBuffer.length - oldLen);
  }

  // If i >= linesInBuffer.length, read forward
  while (i >= linesInBuffer.length) {
    let oldLen = linesInBuffer.length;
    if (!oldLen) {
      await fillBufferForward();
    } else {
      let lastEnd = linesInBuffer[oldLen - 1].end;
      if (lastEnd >= fileSize) {
        // can't go further
        break;
      }
      await fillBufferForward();
    }
  }
}

// ----------------------------------------------------------------------------
// Blessed UI Setup
// ----------------------------------------------------------------------------

const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  title: 'smore'
});

const box = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  tags: true,
  style: {
    fg: 'white',
    bg: 'black'
  }
});

screen.append(box);

// ----------------------------------------------------------------------------
// Render Logic
// ----------------------------------------------------------------------------

function escapeForBlessed(str) {
  return str.replace(/{/g, '\\{').replace(/}/g, '\\}');
}

async function render() {
  // Re-check file size
  let stats = await fd.stat();
  if (stats.size < fileSize) {
    // file truncated
    linesInBuffer = [];
    highlightIndex = 0;
    topIndex = 0;
  }
  fileSize = stats.size;

  // If we're at the bottom and file grew, read forward
  // "At the bottom" means the last line in buffer ends at fileSize
  // AND highlightIndex is near the last line. We can define "near" as within 1 screen.
  let pageHeight = box.height;
  let bottomLineIndex = linesInBuffer.length - 1;
  if (
    bottomLineIndex - highlightIndex < pageHeight &&
    linesInBuffer.length &&
    linesInBuffer[bottomLineIndex].end < fileSize
  ) {
    // read more
    await fillBufferForward();
  }

  // Now build the page lines from topIndex to topIndex + pageHeight
  let endIndex = topIndex + pageHeight - 1;
  let contentLines = [];

  // Synthetic top marker if topIndex==0 and first line starts at 0
  let showTopMarker =
    topIndex <= 0 &&
    linesInBuffer.length > 0 &&
    linesInBuffer[0].start === 0;

  // Synthetic bottom marker if we near the end
  // i.e. the last line in the buffer ends at fileSize
  let bottomAtFile = false;
  if (linesInBuffer.length > 0) {
    let lastLine = linesInBuffer[linesInBuffer.length - 1];
    bottomAtFile = (lastLine.end >= fileSize);
  }

  for (let i = topIndex; i <= endIndex; i++) {
    if (i < 0) {
      // This means we are above the very start of buffer
      // i.e. we can show the top marker
      contentLines.push('{bold}{cyan-fg}<<< TOP OF FILE >>>{/cyan-fg}{/bold}');
    } else if (i >= linesInBuffer.length) {
      // This means we've gone past the end of available lines
      // So we might be at bottom-of-file
      if (bottomAtFile) {
        contentLines.push('{bold}{cyan-fg}<<< BOTTOM OF FILE >>>{/cyan-fg}{/bold}');
      } else {
        contentLines.push('');
      }
    } else {
      // Normal line
      let lineObj = linesInBuffer[i];
      let text = lineObj.text;
      // apply horizontal scroll
      if (scrollLeft < text.length) {
        text = text.substring(scrollLeft);
      } else {
        text = '';
      }
      text = escapeForBlessed(text);

      if (i === highlightIndex) {
        text = '{inverse}' + text + '{/inverse}';
      }
      contentLines.push(text);
    }
  }

  // If topIndex=0 and the first real line's start=0, we *replace* the top line with a marker
  // but this is done above in the for-loop. The same logic for the bottom marker.

  box.setContent(contentLines.join('\n'));
  screen.render();
}

// ----------------------------------------------------------------------------
// Navigation
// ----------------------------------------------------------------------------

async function moveHighlight(delta) {
  let newIndex = highlightIndex + delta;
  await ensureLineInBuffer(newIndex); // read if needed
  highlightIndex = Math.max(0, Math.min(newIndex, linesInBuffer.length - 1));
  adjustTopIndex();
  await render();
}

function adjustTopIndex() {
  // Ensure highlightIndex is within visible range (topIndex .. topIndex + pageHeight-1)
  let pageHeight = box.height;
  if (highlightIndex < topIndex) {
    topIndex = highlightIndex;
  } else if (highlightIndex >= topIndex + pageHeight) {
    topIndex = highlightIndex - (pageHeight - 1);
  }
  if (topIndex < 0) topIndex = 0;
}

// Up arrow
screen.key(['up'], async () => {
  // If highlightIndex is 0 and the first line starts at 0, maybe we show synthetic top?
  if (highlightIndex === 0) {
    // we might read backward, in case there's more lines
    await fillBufferBackward();
  }
  await moveHighlight(-1);
});

// Down arrow
screen.key(['down'], async () => {
  await moveHighlight(1);
});

// Page Up
screen.key(['pageup'], async () => {
  let pageHeight = box.height;
  await moveHighlight(-pageHeight);
});

// Page Down
screen.key(['pagedown'], async () => {
  let pageHeight = box.height;
  await moveHighlight(pageHeight);
});

// Home: jump to the very start of file
screen.key(['home'], async () => {
  // Clear buffer, read from offset=0
  linesInBuffer = [];
  highlightIndex = 0;
  topIndex = 0;
  await fillBufferForward(box.height); // at least one page
  await render();
});

// End: jump to the end of file
screen.key(['end'], async () => {
  // Clear buffer, read from end of file
  linesInBuffer = [];
  highlightIndex = 0;
  topIndex = 0;
  const stats = await fd.stat();
  fileSize = stats.size;
  await fillBufferBackward(box.height);
  // highlight the last line
  highlightIndex = linesInBuffer.length - 1;
  adjustTopIndex();
  await render();
});

// Left arrow: horizontal scroll left
screen.key(['left'], async () => {
  scrollLeft = Math.max(0, scrollLeft - 5);
  await render();
});

// Right arrow: horizontal scroll right
screen.key(['right'], async () => {
  scrollLeft += 5;
  await render();
});

// Quit
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

// On resize, re-render
screen.on('resize', async () => {
  await render();
});

// ----------------------------------------------------------------------------
// Periodic Check for File Growth
// ----------------------------------------------------------------------------
setInterval(async () => {
  // If we are near bottom, read more
  if (linesInBuffer.length) {
    let lastLine = linesInBuffer[linesInBuffer.length - 1];
    let stats = await fd.stat();
    if (stats.size > fileSize) {
      // file grew
      fileSize = stats.size;
      // If highlight is near bottom, read forward
      let pageHeight = box.height;
      if (linesInBuffer.length - 1 - highlightIndex < pageHeight) {
        await fillBufferForward();
        // keep highlight at bottom if it was at bottom
        highlightIndex = linesInBuffer.length - 1;
        adjustTopIndex();
        await render();
      }
    }
  }
}, 1000);

// ----------------------------------------------------------------------------
// Main Entry
// ----------------------------------------------------------------------------
(async function main() {
  try {
    await openFile();
  } catch (err) {
    console.error('Failed to open file:', err);
    process.exit(1);
  }

  // Initial load (start from top of file)
  await fillBufferForward(box.height); // fill at least one page
  await render();
})();

/* Local Variables: */
/* mode: js */
/* End: */
