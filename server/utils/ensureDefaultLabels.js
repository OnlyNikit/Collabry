const Label = require(
  "../models/Label"
);

const DEFAULT_LABELS = require(
  "../constants/defaultLabels"
);

/* =========================================================
   ENSURE DEFAULT LABELS FOR USER
========================================================= */

const ensureDefaultLabels = async (
  userId
) => {
  if (!userId) {
    return;
  }

  /*
  Safety check.
  */

  if (
    !Array.isArray(DEFAULT_LABELS)
  ) {
    throw new Error(
      "DEFAULT_LABELS must be an array."
    );
  }

  /* =======================================================
     GET EXISTING LABELS
  ======================================================= */

  const existingLabels =
    await Label.find({
      user: userId,
    })
      .select("name")
      .lean();

  /* =======================================================
     CREATE SET OF EXISTING NAMES
  ======================================================= */

  const existingNames =
    new Set(
      existingLabels.map(
        (label) =>
          label.name
            .trim()
            .toLowerCase()
      )
    );

  /* =======================================================
     FIND MISSING DEFAULT LABELS
  ======================================================= */

  const missingLabels =
    DEFAULT_LABELS
      .filter(
        (defaultLabel) =>
          !existingNames.has(
            defaultLabel.name
              .trim()
              .toLowerCase()
          )
      )
      .map(
        (defaultLabel) => ({
          user: userId,

          name:
            defaultLabel.name,

          description:
            defaultLabel.description ||
            "",

          color:
            defaultLabel.color ||
            "pink",

          icon:
            defaultLabel.icon ||
            "🏷️",
        })
      );

  /* =======================================================
     INSERT ONLY MISSING LABELS
  ======================================================= */

  if (
    missingLabels.length === 0
  ) {
    return;
  }

  try {
    await Label.insertMany(
      missingLabels,
      {
        ordered: false,
      }
    );
  } catch (error) {
    /*
    Ignore duplicate race conditions.
    */

    if (
      error.code !== 11000
    ) {
      throw error;
    }
  }
};

module.exports =
  ensureDefaultLabels;