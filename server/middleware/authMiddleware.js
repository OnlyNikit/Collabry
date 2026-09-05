const jwt = require("jsonwebtoken");

const asyncHandler = require(
  "../utils/asyncHandler"
);

const ApiError = require(
  "../utils/apiError"
);

const User = require(
  "../models/User"
);

/* =========================================================
   PROTECT ROUTES
========================================================= */

const protect = asyncHandler(
  async (req, res, next) => {
    let token;

    /* =====================================
       GET TOKEN FROM COOKIE
    ===================================== */

    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    /* =====================================
       GET TOKEN FROM AUTHORIZATION HEADER
    ===================================== */

    if (
      !token &&
      req.headers.authorization?.startsWith(
        "Bearer "
      )
    ) {
      token =
        req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new ApiError(
        401,
        "Not authorized. Please login."
      );
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const user = await User.findById(
        decoded.userId
      ).select("-__v");

      if (!user) {
        throw new ApiError(
          401,
          "User no longer exists"
        );
      }

      req.user = user;

      next();
    } catch (error) {
      throw new ApiError(
        401,
        "Invalid or expired token"
      );
    }
  }
);

module.exports = {
  protect,
};