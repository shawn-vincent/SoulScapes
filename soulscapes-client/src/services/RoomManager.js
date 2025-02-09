import { io } from "socket.io-client";
import localAvatarManager from "./LocalAvatarManager";
import remoteAvatarManager from "./RemoteAvatarManager";

class RoomManager {
  constructor() {
    this.socket = io("http://localhost:4000/rooms", {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.peerConnections = {};
    this.room = null;

    this.socket.on("connect", () => this.rejoinRoom());
    this.socket.on("disconnect", () => console.warn(`[${new Date().toISOString()}] ⚠️ Disconnected. Attempting reconnect...`));

    this.socket.on("user-list", this.handleUserList);
    this.socket.on("user-joined", this.handleNewUser);
    this.socket.on("user-left", this.handleUserLeft);
  }

  async joinRoom(room) {
    this.room = room;
    localStorage.setItem("lastRoom", room);
    const avatarData = localAvatarManager.getAvatarData();
    this.socket.emit("join-room", { room, avatarData });

    console.log(`[${new Date().toISOString()}] 🚪 Joined room "${room}"`);
  }

  rejoinRoom() {
    const lastRoom = localStorage.getItem("lastRoom");
    if (lastRoom) {
      console.log(`[${new Date().toISOString()}] 🔄 Rejoining room "${lastRoom}"`);
      this.joinRoom(lastRoom);
    }
  }

  async handleUserList(users) {
    users.forEach(({ id, avatar }) => {
      remoteAvatarManager.addUser(id, avatar);
    });
  }

  async handleNewUser({ id, avatar }) {
    remoteAvatarManager.addUser(id, avatar);
  }

  async handleUserLeft(id) {
    remoteAvatarManager.removeUser(id);
  }
}

const roomManager = new RoomManager();
export default roomManager;
