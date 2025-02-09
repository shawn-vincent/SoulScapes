 // src/pages/Room.js
import React, { useState, useEffect } from 'react';
import { List } from '@phosphor-icons/react';
import DividedLayout from '../components/DividedLayout';
import MessageList from '../components/MessageList';
import Avatar from '../components/Avatar';
import ScrollLayout from '../components/ScrollLayout';
import AvatarClusterLayout from '../components/AvatarClusterLayout';
import AvatarHorizontalGridLayout from '../components/AvatarHorizontalGridLayout';
import styles from './Room.module.css';

const Room = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Render the message area (left pane).
  const renderMessageArea = () => (
    <div className={styles.messageArea}>
      <MessageList />
    </div>
  );

  // Render the avatar area (right pane), split horizontally:
  // - Top: 80% for the cluster layout
  // - Bottom: 20% for the horizontal grid layout
  const renderAvatarArea = () => (
    <DividedLayout orientation="horizontal" initialPrimaryRatio={0.80}>
      {/* Top (80%) - Cluster */}
	<div className={styles.avatarClusterContainer}>
	    <ScrollLayout>

		{(true && <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Desert_Electric.jpg/1920px-Desert_Electric.jpg'/>)}
		
		{(false && 
		<AvatarClusterLayout avatarSize={80}>
		    {Array.from({ length: 10 }, (_, i) => {
			const letter = String.fromCharCode(65 + (i % 26));
			const extra = i >= 26 ? i - 26 + 1 : '';
			return (
			    <Avatar
				key={`cluster-${i}`}
				data={{
					initials: letter + extra,
					color: "#00f",
					size: 80
				    }}
			    />
			);
		    })}
		</AvatarClusterLayout>
		 )}
		
	    </ScrollLayout>
      </div>

      {/* Bottom (20%) - Horizontal Grid */}
	<div className={styles.avatarGridContainer}>
	  <ScrollLayout top={false} bottom={false}>
              <AvatarHorizontalGridLayout avatarSize={80} gap={10}>
		  <Avatar data={{
			      key:"self",
			      initials: "You",
			      color: "#f00",
			      size: 80,
			      local: true
			  }}/>
		  <Avatar key="1" data={{initials: "1", color: "#00f", size: 80}} />
		  <Avatar key="2" data={{initials: "2", color: "#00f", size: 80}} />
		  <Avatar key="3" data={{initials: "3", color: "#00f", size: 80}} />
              </AvatarHorizontalGridLayout>
	  </ScrollLayout>
	</div>
    </DividedLayout>
  );

  // Desktop layout: side-by-side vertical DividedLayout:
  // - Left = Message Area
  // - Right = Avatar Area
  const renderDesktopContent = () => (
    <DividedLayout orientation="vertical" initialPrimaryRatio={0.25}>
      {renderMessageArea()}
      {renderAvatarArea()}
    </DividedLayout>
  );

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
        {renderDesktopContent()}
      </div>

      {/* Input Bar */}
      <div className={styles.inputContainer}>
        <input
          type="text"
          className={styles.textInput}
          placeholder="Type a message..."
        />
      </div>

      {/* Side Menu (placed last to ensure higher stacking context) */}
      <div
        className={`${styles.sideMenu} ${menuOpen ? styles.open : ''}`}
      >
        {/* Menu content goes here */}
        <h4>Side Menu</h4>
        <p>Menu content or navigation links can go here.</p>
      </div>
    </div>
  );
};

export default Room;
