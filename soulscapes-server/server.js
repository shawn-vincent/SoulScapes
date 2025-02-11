import express from "express";
import http from "http";
import { Server } from "socket.io";
// Import the logging library as a default export.
import slogging from "../shared/slogging.js";

const { slog, serror, slogExpressEndpoint, slogConfig } = slogging;

/**
 * Wraps an error with additional context while preserving the original error.
 * Uses the modern JavaScript Error 'cause' feature.
 * @param {string} context - Context information to prepend.
 * @param {Error} error - The original error.
 * @returns {Error} The wrapped error.
 */
function wrapError(context, error) {
  return new Error(`${context}: ${error.message}`, { cause: error });
}

/**
 * Creates a safe wrapper for socket event handlers.
 * This wrapper ensures that any synchronous error or rejected promise is caught,
 * wrapped with context, logged via serror(), and (if applicable) an "error" event is emitted.
 *
 * @param {string} eventName - The name of the event (used for context).
 * @param {function} handler - The event handler function.
 * @returns {function} The wrapped handler.
 */
function safeSocketHandler(eventName, handler) {
  return function (...args) {
    Promise.resolve(handler.apply(this, args)).catch((err) => {
      const wrapped = wrapError(`${eventName} handler error`, err);
      serror(wrapped.message, wrapped);
      if (this && typeof this.emit === "function") {
        this.emit("error", { message: wrapped.message, stack: wrapped.stack });
      }
    });
  };
}

/**
 * Extends a socket by adding a safeOn() method that wraps the given event handler.
 * @param {object} socket - The Socket.IO socket instance.
 * @param {string} eventName - The event name.
 * @param {function} handler - The event handler function.
 */
function safeOn(socket, eventName, handler) {
  socket.on(eventName, safeSocketHandler(eventName, handler));
}

// -------------------------
// Express and HTTP Server Setup
// -------------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Use JSON middleware on the /logs endpoint before handing it off to slogger.
app.use("/logs", express.json());
slogExpressEndpoint(app, "/logs");

// -------------------------
// Global Express Error Middleware
// -------------------------
// This middleware catches any unhandled errors in HTTP routes and middleware,
// logs them using serror(), and returns either a JSON response (if the client accepts JSON)
// or an HTML response containing a full JSON dump of the error (including nested causes).
app.use((err, req, res, next) => {
  serror("Unhandled error caught in global Express error handler", err);
  const statusCode = err.status || 500;

  function flattenError(e) {
    const flat = { message: e.message, stack: e.stack };
    if (e.cause) {
      flat.cause = flattenError(e.cause);
    }
    return flat;
  }
  const errorResponse = flattenError(err);

  if (req.accepts("json")) {
    res.status(statusCode).json(errorResponse);
  } else {
    res.status(statusCode).type("html").send(`
      <html>
        <head>
          <title>Error ${statusCode}</title>
        </head>
        <body>
          <h1>Error ${statusCode}</h1>
          <pre>${JSON.stringify(errorResponse, null, 2)}</pre>
        </body>
      </html>
    `);
  }
});

// -------------------------
// Socket.IO Setup & Rooms Namespace
// -------------------------
const rooms = {}; // Tracks users and their avatars
const roomsNamespace = io.of("/rooms");

slogConfig({
  logLevel: "debug",
  console: "debug",
  logFile: {
    enabled: true,
    path: "../logs/server-soulscapes.log",
  },
});

roomsNamespace.on("connection", (socket) => {
  // Extend the socket with a safeOn() method.
  socket.safeOn = function (eventName, handler) {
    this.on(eventName, safeSocketHandler(eventName, handler));
  };

  slog(`🌍 User connected: ${socket.id}`);

  socket.safeOn("join-room", ({ room, avatarData }) => {
    socket.join(room);
    avatarData.id = socket.id;
    rooms[room] = rooms[room] || {};
    rooms[room][socket.id] = avatarData;

    slog(`🏠 ${socket.id} joined room "${room}" as ${avatarData.name}`);

    const existingUsers = Object.entries(rooms[room]).map(([id, avatar]) => ({
      id,
      avatar,
    }));
    socket.emit("user-list", existingUsers);
    socket.to(room).emit("user-joined", { id: socket.id, avatar: avatarData });
  });

  socket.safeOn("offer", (data) => {
    slog(`Forwarding offer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("offer", {
      offer: data.offer,
      sender: socket.id,
    });
  });

  socket.safeOn("answer", (data) => {
    slog(`Forwarding answer from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("answer", {
      answer: data.answer,
      sender: socket.id,
    });
  });

  socket.safeOn("ice-candidate", (data) => {
    slog(`Forwarding ICE candidate from ${socket.id} to ${data.target}`);
    socket.to(data.target).emit("ice-candidate", {
      candidate: data.candidate,
      sender: socket.id,
    });
  });

  socket.safeOn("disconnect", () => {
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

// -------------------------
// Start the Server
// -------------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  slog(`🚀 WebRTC signaling server running on port ${PORT}`);
});
