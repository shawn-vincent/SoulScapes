// src/components/Avatar.js
import React, { useEffect, useRef, useState } from 'react';
import { CameraSlash } from '@phosphor-icons/react';

const Avatar = ({ data, onUpdate }) => {
    const videoRef = useRef(null);
    const [videoStatus, setVideoStatus] = useState("Loading video...");
    const currentStream = useRef(null);

    // Attach or detach the video stream when data changes.
    useEffect(() => {
	const videoEl = videoRef.current;
	if (!videoEl) return;

	if (data.videoEnabled && data.videoStream) {
	    if (currentStream.current === data.videoStream) return;

	    currentStream.current = data.videoStream;
	    videoEl.srcObject = data.videoStream;
	    setVideoStatus("Loading video...");

	    const handleCanPlay = () => {
		videoEl.play()
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

	    return () => {
		videoEl.removeEventListener("canplay", handleCanPlay);
		videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
		videoEl.removeEventListener("error", handleVideoError);
	    };
	} else {
	    videoEl.srcObject = null;
	    setVideoStatus(data.videoEnabled ? "Loading video..." : "Video Off");
	}
    }, [data.videoStream, data.videoEnabled]);

    // Determine overlay content based on status.
    let overlayContent = null;
    if (!data.videoEnabled) {
	// When video is turned off, show initials and connection status.
	overlayContent = (
	    <div style={{
		     display: "flex",
		     flexDirection: "column",
		     alignItems: "center",
		     justifyContent: "center",
		     backgroundColor: "rgba(0,0,0,0.7)",
		     borderRadius: "50%",
		     width: "100%",
		     height: "100%",
		     color: "#fff"
		 }}>
		<span style={{ fontSize: "1.2em" }}>{data.initials}</span>
		<div style={{ marginTop: 5, fontSize: "0.8em" }}>{data.connectionStatus}</div>
	    </div>
	);
    } else if (videoStatus !== "Playing") {
	// If not playing (including when an error occurs), display the status.
	overlayContent = (
	    <div style={{
		     display: "flex",
		     alignItems: "center",
		     justifyContent: "center",
		     backgroundColor: "rgba(0,0,0,0.7)",
		     borderRadius: "50%",
		     width: "100%",
		     height: "100%",
		     color: "#fff"
		 }}>
		<span style={{ fontSize: "0.9em" }}>{videoStatus}</span>
	    </div>
	);
    }

    // Outer container style.
    const avatarStyle = {
	position: "relative",
	width: `${data.size}px`,
	height: `${data.size}px`,
	borderRadius: "50%",
	backgroundColor: "black",
	border: `3px solid ${data.color}`,
	overflow: "hidden"
    };

    const videoStyle = {
	width: "100%",
	height: "100%",
	objectFit: "cover",
	borderRadius: "50%",
        transform: data.local ? "scaleX(-1)" : "none"  // mirror local video feed

    };

    return (
	<div style={{ position: "relative", cursor: "pointer" }}>
	    <div style={avatarStyle}>
		<video ref={videoRef} muted playsInline style={videoStyle} />
		{overlayContent}
	    </div>
	    {/* Badge with initials and connection status */}
	    <div style={{
		     position: "absolute",
		     top: "-10px",
		     left: "50%",
		     transform: "translateX(-50%)",
		     backgroundColor: "rgba(0, 0, 0, 0.7)",
		     color: "#fff",
		     padding: "3px 8px",
		     borderRadius: "5px",
		     fontSize: "12px",
		 }}>
		{data.initials} {data.connectionStatus}
	    </div>
	</div>
    );
};

export default Avatar;
