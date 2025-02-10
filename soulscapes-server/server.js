import express from "express";
import http from "http";
import { Server } from "socket.io";

import * as slogging from '../shared/slogging.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

slogExpressEndpoint(app, "/logs");


const rooms = {}; // Track users and their avatars


const roomsNamespace = io.of("/rooms");

slogConfig({
    logLevel: "debug",
    console: "debug",
    logFile: {
        enabled: true,
        path: "../logs/server-soulscapes.log",
    }
});




roomsNamespace.on("connection", (socket) => {
    slog(`🌍 User connected: ${socket.id} `);

    socket.on("join-room", ({ room, avatarData }) => {
	socket.join(room);
	avatarData.id = socket.id;
	rooms[room] = rooms[room] || {};
	rooms[room][socket.id] = avatarData;

	slog(`🏠 ${socket.id} joined room "${room}" as ${avatarData.name}`);

	const existingUsers = Object.entries(rooms[room]).map(([id, avatar]) => ({ id, avatar }));
	socket.emit("user-list", existingUsers);
	socket.to(room).emit("user-joined", { id: socket.id, avatar: avatarData });
    });

    // --- New event handlers for WebRTC signaling ---

    socket.on("offer", (data) => {
	// Forward the offer to the target client.
	// Assume data has: { target, offer }
	slog(`Forwarding offer from ${socket.id} to ${data.target}`);
	socket.to(data.target).emit("offer", { offer: data.offer, sender: socket.id });
    });

    socket.on("answer", (data) => {
	// Forward the answer to the target client.
	// Assume data has: { target, answer }
	slog(`Forwarding answer from ${socket.id} to ${data.target}`);
	socket.to(data.target).emit("answer", { answer: data.answer, sender: socket.id });
    });

    socket.on("ice-candidate", (data) => {
	// Forward the ICE candidate to the target client.
	// Assume data has: { target, candidate }
	slog(`Forwarding ICE candidate from ${socket.id} to ${data.target}`);
	socket.to(data.target).emit("ice-candidate", { candidate: data.candidate, sender: socket.id });
    });

    // ---------------------------------------------------

    socket.on("disconnect", () => {
	slog(`❌ User disconnected: ${socket.id}`);

	Object.keys(rooms).forEach((room) => {
	    if (rooms[room][socket.id]) {
		delete rooms[room][socket.id];
		slog(`🚪 Removed ${socket.id} from room "${room}"`);
		roomsNamespace.to(room).emit("user-left", socket.id);
	    }
	});
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    slog(`🚀 WebRTC signaling server running on port ${PORT}`);
});
