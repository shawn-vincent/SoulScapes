// src/pages/Spot.js
import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import {
  List,
  ChatTeardropText,
  Users,
  UserCircleDashed,
  VideoCamera,
  VideoCameraSlash,
  Microphone,
  MicrophoneSlash
} from "@phosphor-icons/react";
import { SketchPicker } from "react-color";
import DividedLayout from "../components/DividedLayout";
import { EventPane } from "../components/EventPane";
import Avatar from "../components/Avatar";
import AvatarClusterLayout from "../components/AvatarClusterLayout";
import AvatarHorizontalGridLayout from "../components/AvatarHorizontalGridLayout";
import CommandLine from "../components/CommandLine";

import spotManager from "../services/SpotManager";
import localAvatarManager from "../services/LocalAvatarManager";
import remoteAvatarManager from "../services/RemoteAvatarManager";
import { slog, serror } from "../../../shared/slogger.js";

// ----------------------------
// Styled Components
// ----------------------------
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
  bottom: 40px; /* Reserve space for bottom bar */
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
  height: calc(100vh - 70px); /* 30px for title bar + 40px for bottom bar */
  background-color: rgba(0, 0, 0, 0.8);
  transform: translateX(${props => (props.open ? "0" : "-100%")});
  transition: transform 0.3s ease;
  z-index: 999;
  color: #fff;
  padding: 10px;
  box-sizing: border-box;
  overflow-y: auto;
`;

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
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
`;

const MuteControls = styled.div`
  display: flex;
  gap: 10px;
  margin-right: 10px;
`;

// The color picker popup. It is fixed so that its bottom edge aligns with the top of the bottom bar.
// When hidden, it is translated down (i.e. off-screen behind the bottom bar).
const ColorPickerPopup = styled.div`
  position: absolute;
  left: 50%;
  bottom: 40px; /* Align bottom of popup with top of bottom bar */
  transform: translateX(-50%) translateY(${props => (props.show ? "0" : "100%")});
  opacity: ${props => (props.show ? 1 : 0)};
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
              opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 1100;
`;

const CommandLineWrapper = styled.div`
  flex: 1;
`;

// ----------------------------
// Spot Component
// ----------------------------
const Spot = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    localAvatarManager.getAvatarData().connectionStatus
  );
  const [avatars, setAvatars] = useState(
    remoteAvatarManager.getAvatarsForCurrentRoom()
  );
  const [localAvatar, setLocalAvatar] = useState(
    localAvatarManager.getAvatarData()
  );
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // We'll position the color picker at bottom center.
  // (It will animate in from below the bottom bar.)
  
  // Ref for the presence icon button (optional if you want to later use its position)
  const colorButtonRef = useRef(null);

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

  // Send a beacon on unload.
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
      console.error("Beforeunload: sending /leave-spot");
      sendLeaveBeacon();
    };

    const handlePageHide = () => {
      console.error("Pagehide: sending /leave-spot");
      sendLeaveBeacon();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  const toggleMenu = () => setMenuOpen(prev => !prev);

  // Toggle the color picker popup.
  const toggleColorPicker = () => {
    setShowColorPicker(prev => !prev);
  };

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

  const renderMessageArea = () => <EventPane />;

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

  return (
    <SpotContainer>
      <TitleBar>
        <Hamburger onClick={toggleMenu} aria-label="Toggle menu">
          <List size={24} weight="regular" color="#fff" />
        </Hamburger>
        <TitleText>Lobby</TitleText>
      </TitleBar>
      <MainContent>{renderDesktopContent()}</MainContent>
      <BottomBar>
        <MuteControls>
          <button
            onClick={toggleMuteVideo}
            aria-label="Toggle video"
            style={{ background: "none", border: "none", cursor: "pointer" }}
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
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {localAvatarManager.getAvatarData().audioEnabled ? (
              <Microphone size={24} color="#fff" />
            ) : (
              <MicrophoneSlash size={24} color="#fff" />
            )}
          </button>
          <button
            ref={colorButtonRef}
            onClick={toggleColorPicker}
            aria-label="Choose color"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <UserCircleDashed size={24} color="#fff" />
          </button>
        </MuteControls>
        <CommandLineWrapper>
          <CommandLine />
        </CommandLineWrapper>
      </BottomBar>
      {/** Color picker popup that animates up from behind the bottom bar */}
      <ColorPickerPopup show={showColorPicker}>
        <SketchPicker
          color={localAvatar.color}
          onChangeComplete={(colorResult) => {
            localAvatarManager.setAvatarData({ color: colorResult.hex });
            setShowColorPicker(false);
          }}
        />
      </ColorPickerPopup>
      <SideMenu open={menuOpen}>
        <h4>Side Menu</h4>
        <p>Menu content or navigation links can go here.</p>
      </SideMenu>
    </SpotContainer>
  );
};

export default Spot;
