require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

const emailRoutes = require("./routes/emailRoutes");

const labelRoutes = require("./routes/labelRoutes");

const emailLabelRoutes = require("./routes/emailLabelRoutes");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const collaborationRoutes = require("./routes/collaborationRoutes");
const trackerRoutes = require("./routes/trackerRoutes");

/* ========================================
   REGISTER PASSPORT STRATEGIES
======================================== */

require("./config/google");

const app = express();

/* ========================================
   MIDDLEWARE
======================================== */

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(cookieParser());

/* ========================================
   PASSPORT
======================================== */

app.use(passport.initialize());

/* ========================================
   HEALTH CHECK
======================================== */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Collabry API is running",
    environment: process.env.NODE_ENV || "development",
  });
});

/* ========================================
   REQUEST LOGGER
======================================== */

app.use((req, res, next) => {
  console.log(
    `[REQUEST] ${req.method} ${req.originalUrl} | Referer: ${req.headers.referer || "none"} | UA: ${req.headers["user-agent"] || "none"}`,
  );
  next();
});

/* ========================================
   ROUTES
======================================== */

app.use("/api/auth", authRoutes);

app.use("/api/emails", emailRoutes);

app.use("/api/labels", labelRoutes);

app.use("/api/email-labels", emailLabelRoutes);
app.use("/api/collaborations", collaborationRoutes);
app.use("/api/trackers", trackerRoutes);

/* ========================================
   ERROR HANDLING
======================================== */

app.use(notFound);

app.use(errorHandler);

/* ========================================
   START SERVER
======================================== */

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    /* =====================================
       CONNECT DATABASE FIRST
    ===================================== */

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);

    process.exit(1);
  }
};

startServer();
