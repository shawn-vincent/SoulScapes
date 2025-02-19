// src/pages/Spot.js
import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import {
    List,
    VideoCamera,
    VideoCameraSlash,
    Microphone,
    MicrophoneSlash,
    UserCircleDashed
} from "@phosphor-icons/react";
import { SketchPicker } from "react-color";
import { EventPane } from "../components/EventPane";
import Avatar from "../components/Avatar";
import AvatarClusterLayout from "../components/AvatarClusterLayout";
import CommandLine from "../components/CommandLine";

import spotManager from "../services/SpotManager";
import localAvatarManager from "../services/LocalAvatarManager";
import remoteAvatarManager from "../services/RemoteAvatarManager";
import { slog, serror } from "../../../shared/slogger.js";

// Overall container – background removed from here; it now lives in the scrollable content.
const SpotContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: black;
`;

// Fixed top bar (unchanged).
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

// NEW: MainContent is now our scrollable area between the fixed top and bottom bars.
const MainContent = styled.div`
  position: absolute;
  top: 30px;
  bottom: 40px; /* Leaves room for the fixed bottom bar */
  left: 0;
  right: 0;
  overflow-y: scroll;
  z-index: 1;
`;

// NEW: ScrollableContent is twice as tall and its background is split:
// top half is a gradient, bottom half is the original background image.
const ScrollableContent = styled.div`
  height: 200%;
  background: 
    linear-gradient(to bottom, black 0%, skyblue 50%, white 100%) no-repeat,
    url('https://upload.wikimedia.org/wikipedia/commons/4/43/Mountain_top_scenic.jpg') no-repeat;
  background-size: 100% 50%, 100% 50%;
  background-position: top, bottom;
  position: relative;
`;

// NEW: ContentWrapper holds the interactive content and is fixed to the bottom half.
const ContentWrapper = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 50%;
`;

// Remote avatar space fills the entire main content area.
const RemoteAvatarSpace = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

// Floating messages panel remains centered.
const MessagesPanel = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  width: 400px;
  height: 100%;
  transform: translateX(-50%);
  z-index: 4;
`;

// Fixed bottom bar.
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
`;

const CommandLineWrapper = styled.div`
  flex: 1;
  margin: 0 10px;
`;

const LocalAvatarWrapper = styled.div`
  position: relative;
  width: 100px;
  height: 40px; /* same as bottom bar height */
  flex-shrink: 0;
`;

const LocalAvatarPositioner = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100px;
  height: 100px; /* the avatar remains 100px tall */
  z-index: 5;
`;

const ColorPickerPopup = styled.div`
  position: absolute;
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%) translateY(${props => (props.show ? "0" : "100%")});
  opacity: ${props => (props.show ? 1 : 0)};
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
              opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 1100;
`;

const SideMenu = styled.div`
  position: absolute;
  top: 30px;
  left: 0;
  width: 250px;
  height: calc(100vh - 70px);
  background-color: rgba(0, 0, 0, 0.8);
  transform: translateX(${props => (props.open ? "0" : "-100%")});
  transition: transform 0.3s ease;
  z-index: 999;
  color: #fff;
  padding: 10px;
  box-sizing: border-box;
  overflow-y: auto;
`;

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

    // Declare mainContentRef so we can scroll it.
    const mainContentRef = useRef(null);

    // Listen for window resize if needed.
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // On mount, join the "lobby" (only once).
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
            slog("Beforeunload: sending /leave-spot");
            sendLeaveBeacon();
        };

        const handlePageHide = () => {
            slog("Pagehide: sending /leave-spot");
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
    const toggleColorPicker = () => setShowColorPicker(prev => !prev);

    // Toggle local video and audio.
    const toggleMuteVideo = () => {
        const current = localAvatarManager.getAvatarData();
        localAvatarManager.setAvatarData({ videoEnabled: !current.videoEnabled });
    };
    const toggleMuteAudio = () => {
        const current = localAvatarManager.getAvatarData();
        localAvatarManager.setAvatarData({ audioEnabled: !current.audioEnabled });
    };

    // NEW: After MainContent is rendered, force scroll to bottom.
    useEffect(() => {
      if (mainContentRef.current) {
        // Use a timeout to ensure all content has loaded.
        setTimeout(() => {
          mainContentRef.current.scrollTop = mainContentRef.current.scrollHeight;
        }, 0);
      }
    }, []);

    return (
        <SpotContainer>
            <TitleBar>
                <Hamburger onClick={toggleMenu} aria-label="Toggle menu">
                    <List size={24} weight="regular" color="#fff" />
                </Hamburger>
                <TitleText>Lobby</TitleText>
            </TitleBar>

            {/* NEW: Scrollable main content area */}
            <MainContent ref={mainContentRef}>
                <ScrollableContent>
                    <ContentWrapper>
                        <RemoteAvatarSpace>
                            <AvatarClusterLayout avatarSize={80}>
                                {avatars.map((avatar) => (
                                    <Avatar key={avatar.id} data={avatar} />
                                ))}
                            </AvatarClusterLayout>
                        </RemoteAvatarSpace>
                        <MessagesPanel>
                            <EventPane />
                        </MessagesPanel>
                    </ContentWrapper>
                </ScrollableContent>
            </MainContent>

            {/* Fixed bottom bar */}
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
                        onClick={toggleColorPicker}
                        aria-label="Choose color"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                        <span style={{ color: "#fff", fontSize: "24px" }}>
                            <UserCircleDashed size={24} color="#fff" />
                        </span>
                    </button>
                </MuteControls>
                <CommandLineWrapper>
                    <CommandLine />
                </CommandLineWrapper>
                <LocalAvatarWrapper>
                    <LocalAvatarPositioner>
                        <Avatar data={{ ...localAvatarManager.getAvatarData(), connectionStatus }} />
                    </LocalAvatarPositioner>
                </LocalAvatarWrapper>
            </BottomBar>

            {/* Color picker popup */}
            <ColorPickerPopup show={showColorPicker}>
                <SketchPicker
                    color={localAvatarManager.getAvatarData().color}
                    onChangeComplete={(colorResult) => {
                        localAvatarManager.setAvatarData({ color: colorResult.hex });
                        setShowColorPicker(false);
                    }}
                />
            </ColorPickerPopup>
            {/* Optional side menu */}
            <SideMenu open={menuOpen}>
                <h4>Side Menu</h4>
                <p>Menu content or navigation links can go here.</p>
            </SideMenu>
        </SpotContainer>
    );
};

export default Spot;
