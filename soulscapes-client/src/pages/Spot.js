// src/pages/Spot.js
import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import {
  List,
  VideoCamera,
  VideoCameraSlash,
  Microphone,
  MicrophoneSlash,
  UserCircleDashed,
  CaretDown
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

/*  
  The SpotContainer remains the full-screen container.
*/
const SpotContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: black;
`;

/*  
  TitleBar remains fixed at the top.
*/
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

/*  
  MainContent now has a fixed background image that fills the area between the top and bottom bars.
  The background does not scroll.
*/
const MainContent = styled.div`
  position: absolute;
  top: 30px;
  bottom: 40px; /* Leaves room for fixed BottomBar */
  left: 0;
  right: 0;
  overflow: hidden;
  background: url('https://upload.wikimedia.org/wikipedia/commons/4/43/Mountain_top_scenic.jpg')
    no-repeat center;
  background-size: cover;
  z-index: 1;
`;

/*  
  MessageWrapper is a scrollable container that sits over MainContent.
  It is positioned at the bottom and uses column-reverse flex so that its content starts at the bottom.
*/
const MessageWrapper = styled.div`
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 400px;
  max-height: 100%;
  transform: translateX(-50%);
  overflow-y: auto;
  display: flex;
  flex-direction: column-reverse;
  z-index: 4;
`;

/*  
  RemoteAvatarSpace remains absolutely positioned over MainContent.
  (Adjust its positioning as needed.)
*/
const RemoteAvatarSpace = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
`;

/*  
  Fixed bottom bar remains unchanged.
*/
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

/*  
  Optionally, you can keep the scroll-down affordance if desired.
*/
const ScrollDownButton = styled.button`
  position: absolute;
  bottom: 50px; /* 10px above BottomBar */
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  padding: 5px;
  cursor: pointer;
  z-index: 1100;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
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
  // State to show/hide the scroll-down affordance.
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Declare ref for MainContent.
  const mainContentRef = useRef(null);
  // We'll also need a ref for the MessageWrapper to measure its content height.
  const messageWrapperRef = useRef(null);

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

  // Beacon on unload.
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

  // Function to scroll the MessageWrapper to the bottom.
  const scrollMessagesToBottom = () => {
    if (messageWrapperRef.current) {
      messageWrapperRef.current.scrollTo({
        top: messageWrapperRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Listen for scroll events on MainContent to show/hide the scroll-down affordance.
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        const { scrollTop, clientHeight, scrollHeight } = mainContentRef.current;
        if (scrollTop + clientHeight < scrollHeight - 10) {
          setShowScrollDown(true);
        } else {
          setShowScrollDown(false);
        }
      }
    };

    const mc = mainContentRef.current;
    if (mc) {
      mc.addEventListener("scroll", handleScroll);
      handleScroll(); // initial check
    }
    return () => {
      if (mc) {
        mc.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // Ensure MainContent starts scrolled to the bottom on mount.
  useEffect(() => {
    if (mainContentRef.current) {
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

      {/* MainContent with fixed background */}
      <MainContent ref={mainContentRef} 
        style={{
          background: `url('https://upload.wikimedia.org/wikipedia/commons/4/43/Mountain_top_scenic.jpg') no-repeat center`,
          backgroundSize: "cover"
        }}
      >
        {/* Remote avatars (if needed) */}
        <RemoteAvatarSpace>
          <AvatarClusterLayout avatarSize={80}>
            {avatars.map((avatar) => (
              <Avatar key={avatar.id} data={avatar} />
            ))}
          </AvatarClusterLayout>
        </RemoteAvatarSpace>

        {/* MessageWrapper: scrollable container for messages; flex column-reverse so that messages start at the bottom */}
        <MessageWrapper ref={messageWrapperRef}>
          <EventPane />
        </MessageWrapper>
      </MainContent>

      {/* Optional scroll-down affordance */}
      {showScrollDown && (
        <ScrollDownButton onClick={() => {
          if (mainContentRef.current) {
            mainContentRef.current.scrollTo({
              top: mainContentRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        }}>
          <CaretDown size={24} weight="bold" />
        </ScrollDownButton>
      )}

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

