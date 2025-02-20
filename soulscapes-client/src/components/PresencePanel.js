import React, { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import {
  VideoCamera,
  VideoCameraSlash,
  Microphone,
  MicrophoneSlash,
  UserCircleDashed
} from "@phosphor-icons/react";
import CommandLine from "./CommandLine";
import Avatar from "./Avatar";
import localAvatarManager from "../services/LocalAvatarManager";
import iro from "@jaames/iro";

const PanelContainer = styled.div`
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

const AvatarWrapper = styled.div`
  position: relative;
  width: 100px;
  height: 40px;
  flex-shrink: 0;
`;

const AvatarPositioner = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100px;
  height: 100px;
  z-index: 5;
`;

const ColorPickerPopup = styled.div`
  position: absolute;
  left: 50%;
  bottom: 50px; /* Adjust as desired */
  transform: translateX(-50%);
  z-index: 1100;
`;

const PresencePanel = () => {
  // Use local state so that updates trigger re-renders
  const [avatarData, setAvatarData] = useState(localAvatarManager.getAvatarData());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);
  const iroInstanceRef = useRef(null);

  const toggleMuteVideo = () => {
    const current = localAvatarManager.getAvatarData();
    localAvatarManager.setAvatarData({ videoEnabled: !current.videoEnabled });
    setAvatarData(localAvatarManager.getAvatarData());
  };

  const toggleMuteAudio = () => {
    const current = localAvatarManager.getAvatarData();
    localAvatarManager.setAvatarData({ audioEnabled: !current.audioEnabled });
    setAvatarData(localAvatarManager.getAvatarData());
  };

  const toggleColorPicker = () => {
    setShowColorPicker((prev) => !prev);
  };

  useEffect(() => {
    if (showColorPicker && colorPickerRef.current) {
      // Initialize Iro color picker with a single wheel
      iroInstanceRef.current = new iro.ColorPicker(colorPickerRef.current, {
        width: 200, // adjust size as needed
        color: avatarData.color || "#ffffff",
        layout: [
          {
            component: iro.ui.Wheel,
            options: {
              // Only the wheel is shown; white at the center represents 0 saturation
            }
          }
        ]
      });

      // Update the avatar color live on every change
      iroInstanceRef.current.on("color:change", (color) => {
        localAvatarManager.setAvatarData({ color: color.hexString });
        // Update local state to trigger a re-render immediately
        setAvatarData((prev) => ({ ...prev, color: color.hexString }));
      });
    }
    return () => {
      if (iroInstanceRef.current) {
        iroInstanceRef.current.off("color:change");
        iroInstanceRef.current = null;
      }
    };
  }, [showColorPicker]); // Only run this effect when showColorPicker changes

  return (
    <PanelContainer>
      <MuteControls>
        <button
          onClick={toggleMuteVideo}
          aria-label="Toggle video"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          {avatarData.videoEnabled ? (
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
          {avatarData.audioEnabled ? (
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
          <UserCircleDashed size={24} color="#fff" />
        </button>
      </MuteControls>
      <CommandLineWrapper>
        <CommandLine />
      </CommandLineWrapper>
      <AvatarWrapper>
        <AvatarPositioner>
          <Avatar data={avatarData} />
        </AvatarPositioner>
      </AvatarWrapper>
      {showColorPicker && (
        <ColorPickerPopup>
          <div ref={colorPickerRef} />
        </ColorPickerPopup>
      )}
    </PanelContainer>
  );
};

export default PresencePanel;
