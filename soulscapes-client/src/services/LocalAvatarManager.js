// localAvatarManager.js
import { EventEmitter } from "events";
import { slog, serror } from "../../../shared/slogger.js";
import hostEnv from "../services/HostEnvironmentManager";

class LocalAvatarManager extends EventEmitter {
    constructor() {
	super();
	const savedAvatar = JSON.parse(localStorage.getItem("localAvatar")) || {};
	this.avatar = {
	    id: null,
	    local: true,
	    name: savedAvatar.name || "Anonymous",
	    mood: savedAvatar.mood || "neutral",
	    color: savedAvatar.color || "#00f",
	    image: savedAvatar.image || null,
	    size: 80,
	    initials: savedAvatar.initials || this.getRandomInitials(),
	    videoEnabled: savedAvatar.videoEnabled !== undefined ? savedAvatar.videoEnabled : true,
	    audioEnabled: savedAvatar.audioEnabled !== undefined ? savedAvatar.audioEnabled : false,
	    connectionStatus: "Disconnected",
	    videoStream: null, // We'll create once when we need it.
	    userId: savedAvatar.userId || this.getOrCreatePersistentUserId(),
	};

	this.saveToStorage();
	slog("Loaded local avatar with video logic", this.avatar);

    }

    getRandomInitials() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return (
	    letters.charAt(Math.floor(Math.random() * 26)) +
		letters.charAt(Math.floor(Math.random() * 26))
	);
    }

    getOrCreatePersistentUserId() {
	let uid = localStorage.getItem("userId");
	if (!uid) {
	    uid = crypto.randomUUID();
	    localStorage.setItem("userId", uid);
	}
	return uid;
    }

    async getLocalVideoStream() {
	// Instead of calling updateMediaStream() immediately, let's do it once we actually join a room or something similar.
	// But if you want to do it here, you can:
	await this.initializeStreamOnce();

	return this.avatar.videoStream;
    }

    async initializeStreamOnce() {
	// If we already have a videoStream, do nothing
	if (this.avatar.videoStream) return;

	try {
	    // Request camera stream with max constraints. We'll “mute” via track.enabled, not by stopping tracks.
	    const constraints = {
		video: true,
		audio: true,
	    };
	    const stream = await hostEnv.getCameraStream(constraints);

	    if (!stream) {
		serror("Host environment returned null stream!?");
		throw new Error("Host env returned null stream!?");
	    }
	    
	    this.avatar.videoStream = stream;
	    this.avatar.connectionStatus = "Connected";
	    slog("Camera stream acquired once", constraints);

	    // Now apply our initial “enabled” flags
	    this.applyTrackEnablement();
	    this.emit("videoStreamUpdated");
	    this.saveToStorage();
	} catch (error) {
	    console.error("Error obtaining camera stream", error);
	    this.avatar.connectionStatus = "Error";
	    this.emit("videoStreamUpdated");
	}
    }

    // Toggle the actual track.enabled fields based on our stored flags.
    applyTrackEnablement() {
	// con't bother if we're not live.
	if (!this.avatar.videoStream) return;
	// For each video track
	const vtracks = this.avatar.videoStream.getVideoTracks();
	vtracks.forEach((t) => {
	    t.enabled = this.avatar.videoEnabled; 
	});
	// For each audio track
	const atracks = this.avatar.videoStream.getAudioTracks();
	atracks.forEach((t) => {
	    t.enabled = this.avatar.audioEnabled;
	});
    }

    // If user changes name/mood/color or toggles video/audio
    setAvatarData({ name, mood, color, image, videoEnabled, audioEnabled }) {
	if (name) this.avatar.name = name;
	if (mood) this.avatar.mood = mood;
	if (color) this.avatar.color = color;
	if (image) this.avatar.image = image;

	if (videoEnabled !== undefined) {
	    this.avatar.videoEnabled = videoEnabled;
	}
	if (audioEnabled !== undefined) {
	    this.avatar.audioEnabled = audioEnabled;
	}

	// Update the stream if necessary.
	this.initializeStreamOnce().then(() => {
	    this.applyTrackEnablement();
	    this.emit("videoStreamUpdated");
	    this.saveToStorage();

	        // Create an update payload that excludes non-serializable fields
	    const {
		videoStream,  // exclude
		connectionStatus, // optionally exclude if you don't want it updated remotely
		...avatarDataToPropagate
	    } = this.avatar;
	    
	    // Emit an update event to the server if a socket exists.
	    if (window.spotManager && window.spotManager.socket) {
		window.spotManager.socket.emit("avatar-update",
					       avatarDataToPropagate);
	    }
	});
    }
    
    setConnectionStatus(status) {
	this.avatar.connectionStatus = status;
	this.emit("statusChanged", status);
	slog("Connection Status:", status);
    }

    saveToStorage() {
	localStorage.setItem("localAvatar", JSON.stringify(this.avatar));
    }

    getAvatarData() {
	return this.avatar;
    }

    // Optionally, simpler toggles:
    toggleMuteVideo() {
	this.setAvatarData({ videoEnabled: !this.avatar.videoEnabled });
    }

    toggleMuteAudio() {
	this.setAvatarData({ audioEnabled: !this.avatar.audioEnabled });
    }
}

const localAvatarManager = new LocalAvatarManager();
export default localAvatarManager;
