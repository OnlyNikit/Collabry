const Tracker =
  require(
    "../models/tracker"
  );

const asyncHandler =
  require(
    "../utils/asyncHandler"
  );

const ApiError =
  require(
    "../utils/apiError"
  );


/* =========================================================
   GET ALL TRACKERS
========================================================= */

const getTrackers =
  asyncHandler(
    async (req, res) => {

      const trackers =
        await Tracker.find({
          user:
            req.user._id,
        })
          .sort({
            createdAt:
              -1,
          })
          .lean();


      res.status(200).json({
        success:
          true,

        count:
          trackers.length,

        data: {
          trackers,
        },
      });

    }
  );


/* =========================================================
   GET SINGLE TRACKER
========================================================= */

const getTrackerById =
  asyncHandler(
    async (req, res) => {

      const tracker =
        await Tracker.findOne({
          _id:
            req.params.id,

          user:
            req.user._id,
        })
          .lean();


      if (!tracker) {

        throw new ApiError(
          404,
          "Tracker not found"
        );

      }


      res.status(200).json({
        success:
          true,

        data: {
          tracker,
        },
      });

    }
  );


/* =========================================================
   CREATE TRACKER
========================================================= */

const createTracker =
  asyncHandler(
    async (req, res) => {

      const {

        brandName,

        contactName,

        email,

        collaborationTitle,

        status,

        priority,

        followUpDate,

        deadline,

        proposedAmount,

        currency,

        paymentStatus,

        notes,

        label,

        threadId,

      } =
        req.body;


      /* =====================================
         VALIDATION
      ===================================== */

      if (
        !brandName?.trim()
      ) {

        throw new ApiError(
          400,
          "Brand name is required"
        );

      }


      if (
        !collaborationTitle?.trim()
      ) {

        throw new ApiError(
          400,
          "Collaboration title is required"
        );

      }


      /* =====================================
         CREATE
      ===================================== */

      const tracker =
        await Tracker.create({

          user:
            req.user._id,

          brandName,

          contactName,

          email,

          collaborationTitle,

          status,

          priority,

          followUpDate:
            followUpDate ||
            null,

          deadline:
            deadline ||
            null,

          proposedAmount:
            Number(
              proposedAmount
            ) || 0,

          currency,

          paymentStatus,

          notes,

          label,

          threadId:
            threadId ||
            null,

        });


      res.status(201).json({

        success:
          true,

        message:
          "Tracker created successfully",

        data: {
          tracker,
        },

      });

    }
  );


/* =========================================================
   UPDATE TRACKER
========================================================= */

const updateTracker =
  asyncHandler(
    async (req, res) => {

      const tracker =
        await Tracker.findOne({

          _id:
            req.params.id,

          user:
            req.user._id,

        });


      if (!tracker) {

        throw new ApiError(
          404,
          "Tracker not found"
        );

      }


      const allowedFields = [

        "brandName",

        "contactName",

        "email",

        "collaborationTitle",

        "status",

        "priority",

        "followUpDate",

        "deadline",

        "proposedAmount",

        "currency",

        "paymentStatus",

        "notes",

        "label",

        "threadId",

      ];


      allowedFields.forEach(
        (
          field
        ) => {

          if (
            Object.prototype.hasOwnProperty.call(
              req.body,
              field
            )
          ) {

            tracker[field] =
              req.body[field];

          }

        }
      );


      /* =====================================
         NUMBER NORMALIZATION
      ===================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "proposedAmount"
        )
      ) {

        tracker.proposedAmount =
          Number(
            req.body.proposedAmount
          ) || 0;

      }


      /* =====================================
         DATE NORMALIZATION
      ===================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "followUpDate"
        )
      ) {

        tracker.followUpDate =
          req.body.followUpDate ||
          null;

      }


      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "deadline"
        )
      ) {

        tracker.deadline =
          req.body.deadline ||
          null;

      }


      await tracker.save();


      res.status(200).json({

        success:
          true,

        message:
          "Tracker updated successfully",

        data: {
          tracker,
        },

      });

    }
  );


/* =========================================================
   DELETE TRACKER
========================================================= */

const deleteTracker =
  asyncHandler(
    async (req, res) => {

      const tracker =
        await Tracker.findOneAndDelete({

          _id:
            req.params.id,

          user:
            req.user._id,

        });


      if (!tracker) {

        throw new ApiError(
          404,
          "Tracker not found"
        );

      }


      res.status(200).json({

        success:
          true,

        message:
          "Tracker deleted successfully",

      });

    }
  );


module.exports = {

  getTrackers,

  getTrackerById,

  createTracker,

  updateTracker,

  deleteTracker,

};