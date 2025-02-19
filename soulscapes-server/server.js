import express from "express";
import http from "http";
import { Server } from "socket.io";
// Import the logging library as a default export.
import slogger from "../shared/slogger.js";

const { slog, serror, slogExpressEndpoint, slogConfig, slogRollAllLogs } = slogger;

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
    let result;
    try {
      result = handler.apply(this, args);
    } catch (err) {
      // Synchronous error caught here.
      const wrapped = wrapError(`event '${eventName}' handler error`, err);
      serror(wrapped.message, wrapped);
      if (this && typeof this.emit === "function") {
        this.emit("error", { message: wrapped.message, stack: wrapped.stack });
      }
      return; // Return early so that we don't continue.
    }
    // Now wrap the (possibly asynchronous) result in a promise.
    Promise.resolve(result).catch((err) => {
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
slogExpressEndpoint(app, "/logs", function (req) {
  // Default: return the client’s IP address (if available).
  return req && req.ip ? req.ip : "unknown";
});

// NEW: Add the /leave-spot endpoint to handle proactive user departure.
app.post("/leave-spot", express.json(), (req, res) => {
  slog("/leave-spot ---------------------------");
  const { spot, id } = req.body;
  slog("body == ", req.body, spot, id);
  if (rooms[spot] && rooms[spot][id]) {
    delete rooms[spot][id];
    slog(`User ${id} proactively left spot "${spot}" via sendBeacon`);
    roomsNamespace.to(spot).emit("user-left", id);
  }
  res.sendStatus(200);
});

// -------------------------
// Global Express Error Middleware
// -------------------------
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
    res
      .status(statusCode)
      .type("html")
      .send(`
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
  // write server logs to file
  slog: [
    {
      type: "file",
      level: "debug",
      path: "../logs/server-soulscapes.log",
    },
  ],
  // write client logs to a different file.
  "slog._remote": [
    {
      type: "file",
      level: "debug",
      path: "../logs/clientRemote-soulscapes.log",
    },
  ],
});

slog("Set up slog config");

roomsNamespace.on(
  "connection",
  safeSocketHandler("connection", (socket) => {
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

    // NEW: Handle avatar-update events.
    socket.safeOn("avatar-update", (updatedAvatarData) => {
      slog(`Forwarding avatar data update from ${socket.id}`, updatedAvatarData);
      // Determine the room this socket is in (socket.rooms is a Set that includes socket.id)
      const roomsArray = Array.from(socket.rooms);
      const room = roomsArray.find((r) => r !== socket.id);
      if (room && rooms[room] && rooms[room][socket.id]) {
        // Update the server's record.
        rooms[room][socket.id] = updatedAvatarData;
        // Broadcast to everyone else in the room.
        socket.to(room).emit("avatar-update", { id: socket.id, avatar: updatedAvatarData });
      }
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
  })
);

// -------------------------
// Start the Server
// -------------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  slog(`🚀 WebRTC signaling server running on port ${PORT}`);
});
