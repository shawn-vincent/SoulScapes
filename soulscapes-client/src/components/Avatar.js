// src/components/Avatar.js
import { cslog, cerror, cswarn } from '../../../shared/slogger';
import React, { useContext, useEffect, useRef, useState } from 'react';
import AvatarConfigWindow from './AvatarConfigWindow';
import { CameraSlash } from '@phosphor-icons/react';
import { HostEnvironmentContext } from "../context/HostEnvironmentContext";

const Avatar = ({ data, onUpdate }) => {
  const { cameraStream, cameraError, requestCameraStream } = useContext(HostEnvironmentContext);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoStatus, setVideoStatus] = useState("Loading video...");
  const videoRef = useRef(null);

  // Log the current context value
  useEffect(() => {
    cslog("avatar", "Camera stream from context is:", cameraStream);
  }, [cameraStream]);

  // Request the camera stream if not available.
  useEffect(() => {
    if (!cameraStream && !cameraError) {
      cslog("avatar", "📹 Requesting camera stream on demand.");
      requestCameraStream({ video: true, audio: false }).catch((err) => {
        cerror("avatar", "❌ Error requesting camera stream", err);
      });
    }
  }, [cameraStream, cameraError, requestCameraStream]);

  // Attach the stream to the video element when available.
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      cslog("avatar", "🔗 Attaching camera stream to video element.");
      videoRef.current.srcObject = cameraStream;
      videoRef.current
        .play()
        .then(() => cslog("avatar", "▶️ Video play() promise resolved."))
        .catch((err) => {
          cerror("avatar", "❌ Error in video play() promise", err);
          setVideoStatus("Error playing video");
          setIsVideoLoading(false);
        });
      // Fallback: if after 1 second neither onLoadedMetadata nor onCanPlay fires, log a warning.
      const fallbackTimer = setTimeout(() => {
        if (isVideoLoading) {
          cswarn("avatar", "⚠️ Video element did not fire onLoadedMetadata/onCanPlay within 1 second.");
        }
      }, 1000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [cameraStream, isVideoLoading]);

  // Video event handlers.
  const handleLoadedMetadata = () => {
    cslog("avatar", "✅ onLoadedMetadata fired – video is ready.");
    setVideoStatus("Playing");
    setIsVideoLoading(false);
  };

  const handleCanPlay = () => {
    cslog("avatar", "✅ onCanPlay fired – video can start playing.");
    setVideoStatus("Playing");
    setIsVideoLoading(false);
  };

  const handleVideoError = (event) => {
    const error = event.target.error;
    cerror("avatar", "❌ Video element error", error);
    setVideoStatus("Video error");
    setIsVideoLoading(false);
  };

  const renderContent = () => {
    if (cameraStream && videoStatus === "Playing") {
      return (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onError={handleVideoError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      );
    } else if (cameraError) {
      cswarn("avatar", "⚠️ Camera error detected:", cameraError);
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#333",
            borderRadius: "50%",
            padding: "5px",
            textAlign: "center",
          }}
          aria-label={`Camera error: ${cameraError}`}
        >
          <CameraSlash size={24} weight="duotone" color="#aaa" />
          <div style={{ fontSize: "12px", marginTop: "5px" }}>
            {cameraError}
          </div>
        </div>
      );
    } else if (isVideoLoading) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#333",
            borderRadius: "50%",
            color: "#aaa",
            fontSize: "0.9em",
            textAlign: "center"
          }}
          aria-label="Loading video..."
        >
          {videoStatus}
        </div>
      );
    } else {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#333",
            borderRadius: "50%",
          }}
          aria-label="Video unavailable, displaying default avatar"
        >
          <div style={{ fontSize: "1.5em", color: "#aaa" }}>
            {data.initials}
          </div>
        </div>
      );
    }
  };

  const avatarStyle = {
    width: `${data.size}px`,
    height: `${data.size}px`,
    borderRadius: "50%",
    backgroundColor: "black",
    border: `3px solid ${data.color}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden"
  };

  return (
    <>
      <div onClick={() => { /* Optionally open config */ }} style={{ position: "relative", cursor: "pointer" }}>
        <div style={avatarStyle}>
          {renderContent()}
        </div>
        <div
          style={{
            position: "absolute",
            top: "-10px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            padding: "3px 8px",
            borderRadius: "5px",
            fontSize: "12px",
          }}
        >
          {data.connectionStatus}
        </div>
      </div>
      {/* Modal configuration window could be rendered here if needed */}
    </>
  );
};

export default Avatar;
