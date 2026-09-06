require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");
const labelRoutes = require("./routes/labelRoutes");
const emailLabelRoutes = require("./routes/emailLabelRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const collaborationRoutes = require("./routes/collaborationRoutes");
const trackerRoutes = require("./routes/trackerRoutes");
const webhookRoutes = require("./routes/gmailWebhookRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

require("./config/google");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Collabry API is running",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use((req, res, next) => {
  console.log(
    `[REQUEST] ${req.method} ${req.originalUrl} | Referer: ${
      req.headers.referer || "none"
    } | UA: ${req.headers["user-agent"] || "none"}`,
  );

  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/email-labels", emailLabelRoutes);
app.use("/api/collaborations", collaborationRoutes);
app.use("/api/trackers", trackerRoutes);
/* ========================================================= NOTIFICATION ROUTES ========================================================= */
app.use("/api/notifications", notificationRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use(notFound);
app.use(errorHandler);

/* =========================================================
   SOCKET.IO COOKIE PARSER
========================================================= */

const parseCookieHeader = (cookieHeader = "") => {
  const cookies = {};

  cookieHeader.split(";").forEach((part) => {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (!key) {
      return;
    }

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });

  return cookies;
};

/* =========================================================
   SOCKET.IO TOKEN EXTRACTION

   Supports:
   1. socket.handshake.auth.token
   2. token cookie
   3. jwt cookie
   4. accessToken cookie
   5. collabry_token cookie
========================================================= */

const extractSocketToken = (socket) => {
  const handshakeToken = socket.handshake.auth?.token;

  if (handshakeToken) {
    return handshakeToken;
  }

  const cookies = parseCookieHeader(socket.handshake.headers?.cookie || "");

  const cookieNames = ["token", "jwt", "accessToken", "collabry_token"];

  for (const name of cookieNames) {
    if (cookies[name]) {
      return cookies[name];
    }
  }

  return null;
};

/* =========================================================
   JWT USER ID EXTRACTION

   Supports common JWT payload structures.
========================================================= */

const extractUserIdFromJwt = (decoded) => {
  if (!decoded || typeof decoded !== "object") {
    return null;
  }

  return (
    decoded.id ||
    decoded.userId ||
    decoded._id ||
    decoded.user?.id ||
    decoded.user?._id ||
    null
  );
};

/* =========================================================
   SOCKET.IO SETUP
========================================================= */

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

global.io = io;

/* =========================================================
   SOCKET.IO AUTHENTICATION

   The client cannot choose another user's room.

   We verify the JWT and derive the user ID from the token.
========================================================= */

io.use((socket, next) => {
  try {
    const token = extractSocketToken(socket);

    if (!token) {
      return next(new Error("Authentication required"));
    }

    if (!process.env.JWT_SECRET) {
      console.error("[SOCKET] JWT_SECRET is not configured");

      return next(new Error("Server authentication is not configured"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = extractUserIdFromJwt(decoded);

    if (!userId) {
      return next(new Error("Invalid authentication token"));
    }

    socket.userId = String(userId);

    return next();
  } catch (error) {
    console.error("[SOCKET] Authentication failed:", error?.message || error);

    return next(new Error("Authentication failed"));
  }
});

/* =========================================================
   SOCKET.IO CONNECTION
========================================================= */

io.on("connection", (socket) => {
  const userId = socket.userId;

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  const room = `user:${userId}`;

  socket.join(room);

  console.log(`[SOCKET] User connected ${socket.id} -> ${room}`);

  socket.on("disconnect", (reason) => {
    console.log(
      `[SOCKET] User disconnected ${socket.id} -> ${room} | ${reason}`,
    );
  });
});

/* =========================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("Socket.IO realtime server enabled");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);

    process.exit(1);
  }
};

startServer();
