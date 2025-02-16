// src/pages/Spot.js
import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { List, ChatTeardropText, Users } from '@phosphor-icons/react';
import DividedLayout from '../components/DividedLayout';
import MessageList from '../components/MessageList';
import Avatar from '../components/Avatar';
import ScrollLayout from '../components/ScrollLayout';
import AvatarClusterLayout from '../components/AvatarClusterLayout';
import AvatarHorizontalGridLayout from '../components/AvatarHorizontalGridLayout';

import spotManager from "../services/SpotManager";
import localAvatarManager from "../services/LocalAvatarManager";
import remoteAvatarManager from "../services/RemoteAvatarManager";

// Styled Components using Emotion

const SpotContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background-image: url('https://upload.wikimedia.org/wikipedia/commons/4/43/Mountain_top_scenic.jpg');
  background-size: cover;
  background-position: center;
`;

const TitleBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 30px;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-sizing: border-box;
  z-index: 3;
`;

const Hamburger = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #fff;
`;

const TitleText = styled.span`
  margin-left: 10px;
  color: #fff;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MainContent = styled.div`
  position: absolute;
  top: 30px;
  bottom: 40px; /* matches the input bar's height */
  left: 0;
  right: 0;
  overflow: hidden;
`;

const MessageArea = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const AvatarClusterContainer = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
`;

const AvatarGridContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: 5px;
  box-sizing: border-box;
`;

const InputContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-sizing: border-box;
  z-index: 3;
`;

const TextInput = styled.input`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.6);
  color: black;
  height: calc(100% - 8px);
  margin: 4px;
  border: none;
  padding: 4px;
  font-size: 16px;
  outline: none;
  border-radius: 20px;
  box-sizing: border-box;
`;

const SideMenu = styled.div`
  position: absolute;
  top: 30px;
  left: 0;
  width: 250px;
  height: calc(100vh - 70px); /* 30px for title bar, 40px for input bar */
  background-color: rgba(0, 0, 0, 0.8);
  transform: translateX(${(props) => (props.open ? '0' : '-100%')});
  transition: transform 0.3s ease;
  z-index: 999;
  color: #fff;
  padding: 10px;
  box-sizing: border-box;
  overflow-y: auto;
`;

const Spot = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [connectionStatus, setConnectionStatus] = useState(
    localAvatarManager.getAvatarData().connectionStatus
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasJoined = useRef(false); // Prevent duplicate joins
  useEffect(() => {
    if (!hasJoined.current) {
      spotManager.joinSpot("lobby");
      hasJoined.current = true;
    }
    
    // Listen for connection status updates
    const updateStatus = (status) => setConnectionStatus(status);
    localAvatarManager.on("statusChanged", updateStatus);
    
    return () => {
      localAvatarManager.off("statusChanged", updateStatus);
    };
  }, []);

  const [avatars, setAvatars] = useState(remoteAvatarManager.getAvatarsForCurrentRoom());
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
    <MessageArea>
      <MessageList />
    </MessageArea>
  );

  // Render the avatar area (right pane), split horizontally:
  // - Top: 80% for the cluster layout
  // - Bottom: 20% for the horizontal grid layout
  const renderAvatarArea = () => (
    <DividedLayout orientation="horizontal" initialPrimaryRatio={0.80}>
      {/* Top (80%) - Cluster */}
      <AvatarClusterContainer>
        <ScrollLayout>
          <AvatarClusterLayout avatarSize={80}>
            {avatars.map((avatar) => (
              <Avatar key={avatar.id} data={avatar} />
            ))}
          </AvatarClusterLayout>
        </ScrollLayout>
      </AvatarClusterContainer>

      {/* Bottom (20%) - Horizontal Grid */}
      <AvatarGridContainer>
        <ScrollLayout top={false} bottom={false}>
          <AvatarHorizontalGridLayout avatarSize={80} gap={10}>
            <Avatar
              data={{
                ...localAvatarManager.getAvatarData(),
                connectionStatus,
              }}
            />
          </AvatarHorizontalGridLayout>
        </ScrollLayout>
      </AvatarGridContainer>
    </DividedLayout>
  );

  // Desktop layout: side-by-side vertical DividedLayout:
  // - Left = Message Area
  // - Right = Avatar Area
  const renderDesktopContent = () => (
    <DividedLayout
      orientation="vertical"
      initialPrimaryRatio={0.25}
      segmentLabels={[
        <ChatTeardropText key="messages" size={24} weight="fill" />,
        <Users key="avatars" size={24} weight="fill" />,
      ]}
    >
      {renderMessageArea()}
      {renderAvatarArea()}
    </DividedLayout>
  );

  return (
    <SpotContainer>
      {/* Title Bar */}
      <TitleBar>
        <Hamburger onClick={toggleMenu} aria-label="Toggle menu">
          <List size={24} weight="regular" color="#fff" />
        </Hamburger>
        <TitleText>Lobby</TitleText>
      </TitleBar>

      {/* Main Content Area */}
      <MainContent>{renderDesktopContent()}</MainContent>

      {/* Input Bar */}
      <InputContainer>
        <TextInput
          id="commandLine"
          type="text"
          placeholder="Type a message..."
        />
      </InputContainer>

      {/* Side Menu */}
      <SideMenu open={menuOpen}>
        <h4>Side Menu</h4>
        <p>Menu content or navigation links can go here.</p>
      </SideMenu>
    </SpotContainer>
  );
};

export default Spot;
