const ApiError = require(
  "../utils/apiError"
);

/* ========================================
   404 ROUTE HANDLER
======================================== */

const notFound = (req, res, next) => {
  const error = new ApiError(
    404,
    `Route not found: ${req.originalUrl}`
  );

  next(error);
};

/* ========================================
   GLOBAL ERROR HANDLER
======================================== */

const errorHandler = (
  error,
  req,
  res,
  next
) => {
  let statusCode =
    error.statusCode || 500;

  let message =
    error.message ||
    "Internal Server Error";

  /* ======================================
     MONGOOSE INVALID ID
  ====================================== */

  if (error.name === "CastError") {
    statusCode = 400;

    message = `Invalid ${error.path}`;
  }

  /* ======================================
     MONGOOSE DUPLICATE KEY
  ====================================== */

  if (error.code === 11000) {
    statusCode = 409;

    const field = Object.keys(
      error.keyValue
    )[0];

    message =
      `${field} already exists`;
  }

  /* ======================================
     MONGOOSE VALIDATION ERROR
  ====================================== */

  if (
    error.name === "ValidationError"
  ) {
    statusCode = 400;

    message = "Validation failed";
  }

  /* ======================================
     DEVELOPMENT LOG
  ====================================== */

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    console.error(
      "ERROR:",
      error
    );
  }

  /* ======================================
     RESPONSE
  ====================================== */

  res.status(statusCode).json({
    success: false,

    message,

    errors:
      error.errors || [],

    stack:
      process.env.NODE_ENV ===
      "production"
        ? undefined
        : error.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};