import { slog, serror, sdebug, swarn } from '../../../shared/slogging.js';
import { io } from "socket.io-client";
import localAvatarManager from "./LocalAvatarManager";
import remoteAvatarManager from "./RemoteAvatarManager";

class RoomManager {
    constructor() {
	this.socket = io("/rooms", {
	    reconnection: true,
	    reconnectionAttempts: 10,
	    reconnectionDelay: 2000,
	});

	this.peerConnections = {};
	this.room = null;

	this.socket.on("connect", () => {
	    slog(`✅ Connected to server`);

	    if (localAvatarManager) {
		localAvatarManager.setConnectionStatus("Connected");
	    } else {
		serror(`❌ localAvatarManager is undefined!`);
	    }
	    
	    this.rejoinRoom();
	});

	this.socket.on("disconnect", () => {
	    swarn(`❌ Disconnected. Reconnecting...`);
	    localAvatarManager.setConnectionStatus("Disconnected");
	});

	this.socket.on("user-list", this.handleUserList.bind(this));
	this.socket.on("user-joined", this.handleNewUser.bind(this));
	this.socket.on("user-left", this.handleUserLeft.bind(this));

	this.socket.on("offer", this.handleOffer.bind(this)); // ✅ Ensure it runs
	this.socket.on("answer", this.handleAnswer.bind(this));
	this.socket.on("ice-candidate", this.handleIceCandidate.bind(this));
    }

    async joinRoom(room) {
	if (this.room === room) {
	    swarn(`⚠️ Already in room "${room}", skipping duplicate join.`);
	    return;
	}
	
	this.room = room;
	remoteAvatarManager.switchRoom(room); // Tell RemoteAvatarManager to reset
	localStorage.setItem("lastRoom", room);
	
	if (localAvatarManager.getAvatarData().connectionStatus !== "Connected") {
	    localAvatarManager.setConnectionStatus("Connecting...");
	}
	
	this.socket.emit("join-room", { room, avatarData: localAvatarManager.getAvatarData() });
	
	slog(`🚪 Joining room "${room}"`);

	await localAvatarManager.joinedRoom(this.room);
    }

    rejoinRoom() {
	const lastRoom = localStorage.getItem("lastRoom");
	
	if (!lastRoom || this.room === lastRoom) {
	    swarn(`⚠️ Skipping rejoin, already in room "${this.room}".`);
	    return;
	}
	
	slog(`🔄 Rejoining room "${lastRoom}"`);
	this.joinRoom(lastRoom);
    }
    
    async handleUserList(users) {
	users.forEach(({ id, avatar }) => {
	    if (id==this.socket.id) return;
	    remoteAvatarManager.addUser(id, avatar);
	});
    }

    async handleNewUser({ id, avatar }) {

	if (id === this.socket.id) return;

	slog(`🚀 New user detected: ${id}`);
	remoteAvatarManager.addUser(id, avatar);

	slog(`🔄 Attempting to start WebRTC call with ${id}`);
	this.startCall(id);
    }

    async handleUserLeft(id) {
	remoteAvatarManager.removeUser(id);
    }


    async startCall(peerId) {
	slog(`📞 Starting call with ${peerId}`);

	if (this.peerConnections[peerId]) {
	    swarn(`⚠️ Already have a peer connection with ${peerId}, skipping.`);
	    return;
	}

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[peerId] = peerConnection;

	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
	    slog(`🎥 Adding local video tracks to call with ${peerId}`);
	    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
	} else {
	    swarn(`⚠️ No local video stream found for ${peerId}`);
	}

	peerConnection.onicecandidate = (event) => {
	    if (event.candidate) {
		slog(`❄️ Sending ICE candidate to ${peerId}`);
		this.socket.emit("ice-candidate", { target: peerId, candidate: event.candidate });
	    }
	};

	// Capture peerId in a local variable for use in the callback
	const currentPeerId = peerId;
	peerConnection.ontrack = (event) => {
	    slog(`📺 ontrack event for ${currentPeerId}`, event);
	    
	    // Use event.streams if available; otherwise, create a new MediaStream from the track(s)
	    let inboundStream;
	    if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
	    } else if (event.track) {
		// If no stream is provided, construct one from the received track.
		inboundStream = new MediaStream([event.track]);
	    } else {
		serror(`❌ No valid video tracks received from ${currentPeerId}`);
		return;
	    }
	    
