// src/pages/Room.js
import React, { useState, useEffect } from 'react';
import { List } from '@phosphor-icons/react';
import DividedLayout from '../components/DividedLayout';
import MessageList from '../components/MessageList';
import Avatar from '../components/Avatar';
import styles from './Room.module.css';

const Room = () => {
  const [activeSegment, setActiveSegment] = useState(0); // 0: MessageList, 1: Avatar area
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 600;
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const onSegmentChange = (segmentIndex) => setActiveSegment(segmentIndex);

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
      <div className={styles.mainContent}>
        {isMobile ? (
          // Mobile: Show one panel based on segmented control.
          activeSegment === 0 ? (
            <div className={styles.panelMobile}>
              <MessageList />
            </div>
          ) : (
            <div className={styles.panelMobile}>
              <DividedLayout orientation="horizontal" initialPrimaryRatio={0.7}>
                <div>
                  {/* Top part of Avatar area */}
                  Avatar Top Content
                </div>
                <div className={styles.avatarContainer}>
                  {/* Bottom part of Avatar area: display the avatar */}
                  <Avatar initials="JS" borderColor="#00f" />
                </div>
              </DividedLayout>
            </div>
          )
        ) : (
          // Desktop: Left panel is MessageList; right panel is the Avatar area.
          <DividedLayout orientation="vertical" initialPrimaryRatio={0.25}>
            <MessageList />
            <DividedLayout orientation="horizontal" initialPrimaryRatio={0.7}>
              <div>
                {/* Top part of Avatar area */}
                Avatar Top Content
              </div>
              <div className={styles.avatarContainer}>
                {/* Bottom part of Avatar area: display the avatar */}
                <Avatar initials="JS" borderColor="#00f" />
              </div>
            </DividedLayout>
          </DividedLayout>
        )}
      </div>

      {/* (Optional) Segmented Control Bar for Mobile */}
      {isMobile && (
        <div className={styles.segmentedControlBar}>
          <button onClick={() => onSegmentChange(0)}>•</button>
          <button onClick={() => onSegmentChange(1)}>•</button>
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
