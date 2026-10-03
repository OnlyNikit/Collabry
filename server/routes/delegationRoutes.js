const express = require("express");
const { protect } = require("../middleware/authMiddleware"); // adjust to your auth middleware
const {
  invite,
  listGiven,
  listReceived,
  accept,
  decline,
  updatePermissions,
  revoke,
  logs,
} = require("../controllers/delegationController");

const router = express.Router();

// Delegation management always acts as the logged-in user.
// Do NOT put actingAs middleware here.
router.use(protect);

router.post("/", invite);
router.get("/given", listGiven);
router.get("/received", listReceived);
router.patch("/:id/accept", accept);
router.patch("/:id/decline", decline);
router.patch("/:id/permissions", updatePermissions);
router.get("/:id/logs", logs);
router.delete("/:id", revoke);

module.exports = router;