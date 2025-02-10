// src/utils/zoomUtils.js

/**
 * Applies a zoom-in operation by increasing the current size by a given percentage.
 * Also receives information about which scroll buttons are active.
 *
 * @param {function} setSize - The state setter to update the avatar size.
 * @param {number} currentSize - The current avatar size.
 * @param {object} activeScrollButtons - Information about active scroll buttons,
 *        for example: { top: false, bottom: false, left: true, right: true }.
 * @param {number} [percentage=10] - The percentage by which to increase the size.
 * @returns {number} newSize - The new avatar size.
 */
export function applyZoomIn(setSize, currentSize, activeScrollButtons, percentage = 10) {
  slog('applyZoomIn called. Active scroll buttons:', activeScrollButtons);
  const newSize = currentSize * (1 + percentage / 100);
  setSize(newSize);
  return newSize;
}
