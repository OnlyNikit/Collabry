const asyncHandler = require(
  "../utils/asyncHandler"
);

const ApiError = require(
  "../utils/apiError"
);

const User = require(
  "../models/User"
);

const generateToken = require(
  "../utils/generateToken"
);

const {
  initializeGmailSync,
} = require(
  "../services/gmailSyncService"
);

/* =========================================================
   COOKIE OPTIONS
========================================================= */

const getCookieOptions = () => {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,

    secure: isProduction,

    sameSite:
      isProduction
        ? "none"
        : "lax",

    maxAge:
      7 * 24 * 60 * 60 * 1000,
  };
};

/* =========================================================
   GOOGLE AUTH SUCCESS
========================================================= */

const googleAuthCallback = asyncHandler(
  async (req, res) => {
    if (!req.user) {
      throw new ApiError(
        401,
        "Google authentication failed"
      );
    }

    const token = generateToken(
      req.user._id
    );

    res.cookie(
      "token",
      token,
      getCookieOptions()
    );

    /*
      -------------------------------------------------------
      GMAIL WATCH + INITIAL SYNC
      -------------------------------------------------------

      Fire-and-forget: registers the Gmail watch()
      with Pub/Sub and runs the initial full sync.

      We do NOT await this - fullSync() fetches up to
      50 messages and can take a few seconds. The user
      should not be blocked on that before redirecting
      to the dashboard.

      Any failure here is logged, not thrown - a failed
      Gmail sync init should never break the login flow.
    */

    initializeGmailSync(
      req.user._id
    ).catch((error) => {
      console.error(
        `[GMAIL SYNC INIT] Failed for user ${req.user._id}:`,
        error
      );
    });

    return res.redirect(
      `${process.env.CLIENT_URL}/dashboard`
    );
  }
);

/* =========================================================
   GET CURRENT USER
========================================================= */

const getCurrentUser = asyncHandler(
  async (req, res) => {
    const user = await User.findById(
      req.user._id
    ).select("-__v");

    if (!user) {
      throw new ApiError(
        404,
        "User not found"
      );
    }

    return res.status(200).json({
      success: true,

      data: {
        user,
      },
    });
  }
);

/* =========================================================
   UPDATE CURRENT USER
========================================================= */

const updateCurrentUser = asyncHandler(
  async (req, res) => {
    const {
      name,
      username,
      phone,
      bio,
    } = req.body;

    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      throw new ApiError(
        404,
        "User not found"
      );
    }

    /* ===============================
       NAME
    =============================== */

    if (name !== undefined) {
      const trimmedName =
        String(name).trim();

      if (!trimmedName) {
        throw new ApiError(
          400,
          "Name cannot be empty"
        );
      }

      user.name = trimmedName;
    }

    /* ===============================
       USERNAME
    =============================== */

    if (username !== undefined) {
      const trimmedUsername =
        String(username)
          .trim()
          .toLowerCase();

      if (trimmedUsername) {
        const existingUser =
          await User.findOne({
            username: trimmedUsername,
            _id: {
              $ne: user._id,
            },
          });

        if (existingUser) {
          throw new ApiError(
            400,
            "Username is already taken"
          );
        }

        user.username =
          trimmedUsername;
      } else {
        user.username = null;
      }
    }

    /* ===============================
       PHONE
    =============================== */

    if (phone !== undefined) {
      user.phone =
        String(phone).trim();
    }

    /* ===============================
       BIO
    =============================== */

    if (bio !== undefined) {
      user.bio =
        String(bio).trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,

      message:
        "Profile updated successfully",

      data: {
        user,
      },
    });
  }
);

/* =========================================================
   LOGOUT
========================================================= */

const logoutUser = asyncHandler(
  async (req, res) => {
    res.clearCookie(
      "token",
      getCookieOptions()
    );

    return res.status(200).json({
      success: true,

      message:
        "Logged out successfully",
    });
  }
);

module.exports = {
  googleAuthCallback,

  getCurrentUser,

  updateCurrentUser,

  logoutUser,
};