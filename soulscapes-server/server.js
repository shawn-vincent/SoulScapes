import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = {}; // Track users and their avatars
const log = (msg, emoji = "🖥️") => console.log(`[${new Date().toISOString()}] ${emoji} ${msg}`);

const roomsNamespace = io.of("/rooms");

roomsNamespace.on("connection", (socket) => {
  log(`User connected: ${socket.id} 🌍`);

  socket.on("join-room", ({ room, avatarData }) => {
    socket.join(room);
    avatarData.id = socket.id;
    rooms[room] = rooms[room] || {};
    rooms[room][socket.id] = avatarData;

    log(`${socket.id} joined room "${room}" as ${avatarData.name} 🏠`);

    const existingUsers = Object.entries(rooms[room]).map(([id, avatar]) => ({ id, avatar }));
    socket.emit("user-list", existingUsers);
    socket.to(room).emit("user-joined", { id: socket.id, avatar: avatarData });
  });

  // --- New event handlers for WebRTC signaling ---

  socket.on("offer", (data) => {
    // Forward the offer to the target client.
    // Assume data has: { target, offer }
    log(`Forwarding offer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("offer", { offer: data.offer, sender: socket.id });
  });

  socket.on("answer", (data) => {
    // Forward the answer to the target client.
    // Assume data has: { target, answer }
    log(`Forwarding answer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("answer", { answer: data.answer, sender: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    // Forward the ICE candidate to the target client.
    // Assume data has: { target, candidate }
    log(`Forwarding ICE candidate from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("ice-candidate", { candidate: data.candidate, sender: socket.id });
  });

  // ---------------------------------------------------

  socket.on("disconnect", () => {
    log(`User disconnected: ${socket.id} ❌`);

    Object.keys(rooms).forEach((room) => {
      if (rooms[room][socket.id]) {
        delete rooms[room][socket.id];
        log(`Removed ${socket.id} from room "${room}" 🚪`);
        roomsNamespace.to(room).emit("user-left", socket.id);
      }
    });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  log(`WebRTC signaling server running on port ${PORT} 🚀`);
});
