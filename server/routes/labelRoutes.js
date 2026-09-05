const express = require("express");

const {
  createLabel,
  getLabels,
  getLabelById,
  updateLabel,
  deleteLabel,
} = require(
  "../controllers/labelController"
);

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* ========================================
   ALL LABEL ROUTES REQUIRE LOGIN
======================================== */

router.use(protect);

/* ========================================
   CREATE LABEL

   POST /api/labels
======================================== */

router.post(
  "/",
  createLabel
);

/* ========================================
   GET ALL USER LABELS

   GET /api/labels
======================================== */

router.get(
  "/",
  getLabels
);

/* ========================================
   GET SINGLE LABEL

   GET /api/labels/:id
======================================== */

router.get(
  "/:id",
  getLabelById
);

/* ========================================
   UPDATE LABEL

   PATCH /api/labels/:id
======================================== */

router.patch(
  "/:id",
  updateLabel
);

/* ========================================
   DELETE LABEL

   DELETE /api/labels/:id
======================================== */

router.delete(
  "/:id",
  deleteLabel
);

module.exports = router;