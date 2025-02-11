import { slog, serror, sdebug, swarn } from '../../../shared/slogging.js';
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
	    this.avatars[id] = { 
		...this.avatars[id], 
		videoStream: stream, 
		isVideoLoading: false,
		connectionStatus: "Connected"  // Update connection status here
	    };
	    slog(
		`✅ Video stream set for ${id}`, 
		stream
	    );
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
	slog(`🔄 Resetting avatars for new room`);
	this.avatars = {};
	this.emit("updated");
    }
}

const remoteAvatarManager = new RemoteAvatarManager();
export default remoteAvatarManager;
