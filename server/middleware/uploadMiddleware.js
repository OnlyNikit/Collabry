const multer = require("multer");
const ApiError = require("../utils/apiError");

const MAX_FILE_BYTES = 20 * 1024 * 1024; // per file
const MAX_FILES = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
});

/*
  multer ke errors ko ApiError mein badalta hai, taaki
  aapka error handler unhe normal tareeke se bheje.
  JSON (non-multipart) requests ko multer bas skip kar deta hai,
  isliye purana flow bina attachments ke bhi chalta rahega.
*/
const uploadAttachments = (req, res, next) => {
  upload.array("attachments", MAX_FILES)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Each attachment must be 20 MB or smaller"
          : err.code === "LIMIT_FILE_COUNT" ||
              err.code === "LIMIT_UNEXPECTED_FILE"
            ? `You can attach at most ${MAX_FILES} files`
            : err.message;

      return next(new ApiError(400, message));
    }

    return next(err);
  });
};

module.exports = { uploadAttachments };