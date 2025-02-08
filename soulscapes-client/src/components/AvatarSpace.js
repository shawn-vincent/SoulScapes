// src/components/AvatarSpace.js
import React, { useState, useRef } from 'react';
import { ArrowsDownUp } from '@phosphor-icons/react';
import styles from './AvatarSpace.module.css';

const AvatarSpace = () => {
  // bottomHeight is the height of the bottom section (default 50px)
  const [bottomHeight, setBottomHeight] = useState(50);
  const containerRef = useRef(null);
  const dividerHeight = 12; // height of the divider bar

  const onMouseDown = (e) => {
    e.preventDefault();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Calculate new bottom height as the distance from the mouse to the container's bottom,
    // adjusted by half the divider height.
    let newBottomHeight = rect.bottom - e.clientY - dividerHeight / 2;
    // Set some minimum and maximum constraints:
    const minHeight = 30; // minimum height for the bottom section
    const maxHeight = rect.height - 30 - dividerHeight; // ensure top has at least 30px
    if (newBottomHeight < minHeight) newBottomHeight = minHeight;
    if (newBottomHeight > maxHeight) newBottomHeight = maxHeight;
    setBottomHeight(newBottomHeight);
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={styles.avatarSpace} ref={containerRef}>
      {/* Top section occupies the remaining space */}
      <div
        className={styles.topSection}
        style={{ height: `calc(100% - ${bottomHeight + dividerHeight}px)` }}
      >
        {/* Top section content (transparent) */}
      </div>
      {/* Divider */}
      <div className={styles.divider} onMouseDown={onMouseDown}>
        <div className={styles.dividerHandle}>
          <ArrowsDownUp size={16} weight="regular" color="#fff" />
        </div>
      </div>
      {/* Bottom section (default height 50px, adjustable via dragging) */}
      <div
        className={styles.bottomSection}
        style={{ height: `${bottomHeight}px` }}
      >
        {/* Bottom section content (transparent) */}
      </div>
    </div>
  );
};

export default AvatarSpace;
