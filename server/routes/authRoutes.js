const express = require("express");

const passport = require("passport");

const {
  googleAuthCallback,
  getCurrentUser,
  updateCurrentUser,
  logoutUser,
} = require("../controllers/authController");

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* =========================================================
   GOOGLE AUTH
========================================================= */

router.get(
  "/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",

      /*
       * Gmail read + modify
       *
       * Includes reading messages and modifying
       * message state where permitted.
       */
      "https://www.googleapis.com/auth/gmail.modify",

      /*
       * Send emails.
       */
      "https://www.googleapis.com/auth/gmail.send",

      /*
       * Create and manage drafts.
       */
      "https://www.googleapis.com/auth/gmail.compose",

      /*
       * Create and manage Gmail labels.
       */
      "https://www.googleapis.com/auth/gmail.labels",
    ],

    /*
     * Required for requesting a refresh token.
     */
    accessType: "offline",

    /*
     * Forces Google to show the consent screen.
     * Useful during development when scopes change.
     */
    prompt: "consent",

    session: false,
  })
);

/* =========================================================
   GOOGLE CALLBACK
========================================================= */

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,

    failureRedirect:
      `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
  }),

  googleAuthCallback
);

/* =========================================================
   GET CURRENT USER
========================================================= */

router.get(
  "/me",
  protect,
  getCurrentUser
);

/* =========================================================
   UPDATE CURRENT USER
========================================================= */

router.put(
  "/me",
  protect,
  updateCurrentUser
);

/* =========================================================
   LOGOUT
========================================================= */

router.post(
  "/logout",
  protect,
  logoutUser
);

module.exports = router;