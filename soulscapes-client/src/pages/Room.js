 // src/pages/Room.js
import React, { useState, useRef, useEffect } from 'react';
import { List } from '@phosphor-icons/react';
import DividedLayout from '../components/DividedLayout';
import MessageList from '../components/MessageList';
import Avatar from '../components/Avatar';
import ScrollLayout from '../components/ScrollLayout';
import AvatarClusterLayout from '../components/AvatarClusterLayout';
import AvatarHorizontalGridLayout from '../components/AvatarHorizontalGridLayout';
import styles from './Room.module.css';

import roomManager from "../services/RoomManager";
import localAvatarManager from "../services/LocalAvatarManager";
import remoteAvatarManager from "../services/RemoteAvatarManager";


const Room = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [connectionStatus, setConnectionStatus] = useState(localAvatarManager.getAvatarData().connectionStatus);

  useEffect(() => {	
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasJoined = useRef(false); // Prevent duplicate joins
  useEffect(() => {

      if (!hasJoined.current) {
	  roomManager.joinRoom("lobby");
	  hasJoined.current = true;
      }
      
      // Listen for connection status updates
      const updateStatus = (status) => setConnectionStatus(status);
      localAvatarManager.on("statusChanged", updateStatus);
      
      return () => {
	  localAvatarManager.off("statusChanged", updateStatus);
      };
  }, []);


  const [avatars, setAvatars] =
	  useState(remoteAvatarManager.getAvatarsForCurrentRoom());
  const [localAvatar, setLocalAvatar] = useState(localAvatarManager.getAvatarData());

  useEffect(() => {
    const updateAvatars = () => {
      setAvatars([...remoteAvatarManager.getAvatarsForCurrentRoom()]);
    };

    const updateLocalAvatar = () => {
      setLocalAvatar({ ...localAvatarManager.getAvatarData() });
    };

      remoteAvatarManager.on("updated", updateAvatars);
      localAvatarManager.on("videoStreamUpdated", updateLocalAvatar);

    return () => {
	remoteAvatarManager.off("updated", updateAvatars);
	localAvatarManager.off("videoStreamUpdated", updateLocalAvatar);

    };
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

		{ // debugging scrolling nice to have just some big simple object.
		  (false && <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Desert_Electric.jpg/1920px-Desert_Electric.jpg'/>)
		}
		
		{(true && 
		  <AvatarClusterLayout avatarSize={80}>
		      {avatars.map(
			  (avatar) => (<Avatar key={avatar.id} data={avatar}/>)
		      )}
		  </AvatarClusterLayout>
		 )}
		
	    </ScrollLayout>
      </div>

      {/* Bottom (20%) - Horizontal Grid */}
	<div className={styles.avatarGridContainer}>
	  <ScrollLayout top={false} bottom={false}>
              <AvatarHorizontalGridLayout avatarSize={80} gap={10}>
		  <Avatar data={{ ...localAvatarManager.getAvatarData(),
				  connectionStatus }} />
		 
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
	      id="commandLine"
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
