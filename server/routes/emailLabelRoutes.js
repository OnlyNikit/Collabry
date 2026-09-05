const express = require("express");

const {
  addLabelToEmail,
  removeLabelFromEmail,
  getEmailLabels,
  getEmailsForLabel,
} = require(
  "../controllers/emailLabelController"
);

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* =========================================================
   ALL ROUTES REQUIRE LOGIN
========================================================= */

router.use(protect);

/* =========================================================
   GET ALL LABELS OF ONE EMAIL
========================================================= */

router.get(
  "/email/:emailId",
  getEmailLabels
);

/* =========================================================
   GET ALL EMAIL IDS FOR ONE LABEL
========================================================= */

router.get(
  "/label/:labelId",
  getEmailsForLabel
);

/* =========================================================
   ADD LABEL TO EMAIL
========================================================= */

router.post(
  "/:emailId/:labelId",
  addLabelToEmail
);

/* =========================================================
   REMOVE LABEL FROM EMAIL
========================================================= */

router.delete(
  "/:emailId/:labelId",
  removeLabelFromEmail
);

module.exports = router;