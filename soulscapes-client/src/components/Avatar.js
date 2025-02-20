/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { VideoCameraSlash, MicrophoneSlash } from '@phosphor-icons/react';
import LocalAvatarManager from '../services/LocalAvatarManager';

// Helper function to convert hex color to rgba.
function hexToRGBA(hex, alpha = 1) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const breathe = keyframes`
  0% {
    box-shadow: 0 0 20px 5px var(--avatar-color);
  }
  33% {
    box-shadow: 0 0 30px 8px var(--avatar-color);
  }
  100% {
    box-shadow: 0 0 20px 5px var(--avatar-color);
  }
`;

const AvatarContainer = styled.div`
  position: relative;
  cursor: pointer;
`;

const AvatarCircle_new = styled.div`
  position: relative;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  background-color: ${props =>
    props.videoEnabled ? 'black' : hexToRGBA(props.color, 0.7)};
  overflow: hidden;
  box-shadow: 0 0 20px 5px ${props => props.color};
  transition: background-color 0.5s ease, box-shadow 0.5s ease;
  animation: ${breathe} 6s ease-in-out infinite;
`;
const AvatarCircle = styled.div`
  /* Set a CSS variable for the avatar color */
  --avatar-color: ${props => props.color};
  position: relative;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  /* When video is off, use a 90% opaque version of the color */
  background-color: ${props => 
    props.videoEnabled ? 'black' : hexToRGBA(props.color, 0.7)
  };
  overflow: hidden;
  box-shadow: 0 0 20px 5px var(--avatar-color);
  transition: background-color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease;
  animation: ${breathe} 6s ease-in-out infinite;
`;

// Use a transient prop $local so that it's not forwarded to the DOM.
const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  transform: ${props => (props.$local ? 'scaleX(-1)' : 'none')};
`;

const Badge = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Avatar = ({ data, onUpdate }) => {
  const {
    size = 80,
    videoEnabled,
    color,
    connectionStatus,
    local,
    videoStream,
    initials,
    audioEnabled
  } = data;

  const videoRef = useRef(null);
  const [videoStatus, setVideoStatus] = useState("Loading video...");
  const currentStream = useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    let cleanup = () => {};

    if (videoEnabled) {
      const attachVideo = async () => {
        let stream;
        if (local) {
          stream = await LocalAvatarManager.getLocalVideoStream();
        } else {
          stream = videoStream;
        }
        if (currentStream.current === stream) return;

        currentStream.current = stream;
        videoEl.srcObject = stream;
        setVideoStatus("Loading video...");

        const handleCanPlay = () => {
          videoEl
            .play()
            .then(() => setVideoStatus("Playing"))
            .catch((err) => {
              console.error("Error in video play() promise:", err);
              setVideoStatus("Error playing video");
            });
        };

        const handleLoadedMetadata = () => {
          // Optionally log metadata loaded.
        };

        const handleVideoError = (event) => {
          const error = event?.target?.error;
          console.error("Video element error:", error);
          setVideoStatus("Video error" + (error ? `: ${error.message}` : ""));
        };

        videoEl.addEventListener("canplay", handleCanPlay);
        videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
        videoEl.addEventListener("error", handleVideoError);

        cleanup = () => {
          videoEl.removeEventListener("canplay", handleCanPlay);
          videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
          videoEl.removeEventListener("error", handleVideoError);
        };
      };

      attachVideo();
    } else {
      videoEl.srcObject = null;
      setVideoStatus("Video Off");
      currentStream.current = null;
    }

    return cleanup;
  }, [videoStream, videoEnabled, local]);

  const badgeContent =
    connectionStatus === "Connected" ? (
      <>
        <span>{initials}</span>
        {videoEnabled === false && (
          <VideoCameraSlash size={12} color="#fff" />
        )}
        {audioEnabled === false && (
          <MicrophoneSlash size={12} color="#fff" />
        )}
      </>
    ) : (
      <>
        <span>{initials}</span>
        <span>{connectionStatus}</span>
      </>
    );

  return (
    <AvatarContainer>
      <AvatarCircle size={size} videoEnabled={videoEnabled} color={color}>
        <VideoElement
          ref={videoRef}
          muted={local}
          playsInline
          $local={local}
        />
      </AvatarCircle>
      <Badge>{badgeContent}</Badge>
    </AvatarContainer>
  );
};

export default Avatar;
