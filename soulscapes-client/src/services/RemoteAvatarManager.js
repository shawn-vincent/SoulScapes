// RemoteAvatarManager.js
import { EventEmitter } from "events";

class RemoteAvatarManager extends EventEmitter {
  constructor() {
    super();
    this.avatars = {};
  }

  addUser(id, avatarData) {
    if (this.avatars[id]) return;
    // Initialize with no videoStream and mark as loading
    this.avatars[id] = { ...avatarData, videoStream: null, isVideoLoading: true };
    this.emit("updated");
  }

  setVideoStream(id, stream) {
    if (this.avatars[id]) {
      // Create a new object to trigger re-render in React:
      this.avatars[id] = { 
        ...this.avatars[id], 
        videoStream: stream, 
        isVideoLoading: false 
      };
      console.log(`[${new Date().toISOString()}] ✅ Video stream set for ${id}`, stream);
      this.emit("updated");
    }
  }

  removeUser(id) {
    if (this.avatars[id]) {
      delete this.avatars[id];
      this.emit("updated");
    }
  }

  getAvatarsForCurrentRoom() {
    return Object.values(this.avatars);
  }

  switchRoom(room) {
    // Reset avatars when switching rooms
    console.log(`[${new Date().toISOString()}] 🔄 Resetting avatars for new room`);
    this.avatars = {};
    this.emit("updated");
  }
}

const remoteAvatarManager = new RemoteAvatarManager();
export default remoteAvatarManager;
