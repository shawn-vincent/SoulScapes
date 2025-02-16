// src/services/SpotManager.js
import { slog, serror, sdebug, swarn } from '../../../shared/slogger.js';
import { io } from "socket.io-client";
import { safeOn, safeEmit, wrapError } from "../utils/safeSocket.js";
import localAvatarManager from "./LocalAvatarManager";
import remoteAvatarManager from "./RemoteAvatarManager";

class SpotManager {
  constructor() {
    slog("🚀 Connecting to server");

    this.socket = io("/rooms", {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.peerConnections = {};
    this.spot = null;

    // Extend the socket with safeOn for incoming events:
    this.socket.safeOn = function(eventName, handler) {
      safeOn(this, eventName, handler);
    };

    // Register a top-level "error" event listener.
    this.socket.safeOn("error", (error) => {
      throw wrapError("Server error received in SpotManager", error);
    });
    
    this.socket.safeOn("connect", () => {
      slog(`✅ Connected to server`);
      if (localAvatarManager) {
        localAvatarManager.setConnectionStatus("Connected");
      } else {
        serror(`❌ localAvatarManager is undefined!`);
      }
      this.rejoinSpot();
    });

    this.socket.safeOn("disconnect", () => {
      swarn(`❌ Disconnected. Reconnecting...`);
      localAvatarManager.setConnectionStatus("Disconnected");
    });

    this.socket.safeOn("user-list", this.handleUserList.bind(this));
    this.socket.safeOn("user-joined", this.handleNewUser.bind(this));
    this.socket.safeOn("user-left", this.handleUserLeft.bind(this));

    this.socket.safeOn("offer", this.handleOffer.bind(this));
    this.socket.safeOn("answer", this.handleAnswer.bind(this));
    this.socket.safeOn("ice-candidate", this.handleIceCandidate.bind(this));
  }

  async joinSpot(spot) {
    if (this.spot === spot) {
      swarn(`⚠️ Already in spot "${spot}", skipping duplicate join.`);
      return;
    }

    this.spot = spot;
    remoteAvatarManager.switchRoom(spot);
    localStorage.setItem("lastSpot", spot);

    if (localAvatarManager.getAvatarData().connectionStatus !== "Connected") {
      localAvatarManager.setConnectionStatus("Connecting...");
    }

    try {
      await safeEmit(this.socket, "join-room", {
        room: spot, // server protocol still uses "room"
        avatarData: localAvatarManager.getAvatarData()
      });
    } catch (err) {
      serror("Error joining spot:", err);
      throw err;
    }

    slog(`🚪 Joining spot "${spot}"`);

    await localAvatarManager.joinedRoom(this.spot);
  }

  rejoinSpot() {
    const lastSpot = localStorage.getItem("lastSpot");
    if (!lastSpot || this.spot === lastSpot) {
      swarn(`⚠️ Skipping rejoin, already in spot "${this.spot}".`);
      return;
    }
    slog(`🔄 Rejoining spot "${lastSpot}"`);
    this.joinSpot(lastSpot);
  }

  async handleUserList(users) {
    users.forEach(({ id, avatar }) => {
      if (id === this.socket.id) return;
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
        safeEmit(this.socket, "ice-candidate", {
          target: peerId,
          candidate: event.candidate
        });
      }
    };

    const currentPeerId = peerId;
    peerConnection.ontrack = (event) => {
      slog(`📺 ontrack event for ${currentPeerId}`, event);
      let inboundStream;
      if (event.streams && event.streams.length > 0 && event.streams[0] instanceof MediaStream) {
        inboundStream = event.streams[0];
      } else if (event.track) {
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
    safeEmit(this.socket, "offer", { target: currentPeerId, offer });
  }

  async handleOffer({ offer, sender }) {
    slog(`📡 Received WebRTC offer from ${sender}`);

    const peerConnection = new RTCPeerConnection();
    this.peerConnections[sender] = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        slog(`❄️ Sending ICE candidate to ${sender}`);
        safeEmit(this.socket, "ice-candidate", {
          target: sender,
          candidate: event.candidate
        });
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
    safeEmit(this.socket, "answer", { target: sender, answer });
  }

  async handleIceCandidate({ sender, candidate }) {
    slog(`❄️ Received ICE candidate from ${sender}`);
    if (this.peerConnections[sender]) {
      this.peerConnections[sender]
        .addIceCandidate(new RTCIceCandidate(candidate))
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

const spotManager = new SpotManager();
window.spotManager = spotManager;
export default spotManager;
