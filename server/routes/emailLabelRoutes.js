const express = require("express");

const {
  addLabelToEmail,
  removeLabelFromEmail,
  getEmailLabels,
  getEmailsForLabel,
} = require("../controllers/emailLabelController");

const router = express.Router();

/*
  Auth (protect) aur actingAs server.js me mount par lagte hain:
  app.use("/api/email-labels", protect, actingAs, emailLabelRoutes)
*/

/* GET ALL LABELS OF ONE EMAIL */
router.get("/email/:emailId", getEmailLabels);

/* GET ALL EMAIL IDS FOR ONE LABEL */
router.get("/label/:labelId", getEmailsForLabel);

/* ADD LABEL TO EMAIL */
router.post("/:emailId/:labelId", addLabelToEmail);

/* REMOVE LABEL FROM EMAIL */
router.delete("/:emailId/:labelId", removeLabelFromEmail);

module.exports = router;