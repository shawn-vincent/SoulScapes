import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { List, ChatTeardropText, Users } from "@phosphor-icons/react";
import { VideoCamera, VideoCameraSlash, Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import DividedLayout from "../components/DividedLayout";
import { EventPane } from "../components/EventPane";
import Avatar from "../components/Avatar";
import ScrollLayout from "../components/ScrollLayout";
import AvatarClusterLayout from "../components/AvatarClusterLayout";
import AvatarHorizontalGridLayout from "../components/AvatarHorizontalGridLayout";
import CommandLine from "../components/CommandLine";

import spotManager from "../services/SpotManager";
import localAvatarManager from "../services/LocalAvatarManager";
import remoteAvatarManager from "../services/RemoteAvatarManager";
import { slog, serror } from "../../../shared/slogger.js";

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
  bottom: 40px; /* command line height will now be part of BottomBar */
  left: 0;
  right: 0;
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

const SideMenu = styled.div`
  position: absolute;
  top: 30px;
  left: 0;
  width: 250px;
  height: calc(100vh - 70px); /* 30px for title bar, 40px for bottom bar */
  background-color: rgba(0, 0, 0, 0.8);
  transform: translateX(${(props) => (props.open ? "0" : "-100%")});
  transition: transform 0.3s ease;
  z-index: 999;
  color: #fff;
  padding: 10px;
  box-sizing: border-box;
  overflow-y: auto;
`;

// NEW: Bottom bar container that holds the mute controls and command line.
const BottomBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.5); /* Optional background for contrast */
  z-index: 1000;
`;

// NEW: Container for the mute buttons.
const MuteControls = styled.div`
  display: flex;
  gap: 10px;
  margin-right: 10px; /* Space between the icons and the command line */
`;

const Spot = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [connectionStatus, setConnectionStatus] = useState(
    localAvatarManager.getAvatarData().connectionStatus
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasJoined = useRef(false);
  useEffect(() => {
    slog("Spot.js: useEffect mounted");

    if (!hasJoined.current) {
      slog("Spot.js: joinSpot('lobby')");
      spotManager.joinSpot("lobby")
        .then(() => {
          slog("Spot.js: joinSpot resolved");
        })
        .catch((err) => {
          serror("Spot.js: Error during joinSpot", err);
        });
      hasJoined.current = true;
    }
    const updateStatus = (status) => setConnectionStatus(status);
    localAvatarManager.on("statusChanged", updateStatus);
    return () => {
      localAvatarManager.off("statusChanged", updateStatus);
    };
  }, []);

  const [avatars, setAvatars] = useState(
    remoteAvatarManager.getAvatarsForCurrentRoom()
  );
  const [localAvatar, setLocalAvatar] = useState(
    localAvatarManager.getAvatarData()
  );

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

  // Use navigator.sendBeacon to notify the server when the page unloads.
  useEffect(() => {
    const sendLeaveBeacon = () => {
      const payload = JSON.stringify({
        spot: spotManager.spot,
        id: spotManager.socket.id,
      });
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/leave-spot", blob);
    };

    const handleBeforeUnload = () => {
      console.error("---------- Refresh: sending /leave-spot via beforeunload");
      sendLeaveBeacon();
    };

    const handlePageHide = () => {
      console.error("---------- Refresh: sending /leave-spot via pagehide");
      sendLeaveBeacon();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Render the message area using EventPane.
  const renderMessageArea = () => <EventPane />;

  // Render the avatar area.
  const renderAvatarArea = () => (
    <DividedLayout orientation="horizontal" initialPrimaryRatio={0.80}>
      <AvatarClusterContainer>
        <AvatarClusterLayout avatarSize={80}>
          {avatars.map((avatar) => (
            <Avatar key={avatar.id} data={avatar} />
          ))}
        </AvatarClusterLayout>
      </AvatarClusterContainer>
      <AvatarGridContainer>
        <AvatarHorizontalGridLayout avatarSize={80} gap={10}>
          <Avatar
            data={{
              ...localAvatarManager.getAvatarData(),
              connectionStatus,
            }}
          />
        </AvatarHorizontalGridLayout>
      </AvatarGridContainer>
    </DividedLayout>
  );

  // Desktop layout: side-by-side vertical DividedLayout.
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

  const toggleMuteVideo = () => {
    const current = localAvatarManager.getAvatarData();
    localAvatarManager.setAvatarData({ videoEnabled: !current.videoEnabled });
  };

  const toggleMuteAudio = () => {
    const current = localAvatarManager.getAvatarData();
    localAvatarManager.setAvatarData({ audioEnabled: !current.audioEnabled });
  };

    // NEW: Wrap the CommandLine in its own flex container.
    const CommandLineWrapper = styled.div`
  flex: 1; /* take up remaining space */
`;

  return (
    <SpotContainer>
      <TitleBar>
        <Hamburger onClick={toggleMenu} aria-label="Toggle menu">
          <List size={24} weight="regular" color="#fff" />
        </Hamburger>
        <TitleText>Lobby</TitleText>
      </TitleBar>
      <MainContent>{renderDesktopContent()}</MainContent>
      {/* New BottomBar containing mute controls and CommandLine */}
      <BottomBar>
        <MuteControls>
          <button
            onClick={toggleMuteVideo}
            aria-label="Toggle video"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {localAvatarManager.getAvatarData().videoEnabled ? (
              <VideoCamera size={24} color="#fff" />
            ) : (
              <VideoCameraSlash size={24} color="#fff" />
            )}
          </button>
          <button
            onClick={toggleMuteAudio}
            aria-label="Toggle audio"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {localAvatarManager.getAvatarData().audioEnabled ? (
              <Microphone size={24} color="#fff" />
            ) : (
              <MicrophoneSlash size={24} color="#fff" />
            )}
          </button>
          </MuteControls>
	  <CommandLineWrapper>
              <CommandLine />
	  </CommandLineWrapper>
      </BottomBar>
      <SideMenu open={menuOpen}>
        <h4>Side Menu</h4>
        <p>Menu content or navigation links can go here.</p>
      </SideMenu>
    </SpotContainer>
  );
};

export default Spot;
