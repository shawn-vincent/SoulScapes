// src/services/LocalAvatarManager.js
import { EventEmitter } from "events";
import { slog, serror } from '../../../shared/slogger.js';

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
      videoError: null, // New property to track video errors
    };
    this.saveToStorage();
    slog("🎭 Loaded local avatar", this.avatar);
  }

  getRandomInitials() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters.charAt(Math.floor(Math.random() * 26)) +
           letters.charAt(Math.floor(Math.random() * 26));
  }

  async joinedRoom(room) {
    slog("LocalAvatarManager: joinedRoom called with room", room);
    // Check if the browser supports getUserMedia.
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      const errorMsg = "Camera access not supported in this environment";
      serror("LocalAvatarManager:", errorMsg);
      this.avatar.videoError = errorMsg;
      this.emit("videoStreamUpdated");
      return;
    }
    // Call startVideoStream.
    this.startVideoStream();
  }

  async startVideoStream() {
    slog("LocalAvatarManager: startVideoStream invoked");
    try {
      this.emit("videoStreamUpdated");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.avatar.videoStream = stream;
      this.avatar.videoEnabled = true;
      this.avatar.videoError = null; // Clear any previous error
      this.emit("videoStreamUpdated", stream);
      slog("📹 Video stream started successfully");
    } catch (error) {
      serror("LocalAvatarManager: Failed to get webcam:", error);
      this.avatar.videoStream = null;
      this.avatar.videoEnabled = false;
      // Set the error message so the UI can show it.
      this.avatar.videoError = error.message || "Unknown error starting video";
      this.emit("videoStreamUpdated");
    }
  }
  
  setConnectionStatus(status) {
    this.avatar.connectionStatus = status;
    this.emit("statusChanged", status); // Notify listeners (React components)
    slog("LocalAvatarManager: Connection Status:", status);
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
