const express =
  require("express");


const {
  protect,
} = require(
  "../middleware/authMiddleware"
);


const {

  getTrackers,

  getTrackerById,

  createTracker,

  updateTracker,

  deleteTracker,

} = require(
  "../controllers/trackerController"
);


const router =
  express.Router();


/* =========================================================
   ALL ROUTES REQUIRE AUTH
========================================================= */

router.use(
  protect
);


/* =========================================================
   COLLECTION ROUTES
========================================================= */

router
  .route("/")

  .get(
    getTrackers
  )

  .post(
    createTracker
  );


/* =========================================================
   SINGLE TRACKER ROUTES
========================================================= */

router
  .route("/:id")

  .get(
    getTrackerById
  )

  .patch(
    updateTracker
  )

  .delete(
    deleteTracker
  );


module.exports =
  router;