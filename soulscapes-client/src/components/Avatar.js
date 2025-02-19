// src/components/Avatar.js
import React, { useEffect, useRef, useState } from 'react';
import { VideoCameraSlash, MicrophoneSlash } from '@phosphor-icons/react';
import LocalAvatarManager from '../services/LocalAvatarManager';

const Avatar = ({ data, onUpdate }) => {
  const videoRef = useRef(null);
  const [videoStatus, setVideoStatus] = useState("Loading video...");
  const currentStream = useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    let cleanup = () => {};

    if (data.videoEnabled) {
      const attachVideo = async () => {
        let stream;
        if (data.local) {
          // For local avatars, fetch the local video stream.
          stream = await LocalAvatarManager.getLocalVideoStream();
        } else {
          // For remote avatars, use the provided remote video stream.
          stream = data.videoStream;
        }

        // If the stream is already attached, do nothing.
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
      currentStream.current = null; // Clear stored stream reference when video is disabled.
    }

    return cleanup;
  }, [data.videoStream, data.videoEnabled]);

  // Badge styles for the top overlay.
  const badgeStyle = {
    position: "absolute",
    top: "-10px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    padding: "3px 8px",
    borderRadius: "5px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const badgeContent =
    data.connectionStatus === "Connected" ? (
      <>
        <span>{data.initials}</span>
        {data.videoEnabled === false && (
          <VideoCameraSlash size={12} color="#fff" />
        )}
        {data.audioEnabled === false && (
          <MicrophoneSlash size={12} color="#fff" />
        )}
      </>
    ) : (
      <>
        <span>{data.initials}</span>
        <span>{data.connectionStatus}</span>
      </>
    );

  // The avatar container uses the local color for its border and glow.
  // When video is off, the background is set to data.color.
  const avatarStyle = {
    position: "relative",
    width: `${data.size}px`,
    height: `${data.size}px`,
    borderRadius: "50%",
    backgroundColor: data.videoEnabled ? "black" : data.color,
    border: `3px solid ${data.color}`,
    overflow: "hidden",
    boxShadow: `0 0 20px 5px ${data.color}`,
    transition: "background-color 0.3s ease, box-shadow 0.3s ease",
  };

  const videoStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
    transform: data.local ? "scaleX(-1)" : "none", // mirror local video feed
  };

  return (
    <div style={{ position: "relative", cursor: "pointer" }}>
      <div style={avatarStyle}>
        <video ref={videoRef} muted={data.local} playsInline style={videoStyle} />
      </div>
      <div style={badgeStyle}>{badgeContent}</div>
    </div>
  );
};

export default Avatar;
