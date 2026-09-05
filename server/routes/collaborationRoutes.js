const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const {
  getCollaborations,
  getCollaborationById,
  createCollaboration,
  updateCollaboration,
  deleteCollaboration,
} = require("../controllers/collaborationController");

const router = express.Router();

/* =========================================================
    ALL ROUTES REQUIRE AUTHENTICATION
    ========================================================= */

router.use(protect);

/* =========================================================
    COLLECTION ROUTES
    ========================================================= */

router.route("/").get(getCollaborations).post(createCollaboration);

/* =========================================================
    SINGLE COLLABORATION ROUTES
    ========================================================= */

router
  .route("/:id")
  .get(getCollaborationById)
  .patch(updateCollaboration)
  .delete(deleteCollaboration);

module.exports = router;
