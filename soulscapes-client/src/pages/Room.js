// src/pages/Room.js
import React, { useState, useRef, useEffect } from 'react';
import { List, ArrowsLeftRight } from '@phosphor-icons/react';
import MessageList from '../components/MessageList';
import AvatarSpace from '../components/AvatarSpace';
import SegmentedControl from '../components/SegmentedControl';
import styles from './Room.module.css';

const Room = () => {
  // For desktop: left panel width (default 25%)
  const [leftWidth, setLeftWidth] = useState(25);
  // For mobile: active segment (0 = left panel, 1 = right panel)
  const [activeSegment, setActiveSegment] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 600;

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Desktop: Handle dragging of the left/right divider.
  const onMouseDown = (e) => {
    e.preventDefault();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
    if (newLeftWidth < 10) newLeftWidth = 10;
    if (newLeftWidth > 90) newLeftWidth = 90;
    setLeftWidth(newLeftWidth);
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  // Mobile: Update active segment.
  const onSegmentChange = (segmentIndex) => {
    setActiveSegment(segmentIndex);
  };

  return (
    <div className={styles.room}>
      {/* Title Bar */}
      <div className={styles.titleBar}>
        <button
          className={styles.hamburger}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <List size={24} weight="regular" color="#fff" />
        </button>
        <span className={styles.title}>Lobby</span>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent} ref={containerRef}>
        {isMobile ? (
          // Mobile: Show one panel based on segmented control.
          activeSegment === 0 ? (
            <div className={styles.panelMobile}>
              <MessageList />
            </div>
          ) : (
            <div className={styles.panelMobile}>
              <AvatarSpace />
            </div>
          )
        ) : (
          // Desktop: Show both panels side by side.
          <>
            <div
              className={styles.panelLeft}
              style={{ width: `${leftWidth}%` }}
            >
              <MessageList />
            </div>
            <div className={styles.divider} onMouseDown={onMouseDown}>
              <div className={styles.dividerHandle}>
                <ArrowsLeftRight size={16} weight="regular" color="#fff" />
              </div>
            </div>
            <div
              className={styles.panelRight}
              style={{ width: `${100 - leftWidth}%` }}
            >
              <AvatarSpace />
            </div>
          </>
        )}
      </div>

      {/* (Optional) Segmented Control Bar for Mobile */}
      {isMobile && (
        <div className={styles.segmentedControlBar}>
          <SegmentedControl active={activeSegment} onSelect={onSegmentChange} />
        </div>
      )}

      {/* Input Bar */}
      <div className={styles.inputContainer}>
        <input
          type="text"
          className={styles.textInput}
          placeholder="Type a message..."
        />
      </div>

      {/* Side Menu */}
      <div className={`${styles.sideMenu} ${menuOpen ? styles.open : ''}`}>
        {/* Menu content goes here */}
      </div>
    </div>
  );
};

export default Room;
