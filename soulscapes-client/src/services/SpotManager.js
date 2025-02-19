import { slog, serror, sdebug, swarn } from '../../../shared/slogger.js';
import { io } from "socket.io-client";
import { safeOn, safeEmit, wrapError } from "../utils/safeSocket.js";
import localAvatarManager from "./LocalAvatarManager";
import remoteAvatarManager from "./RemoteAvatarManager";
import hostEnv from "../services/HostEnvironmentManager";

class SpotManager {
  constructor() {
    slog("🚀 Connecting to server");

    this.socket = io("/rooms", {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    // Global transport error handlers.
    this.socket.on("connect_error", (error) => {
      serror("Socket connect_error", error);
    });
    this.socket.on("connect_timeout", (timeout) => {
      serror("Socket connect_timeout", `Timeout after ${timeout}ms`);
    });
    this.socket.on("reconnect_error", (error) => {
      serror("Socket reconnect_error", error);
    });
    this.socket.on("reconnect_failed", () => {
      serror("Socket reconnect_failed", "Reconnection failed");
    });

    this.peerConnections = {};
    this.spot = null;
    // Initialize a queue for ICE candidates per peer
    this.pendingCandidates = {};

    // Extend the socket with safeOn for incoming events:
    this.socket.safeOn = function (eventName, handler) {
      safeOn(this, eventName, handler);
    };

    // Top-level "error" event listener.
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

      this.socket.safeOn("avatar-update", ({ id, avatar }) => {
	  // Update the remote avatar if it exists.
	  if (remoteAvatarManager.avatars[id]) {
	      remoteAvatarManager.avatars[id] = {
		  ...remoteAvatarManager.avatars[id],
		  ...avatar,
	      };
	      remoteAvatarManager.emit("updated");
	  }
      });
      
    this.socket.safeOn("offer", this.handleOffer.bind(this));
    this.socket.safeOn("answer", this.handleAnswer.bind(this));
    this.socket.safeOn("ice-candidate", this.handleIceCandidate.bind(this));
  }

  async joinSpot(spot) {
    slog(`🚪 !!! Joining spot "${spot}"`);

    this.spot = spot;
    remoteAvatarManager.switchRoom(spot);
    localStorage.setItem("lastSpot", spot);

    slog(`🚪 Set local storage "${spot}"`);

    if (localAvatarManager.getAvatarData().connectionStatus !== "Connected") {
      localAvatarManager.setConnectionStatus("Connecting...");
      slog(`🚪 Updated avatar connection status "${spot}"`);
    }

    try {
      slog(`🚪 calling server with join-room: "${spot}"`);
      await safeEmit(this.socket, "join-room", {
        room: spot,
        avatarData: localAvatarManager.getAvatarData()
      });
    } catch (err) {
      serror("Error joining spot:", err);
      throw err;
    }

    slog(`🚪 Informing LocalAvatarManager of room join: "${spot}"`);
    await localAvatarManager.joinedRoom(this.spot);
  }

  rejoinSpot() {
    const lastSpot = localStorage.getItem("lastSpot");
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

    const peerConnection = new RTCPeerConnection({
      // Optionally, add ICE servers (e.g., a STUN server) here:
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    this.peerConnections[peerId] = peerConnection;

    let localStream;
    try {
      // Use the local video stream from LocalAvatarManager
      localStream = await localAvatarManager.getLocalVideoStream();
    } catch (err) {
      serror(`SpotManager: Failed to obtain local camera stream for call with ${peerId}`, err);
    }
    if (localStream) {
      slog(`🎥 Adding local video tracks to call with ${peerId}`);
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    } else {
      serror(`⚠️ No local video stream found for ${peerId}`);
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

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
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

    let localStream;
    try {
      // Use the local video stream from LocalAvatarManager
      localStream = await localAvatarManager.getLocalVideoStream();
    } catch (err) {
      serror(`SpotManager: Failed to obtain local camera stream for call with ${sender}`, err);
    }
    if (localStream) {
      slog(`🎥 Adding local video tracks to call (callee side) with ${sender}`);
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    } else {
      serror(`No local video stream found on callee side for ${sender}`);
    }

    slog(`🔄 Setting remote description for ${sender}`);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // After setting the remote description, process any queued ICE candidates.
    if (
      this.pendingCandidates[sender] &&
      this.pendingCandidates[sender].length > 0
    ) {
      for (const cand of this.pendingCandidates[sender]) {
        peerConnection.addIceCandidate(new RTCIceCandidate(cand))
          .then(() => slog(`✅ Queued ICE candidate added successfully`))
          .catch((error) => serror(`❌ Failed to add queued ICE candidate`, error));
      }
      this.pendingCandidates[sender] = [];
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    slog(`📡 Sending WebRTC answer to ${sender}`);
    safeEmit(this.socket, "answer", { target: sender, answer });
  }

  async handleIceCandidate({ sender, candidate }) {
    slog(`❄️ Received ICE candidate from ${sender}`);
    const pc = this.peerConnections[sender];
    if (!pc) {
      swarn(`⚠️ No peer connection found for ${sender}`);
      return;
    }

    // Initialize the pending queue if needed.
    if (!this.pendingCandidates[sender]) {
      this.pendingCandidates[sender] = [];
    }

    // If the remote description is not set yet, queue the candidate.
    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      this.pendingCandidates[sender].push(candidate);
      slog(`Queued ICE candidate for ${sender} until remote description is set.`);
    } else {
      pc.addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => slog(`✅ ICE candidate added successfully`))
        .catch((error) => serror(`❌ Failed to add ICE candidate`, error));
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
      // After setting remote description, add any queued ICE candidates.
      if (
        this.pendingCandidates[sender] &&
        this.pendingCandidates[sender].length > 0
      ) {
        for (const cand of this.pendingCandidates[sender]) {
          peerConnection.addIceCandidate(new RTCIceCandidate(cand))
            .then(() => slog(`✅ Queued ICE candidate added successfully`))
            .catch((error) => serror(`❌ Failed to add queued ICE candidate`, error));
        }
        this.pendingCandidates[sender] = [];
      }
    } catch (error) {
      serror(`❌ Error setting remote description:`, error);
    }
  }
}

const spotManager = new SpotManager();
window.spotManager = spotManager;
export default spotManager;
