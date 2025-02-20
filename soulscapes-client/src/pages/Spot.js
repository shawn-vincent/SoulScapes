// src/pages/Spot.js
import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import {
  List,
  CaretDown
} from "@phosphor-icons/react";
import { EventPane } from "../components/EventPane";
import Avatar from "../components/Avatar";
import AvatarClusterLayout from "../components/AvatarClusterLayout";
import CommandLine from "../components/CommandLine";

import spotManager from "../services/SpotManager";
import localAvatarManager from "../services/LocalAvatarManager";
import remoteAvatarManager from "../services/RemoteAvatarManager";
import { slog, serror } from "../../../shared/slogger.js";
import PresencePanel from "../components/PresencePanel"; // Extracted bottom controls

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
  bottom: 40px; /* Leaves room for the PresencePanel */
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
  It is positioned at the bottom and uses column-reverse so that its content starts at the bottom.
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
  Optional scroll-down affordance.
*/
const ScrollDownButton = styled.button`
  position: absolute;
  bottom: 50px; /* 10px above PresencePanel */
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
  const [avatars, setAvatars] = useState(
    remoteAvatarManager.getAvatarsForCurrentRoom()
  );

  // Ref for MainContent.
  const mainContentRef = useRef(null);
  // Ref for the MessageWrapper.
  const messageWrapperRef = useRef(null);

  // Join the "lobby" once.
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
  }, []);

  useEffect(() => {
    const updateAvatars = () => {
      setAvatars([...remoteAvatarManager.getAvatarsForCurrentRoom()]);
    };
    remoteAvatarManager.on("updated", updateAvatars);
    return () => {
      remoteAvatarManager.off("updated", updateAvatars);
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

  // Scroll-down affordance.
  const [showScrollDown, setShowScrollDown] = useState(false);
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
      handleScroll();
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
        <Hamburger onClick={() => setMenuOpen(prev => !prev)} aria-label="Toggle menu">
          <List size={24} weight="regular" color="#fff" />
        </Hamburger>
        <TitleText>Lobby</TitleText>
      </TitleBar>

      {/* MainContent with fixed background */}
      <MainContent
        ref={mainContentRef}
        style={{
          background: `url('https://upload.wikimedia.org/wikipedia/commons/4/43/Mountain_top_scenic.jpg') no-repeat center`,
          backgroundSize: "cover"
        }}
      >
        <RemoteAvatarSpace>
          <AvatarClusterLayout avatarSize={80}>
            {avatars.map((avatar) => (
              <Avatar key={avatar.id} data={avatar} />
            ))}
          </AvatarClusterLayout>
        </RemoteAvatarSpace>

        {/* MessageWrapper scrolls internally. */}
        <MessageWrapper ref={messageWrapperRef}>
          <EventPane />
        </MessageWrapper>
      </MainContent>

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

      {/* Render the PresencePanel component */}
      <PresencePanel />

      {/* Optional side menu can be added here if needed */}
    </SpotContainer>
  );
};

export default Spot;
