import { EventEmitter } from "events";
import { slog, serror, sdebug, swarn } from '../../../shared/slogging.js';

class LocalAvatarManager extends EventEmitter {
    constructor() {
	super();

	const savedAvatar = JSON.parse(localStorage.getItem("localAvatar")) || {};

	this.avatar = {
	    id: null,
	    name: savedAvatar.name || "Anonymous",
	    mood: savedAvatar.mood || "neutral",
	    color: savedAvatar.color || "#00f",
	    image: savedAvatar.image || null,
	    size: 80,
	    // Use saved initials if they exist, otherwise generate new ones.
	    initials: savedAvatar.initials || this.getRandomInitials(),
	    videoEnabled: savedAvatar.videoEnabled || false,
	    audioEnabled: savedAvatar.audioEnabled || false,
	    connectionStatus: "Disconnected",
	    videoStream: null,
	};

	this.saveToStorage();
	

	slog(`🎭 Loaded local avatar`, this.avatar);
    }

    
    getRandomInitials() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return letters.charAt(Math.floor(Math.random() * 26)) + 
            letters.charAt(Math.floor(Math.random() * 26));
    }

    async joinedRoom(room) {
	this.startVideoStream();
    }
    
    async startVideoStream() {
	try {
	    this.emit("videoStreamUpdated");

	    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
	    this.avatar.videoStream = stream;
	    this.avatar.videoEnabled = true;
	    this.emit("videoStreamUpdated", stream);
	    slog(`📹 Video stream started`);
	} catch (error) {
	    serror(`❌ Failed to get webcam`, error);
	    this.emit("videoStreamUpdated");
	}
    }
    
    setConnectionStatus(status) {
	this.avatar.connectionStatus = status;
	this.emit("statusChanged", status); // Notify listeners (React components)
	slog(`🔄 Connection Status: ${status}`);
    }

    setAvatarData({ name, mood, color, image }) {
	if (name) this.avatar.name = name;
	if (mood) this.avatar.mood = mood;
	if (color) this.avatar.color = color;
	if (image) this.avatar.image = image;
	this.saveToStorage();
    }

    saveToStorage() {
	localStorage.setItem("localAvatar", JSON.stringify(this.avatar));
    }

    getAvatarData() {
	return this.avatar;
    }

    getVideoStream() {
	return this.avatar.videoStream;
    }

}

const localAvatarManager = new LocalAvatarManager();
export default localAvatarManager;
