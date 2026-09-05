const passport = require("passport");

const GoogleStrategy =
require("passport-google-oauth20").Strategy;

const User =
require("../models/User");

/* =========================================================
GOOGLE PASSPORT STRATEGY
========================================================= */

passport.use(
new GoogleStrategy(
{
clientID:
process.env.GOOGLE_CLIENT_ID,


  clientSecret:
    process.env.GOOGLE_CLIENT_SECRET,

  callbackURL:
    process.env.GOOGLE_CALLBACK_URL,
},

async (
  accessToken,
  refreshToken,
  profile,
  done
) => {
  try {
    /* ========================================
       GET GOOGLE EMAIL
    ======================================== */

    const email =
      profile.emails?.[0]?.value;

    if (!email) {
      return done(
        new Error(
          "Google account email not found"
        ),
        null
      );
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    /* ========================================
       FIND USER

       Include token fields because
       they use select: false.
    ======================================== */

    let user =
      await User.findOne({
        googleId:
          profile.id,
      }).select(
        "+googleAccessToken " +
        "+googleRefreshToken " +
        "+googleTokenExpiry"
      );

    /*
      Fallback:
      Find by email when the Google
      account is not linked yet.
    */

    if (!user) {
      user =
        await User.findOne({
          email:
            normalizedEmail,
        }).select(
          "+googleAccessToken " +
          "+googleRefreshToken " +
          "+googleTokenExpiry"
        );
    }

    /* ========================================
       CREATE NEW USER
    ======================================== */

    if (!user) {
      user =
        await User.create({
          googleId:
            profile.id,

          name:
            profile.displayName ||
            "Collabry User",

          email:
            normalizedEmail,

          profilePicture:
            profile.photos?.[0]?.value ||
            null,

          googleAccessToken:
            accessToken ||
            null,

          /*
            Requires accessType: "offline"
            in the Google OAuth route.
          */

          googleRefreshToken:
            refreshToken ||
            null,

          lastLogin:
            new Date(),
        });
    }

    /* ========================================
       UPDATE EXISTING USER
    ======================================== */

    else {
      /*
        Link Google account.
      */

      user.googleId =
        profile.id;

      /*
        Update basic profile data
        only when Google provides it.
      */

      if (
        profile.displayName
      ) {
        user.name =
          profile.displayName;
      }

      if (
        profile.photos?.[0]?.value
      ) {
        user.profilePicture =
          profile.photos[0].value;
      }

      /*
        Always update access token.
      */

      if (accessToken) {
        user.googleAccessToken =
          accessToken;
      }

      /*
        Never overwrite an existing
        refresh token with null.

        Google often returns a refresh
        token only during initial consent.
      */

      if (refreshToken) {
        user.googleRefreshToken =
          refreshToken;
      }

      user.lastLogin =
        new Date();

      await user.save();
    }

    /* ========================================
       REFRESH TOKEN VALIDATION
    ======================================== */

    /*
      Gmail features require a refresh
      token for long-term access.
    */

    if (
      !user.googleRefreshToken
    ) {
      console.warn(
        `No Google refresh token for user ${user._id}. ` +
        "User may need to reconnect their Google account."
      );
    }

    /* ========================================
       SUCCESS
    ======================================== */

    return done(
      null,
      user
    );

  } catch (error) {
    return done(
      error,
      null
    );
  }
}


)
);

module.exports =
passport;
