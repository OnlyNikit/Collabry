const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const {
  getShareLink,
  getOrCreateShareLink,
  regenerateShareLink,
  revokeShareLink,
  getSharedData,
} = require("../controllers/shareController");

/* ---------- PRIVATE (login required) ---------- */

const privateRouter = express.Router();

privateRouter.use(protect);

privateRouter.get("/:type", getShareLink);
privateRouter.post("/:type", getOrCreateShareLink);
privateRouter.patch("/:type/regenerate", regenerateShareLink);
privateRouter.delete("/:type", revokeShareLink);

/* ---------- PUBLIC ---------- */

const publicRouter = express.Router();

publicRouter.get("/:token", getSharedData);

module.exports = { privateRouter, publicRouter };