const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Auth on connection — client sends token in handshake, we join a
  // per-user room so features can emit to `userId` without tracking sockets.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.on("disconnect", () => {});
  });

  return io;
}

// Emit an event to all of a user's connected devices/tabs (multi-device sync).
function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function getIO() {
  if (!io) throw new Error("Sockets not initialized — call initSockets first");
  return io;
}

module.exports = { initSockets, emitToUser, getIO };
