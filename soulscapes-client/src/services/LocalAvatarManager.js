// src/services/LocalAvatarManager.js
import { EventEmitter } from "events";
import { slog } from "../../../shared/slogger.js";
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
	    // Default: video is enabled and audio is off (you can adjust as needed)
	    videoEnabled: savedAvatar.videoEnabled !== undefined ? savedAvatar.videoEnabled : true,
	    audioEnabled: savedAvatar.audioEnabled !== undefined ? savedAvatar.audioEnabled : false,
	    connectionStatus: "Disconnected",
	    videoStream: null,
	    userId: savedAvatar.userId || this.getOrCreatePersistentUserId(),
	};
	this.saveToStorage();
	slog("Loaded local avatar with video logic", this.avatar);
	// Attempt to initialize the camera stream based on videoEnabled flag.
	this.updateMediaStream();
    }

    getRandomInitials() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return letters.charAt(Math.floor(Math.random() * 26)) +
            letters.charAt(Math.floor(Math.random() * 26));
    }

    getOrCreatePersistentUserId() {
	let uid = localStorage.getItem("userId");
	if (!uid) {
	    uid = crypto.randomUUID();
	    localStorage.setItem("userId", uid);
	}
	return uid;
    }

    async updateMediaStream() {
	// If video is disabled, stop any existing stream and update status.
	if (!this.avatar.videoEnabled) {
	    if (this.avatar.videoStream) {
		this.avatar.videoStream.getTracks().forEach(track => track.stop());
	    }
	    this.avatar.videoStream = null;
	    this.avatar.connectionStatus = "Video Off";
	    this.emit("videoStreamUpdated");
	    this.saveToStorage();
	    return;
	}

	// Request camera stream with constraints based on video/audio flags.
	try {
	    const constraints = {
		video: this.avatar.videoEnabled,
		audio: this.avatar.audioEnabled,
	    };
	    const stream = await hostEnv.getCameraStream(constraints);
	    this.avatar.videoStream = stream;
	    this.avatar.connectionStatus = "Connected";
	    this.emit("videoStreamUpdated");
	    this.saveToStorage();
	    slog("Camera stream acquired with constraints", constraints);
	} catch (error) {
	    console.error("Error obtaining camera stream", error);
	    this.avatar.connectionStatus = "Error";
	    this.emit("videoStreamUpdated");
	}
    }

    // Update avatar preferences (including toggling video/audio) and refresh stream.
    setAvatarData({ name, mood, color, image, videoEnabled, audioEnabled }) {
	if (name) this.avatar.name = name;
	if (mood) this.avatar.mood = mood;
	if (color) this.avatar.color = color;
	if (image) this.avatar.image = image;
	if (videoEnabled !== undefined) this.avatar.videoEnabled = videoEnabled;
	if (audioEnabled !== undefined) this.avatar.audioEnabled = audioEnabled;
	this.saveToStorage();
	// Emit a "preferencesUpdated" event so subscribers can update.
	this.emit("preferencesUpdated");
	// Refresh the media stream based on the new flags.
	this.updateMediaStream();
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

    toggleMuteVideo () {
	this.setAvatarData({ videoEnabled: !this.avatar.videoEnabled });
    }

    toggleMuteAudio (){
	this.setAvatarData({ audioEnabled: !this.avatar.audioEnabled });
    }
}

const localAvatarManager = new LocalAvatarManager();
export default localAvatarManager;