	    slog(`🔄 Setting video stream for ${currentPeerId}`, inboundStream);
	    remoteAvatarManager.setVideoStream(currentPeerId, inboundStream);
	};

	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	slog(`📡 Sending WebRTC offer to ${currentPeerId}`);
	this.socket.emit("offer", { target: currentPeerId, offer });
    }


    async handleOffer({ offer, sender }) {
	slog(`📡 Received WebRTC offer from ${sender}`);

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[sender] = peerConnection;

	peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
		slog(`❄️ Sending ICE candidate to ${sender}`);
		this.socket.emit("ice-candidate", { target: sender, candidate: event.candidate });
            }
	};

	peerConnection.ontrack = (event) => {
            slog(`📺 ontrack event for ${sender}`, event);
            let inboundStream;
            if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
            } else if (event.track) {
		inboundStream = new MediaStream([event.track]);
            } else {
		serror(`❌ No valid video tracks received from ${sender}`);
		return;
            }
            slog(`🔄 Setting video stream for ${sender}`, inboundStream);
            remoteAvatarManager.setVideoStream(sender, inboundStream);
	};

	// **New:** Add local tracks on the callee side so that the answer includes media.
	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
            slog(`🎥 Adding local video tracks to call (callee side) with ${sender}`);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	} else {
            swarn(`⚠️ No local video stream found on callee side for ${sender}`);
	}

	slog(`🔄 Setting remote description for ${sender}`);
	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	slog(`📡 Sending WebRTC answer to ${sender}`);
	this.socket.emit("answer", { target: sender, answer });
    }

    async handleOffer_old({ target, offer }) {
	slog(`📡 Received WebRTC offer from ${target}`);

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[target] = peerConnection;

	peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
		slog(`❄️ Sending ICE candidate to ${target}`);
		this.socket.emit("ice-candidate", { target, candidate: event.candidate });
            }
	};
	// Capture peerId in a local variable for use in the callback
	const currentPeerId = target;
	peerConnection.ontrack = (event) => {
	    slog(`📺 ontrack event for ${currentPeerId}`, event);
	    
	    // Use event.streams if available; otherwise, create a new MediaStream from the track(s)
	    let inboundStream;
	    if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
	    } else if (event.track) {
		// If no stream is provided, construct one from the received track.
		inboundStream = new MediaStream([event.track]);
	    } else {
		serror(`❌ No valid video tracks received from ${currentPeerId}`);
		return;
	    }
	    
	    slog(`🔄 Setting video stream for ${currentPeerId}`, inboundStream);
	    remoteAvatarManager.setVideoStream(currentPeerId, inboundStream);
	};

	// **New code: Add local video tracks on the callee side**
	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
            slog(`🎥 Adding local video tracks to call (callee side) with ${target}`);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	} else {
            swarn(`⚠️ No local video stream found on callee side for ${target}`);
	}

	slog(`🔄 Setting remote description for ${target}`);
	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	slog(`📡 Sending WebRTC answer to ${target}`);
	this.socket.emit("answer", { target, answer });
    }

    handleIceCandidate({ sender, candidate }) {
	slog(`❄️ Received ICE candidate from ${sender}`);
	if (this.peerConnections[sender]) {
	    this.peerConnections[sender].addIceCandidate(new RTCIceCandidate(candidate))
		.then(() => slog(`✅ ICE candidate added successfully`))
		.catch((error) => serror(`❌ Failed to add ICE candidate`, error));
	} else {
	    swarn(`⚠️ No peer connection found for ${sender}`);
	}
    }

    async handleAnswer({ answer, sender }) {
	slog(`📡 Received WebRTC answer from ${sender}`);
	
	const peerConnection = this.peerConnections[sender];
	if (!peerConnection) {
            serror(`❌ No peer connection found for ${sender}`);
            return;
	}

	try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            slog(`✅ Set remote description from answer`);
	} catch (error) {
            serror(`❌ Error setting remote description:`, error);
	}
    }
}

const roomManager = new RoomManager();
window.roomManager = roomManager;
export default roomManager;
