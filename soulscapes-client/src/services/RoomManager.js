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
	    console.log(`[${new Date().toISOString()}] ✅ Connected to server`);

	    if (localAvatarManager) {
		localAvatarManager.setConnectionStatus("Connected");
	    } else {
		console.error(`[${new Date().toISOString()}] ❌ localAvatarManager is undefined!`);
	    }
	    
	    this.rejoinRoom();
	});

	this.socket.on("disconnect", () => {
	    console.warn(`[${new Date().toISOString()}] ❌ Disconnected. Reconnecting...`);
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
	    console.warn(`[${new Date().toISOString()}] ⚠️ Already in room "${room}", skipping duplicate join.`);
	    return;
	}
	
	this.room = room;
	remoteAvatarManager.switchRoom(room); // Tell RemoteAvatarManager to reset
	localStorage.setItem("lastRoom", room);
	
	if (localAvatarManager.getAvatarData().connectionStatus !== "Connected") {
	    localAvatarManager.setConnectionStatus("Connecting...");
	}
	
	this.socket.emit("join-room", { room, avatarData: localAvatarManager.getAvatarData() });
	
	console.log(`[${new Date().toISOString()}] 🚪 Joining room "${room}"`);

	await localAvatarManager.joinedRoom(this.room);
    }

    rejoinRoom() {
	const lastRoom = localStorage.getItem("lastRoom");
	
	if (!lastRoom || this.room === lastRoom) {
	    console.warn(`[${new Date().toISOString()}] ⚠️ Skipping rejoin, already in room "${this.room}".`);
	    return;
	}
	
	console.log(`[${new Date().toISOString()}] 🔄 Rejoining room "${lastRoom}"`);
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

	console.log(`[${new Date().toISOString()}] 🚀 New user detected: ${id}`);
	remoteAvatarManager.addUser(id, avatar);

	console.log(`[${new Date().toISOString()}] 🔄 Attempting to start WebRTC call with ${id}`);
	this.startCall(id);
    }

    async handleUserLeft(id) {
	remoteAvatarManager.removeUser(id);
    }


    async startCall(peerId) {
	console.log(`[${new Date().toISOString()}] 📞 Starting call with ${peerId}`);

	if (this.peerConnections[peerId]) {
	    console.warn(`[${new Date().toISOString()}] ⚠️ Already have a peer connection with ${peerId}, skipping.`);
	    return;
	}

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[peerId] = peerConnection;

	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
	    console.log(`[${new Date().toISOString()}] 🎥 Adding local video tracks to call with ${peerId}`);
	    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
	} else {
	    console.warn(`[${new Date().toISOString()}] ⚠️ No local video stream found for ${peerId}`);
	}

	peerConnection.onicecandidate = (event) => {
	    if (event.candidate) {
		console.log(`[${new Date().toISOString()}] ❄️ Sending ICE candidate to ${peerId}`);
		this.socket.emit("ice-candidate", { target: peerId, candidate: event.candidate });
	    }
	};

	// Capture peerId in a local variable for use in the callback
	const currentPeerId = peerId;
	peerConnection.ontrack = (event) => {
	    console.log(`[${new Date().toISOString()}] 📺 ontrack event for ${currentPeerId}`, event);
	    
	    // Use event.streams if available; otherwise, create a new MediaStream from the track(s)
	    let inboundStream;
	    if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
	    } else if (event.track) {
		// If no stream is provided, construct one from the received track.
		inboundStream = new MediaStream([event.track]);
	    } else {
		console.error(`[${new Date().toISOString()}] ❌ No valid video tracks received from ${currentPeerId}`);
		return;
	    }
	    
	    console.log(`[${new Date().toISOString()}] 🔄 Setting video stream for ${currentPeerId}`, inboundStream);
	    remoteAvatarManager.setVideoStream(currentPeerId, inboundStream);
	};

	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	console.log(`[${new Date().toISOString()}] 📡 Sending WebRTC offer to ${currentPeerId}`);
	this.socket.emit("offer", { target: currentPeerId, offer });
    }


    async handleOffer({ offer, sender }) {
	console.log(`[${new Date().toISOString()}] 📡 Received WebRTC offer from ${sender}`);

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[sender] = peerConnection;

	peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
		console.log(`[${new Date().toISOString()}] ❄️ Sending ICE candidate to ${sender}`);
		this.socket.emit("ice-candidate", { target: sender, candidate: event.candidate });
            }
	};

	peerConnection.ontrack = (event) => {
            console.log(`[${new Date().toISOString()}] 📺 ontrack event for ${sender}`, event);
            let inboundStream;
            if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
            } else if (event.track) {
		inboundStream = new MediaStream([event.track]);
            } else {
		console.error(`[${new Date().toISOString()}] ❌ No valid video tracks received from ${sender}`);
		return;
            }
            console.log(`[${new Date().toISOString()}] 🔄 Setting video stream for ${sender}`, inboundStream);
            remoteAvatarManager.setVideoStream(sender, inboundStream);
	};

	// **New:** Add local tracks on the callee side so that the answer includes media.
	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
            console.log(`[${new Date().toISOString()}] 🎥 Adding local video tracks to call (callee side) with ${sender}`);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	} else {
            console.warn(`[${new Date().toISOString()}] ⚠️ No local video stream found on callee side for ${sender}`);
	}

	console.log(`[${new Date().toISOString()}] 🔄 Setting remote description for ${sender}`);
	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	console.log(`[${new Date().toISOString()}] 📡 Sending WebRTC answer to ${sender}`);
	this.socket.emit("answer", { target: sender, answer });
    }

    async handleOffer_old({ target, offer }) {
	console.log(`[${new Date().toISOString()}] 📡 Received WebRTC offer from ${target}`);

	const peerConnection = new RTCPeerConnection();
	this.peerConnections[target] = peerConnection;

	peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
		console.log(`[${new Date().toISOString()}] ❄️ Sending ICE candidate to ${target}`);
		this.socket.emit("ice-candidate", { target, candidate: event.candidate });
            }
	};
	// Capture peerId in a local variable for use in the callback
	const currentPeerId = target;
	peerConnection.ontrack = (event) => {
	    console.log(`[${new Date().toISOString()}] 📺 ontrack event for ${currentPeerId}`, event);
	    
	    // Use event.streams if available; otherwise, create a new MediaStream from the track(s)
	    let inboundStream;
	    if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
		inboundStream = event.streams[0];
	    } else if (event.track) {
		// If no stream is provided, construct one from the received track.
		inboundStream = new MediaStream([event.track]);
	    } else {
		console.error(`[${new Date().toISOString()}] ❌ No valid video tracks received from ${currentPeerId}`);
		return;
	    }
	    
	    console.log(`[${new Date().toISOString()}] 🔄 Setting video stream for ${currentPeerId}`, inboundStream);
	    remoteAvatarManager.setVideoStream(currentPeerId, inboundStream);
	};

	// **New code: Add local video tracks on the callee side**
	const localStream = localAvatarManager.getVideoStream();
	if (localStream) {
            console.log(`[${new Date().toISOString()}] 🎥 Adding local video tracks to call (callee side) with ${target}`);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
	} else {
            console.warn(`[${new Date().toISOString()}] ⚠️ No local video stream found on callee side for ${target}`);
	}

	console.log(`[${new Date().toISOString()}] 🔄 Setting remote description for ${target}`);
	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	console.log(`[${new Date().toISOString()}] 📡 Sending WebRTC answer to ${target}`);
	this.socket.emit("answer", { target, answer });
    }

    handleIceCandidate({ sender, candidate }) {
	console.log(`[${new Date().toISOString()}] ❄️ Received ICE candidate from ${sender}`);
	if (this.peerConnections[sender]) {
	    this.peerConnections[sender].addIceCandidate(new RTCIceCandidate(candidate))
		.then(() => console.log(`[${new Date().toISOString()}] ✅ ICE candidate added successfully`))
		.catch((error) => console.error(`[${new Date().toISOString()}] ❌ Failed to add ICE candidate`, error));
	} else {
	    console.warn(`[${new Date().toISOString()}] ⚠️ No peer connection found for ${sender}`);
	}
    }

    async handleAnswer({ answer, sender }) {
	console.log(`[${new Date().toISOString()}] 📡 Received WebRTC answer from ${sender}`);
	
	const peerConnection = this.peerConnections[sender];
	if (!peerConnection) {
            console.error(`[${new Date().toISOString()}] ❌ No peer connection found for ${sender}`);
            return;
	}

	try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`[${new Date().toISOString()}] ✅ Set remote description from answer`);
	} catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Error setting remote description:`, error);
	}
    }
}

const roomManager = new RoomManager();
window.roomManager = roomManager;
export default roomManager;
