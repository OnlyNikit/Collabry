const ApiError = require("../utils/apiError");

/*
  Har user ko ghante mein limited AI requests.
  Isse koi galti se (ya jaan-bujh kar) API cost nahi badha sakta.
  Ye in-memory hai, single server ke liye theek hai.
  Multiple servers ho to Redis wala limiter use karna.
*/
const WINDOW_MS = 60 * 60 * 1000; // 1 ghanta
const MAX_REQUESTS = 30;

const hits = new Map();

/* Purani entries saaf karte raho */
setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of hits.entries()) {
    if (entry.resetAt <= now) {
      hits.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

const aiRateLimit = (req, res, next) => {
  const key = String(req.user?._id || req.ip);

  const now = Date.now();

  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return next(
      new ApiError(429, "AI limit reached. Please try again in a while."),
    );
  }

  entry.count += 1;

  return next();
};

module.exports = { aiRateLimit };