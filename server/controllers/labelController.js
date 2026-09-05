const Label = require(
  "../models/Label"
);

const ensureDefaultLabels = require(
  "../utils/ensureDefaultLabels"
);

/* ========================================
   CREATE LABEL
======================================== */

const createLabel = async (
  req,
  res
) => {
  try {
    /*
    Ensure default labels exist
    for this user.
    */

    await ensureDefaultLabels(
      req.user._id
    );

    const {
      name,
      description,
      color,
      icon,
    } = req.body;

    /* ========================================
       VALIDATION
    ======================================== */

    const trimmedName =
      name?.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message:
          "Label name is required.",
      });
    }

    /* ========================================
       CHECK DUPLICATE
    ======================================== */

    const existingLabel =
      await Label.findOne({
        user: req.user._id,

        name: {
          $regex: `^${trimmedName}$`,
          $options: "i",
        },
      });

    if (existingLabel) {
      return res.status(409).json({
        success: false,
        message:
          "A label with this name already exists.",
      });
    }

    /* ========================================
       CREATE
    ======================================== */

    const label =
      await Label.create({
        user:
          req.user._id,

        name:
          trimmedName,

        description:
          description?.trim() ||
          "",

        color:
          color || "pink",

        icon:
          icon || "🏷️",
      });

    return res.status(201).json({
      success: true,

      message:
        "Label created successfully.",

      label,
    });
  } catch (error) {
    console.error(
      "Create label error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A label with this name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create label.",
    });
  }
};

/* ========================================
   GET ALL LABELS
======================================== */

const getLabels = async (
  req,
  res
) => {
  try {
    /*
    =========================================
    ENSURE DEFAULT LABELS

    If user does not have default labels,
    create only the missing ones.
    =========================================
    */

    await ensureDefaultLabels(
      req.user._id
    );

    /* ========================================
       FETCH LABELS
    ======================================== */

    const labels =
      await Label.find({
        user:
          req.user._id,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,

      count:
        labels.length,

      labels,
    });
  } catch (error) {
    console.error(
      "Get labels error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch labels.",
    });
  }
};

/* ========================================
   GET SINGLE LABEL
======================================== */

const getLabelById = async (
  req,
  res
) => {
  try {
    /*
    Ensure defaults exist.
    */

    await ensureDefaultLabels(
      req.user._id
    );

    const {
      id,
    } = req.params;

    const label =
      await Label.findOne({
        _id: id,

        user:
          req.user._id,
      }).lean();

    if (!label) {
      return res.status(404).json({
        success: false,
        message:
          "Label not found.",
      });
    }

    return res.status(200).json({
      success: true,
      label,
    });
  } catch (error) {
    console.error(
      "Get label error:",
      error
    );

    /*
    Invalid MongoDB ObjectId.
    */

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid label ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch label.",
    });
  }
};

/* ========================================
   UPDATE LABEL
======================================== */

const updateLabel = async (
  req,
  res
) => {
  try {
    /*
    Ensure defaults exist.
    */

    await ensureDefaultLabels(
      req.user._id
    );

    const {
      id,
    } = req.params;

    const {
      name,
      description,
      color,
      icon,
    } = req.body;

    /* ========================================
       FIND LABEL

       Only owner can update it.
    ======================================== */

    const label =
      await Label.findOne({
        _id: id,

        user:
          req.user._id,
      });

    if (!label) {
      return res.status(404).json({
        success: false,
        message:
          "Label not found.",
      });
    }

    /* ========================================
       UPDATE NAME
    ======================================== */

    if (
      name !== undefined
    ) {
      const trimmedName =
        name?.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message:
            "Label name cannot be empty.",
        });
      }

      /*
      Check duplicate.

      Exclude current label.
      */

      const duplicateLabel =
        await Label.findOne({
          user:
            req.user._id,

          _id: {
            $ne:
              label._id,
          },

          name: {
            $regex:
              `^${trimmedName}$`,

            $options:
              "i",
          },
        });

      if (duplicateLabel) {
        return res.status(409).json({
          success: false,
          message:
            "A label with this name already exists.",
        });
      }

      label.name =
        trimmedName;
    }

    /* ========================================
       UPDATE DESCRIPTION
    ======================================== */

    if (
      description !== undefined
    ) {
      label.description =
        description?.trim() ||
        "";
    }

    /* ========================================
       UPDATE COLOR
    ======================================== */

    if (
      color !== undefined
    ) {
      label.color =
        color || "pink";
    }

    /* ========================================
       UPDATE ICON
    ======================================== */

    if (
      icon !== undefined
    ) {
      label.icon =
        icon || "🏷️";
    }

    /* ========================================
       SAVE
    ======================================== */

    await label.save();

    return res.status(200).json({
      success: true,

      message:
        "Label updated successfully.",

      label,
    });
  } catch (error) {
    console.error(
      "Update label error:",
      error
    );

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid label ID.",
      });
    }

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A label with this name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update label.",
    });
  }
};

/* ========================================
   DELETE LABEL
======================================== */

const deleteLabel = async (
  req,
  res
) => {
  try {
    const {
      id,
    } = req.params;

    /*
    IMPORTANT:

    Currently default labels can also
    be deleted.

    If you want default labels to be
    permanent / undeletable, we need
    an `isDefault` field in schema.
    */

    const label =
      await Label.findOneAndDelete({
        _id: id,

        user:
          req.user._id,
      });

    if (!label) {
      return res.status(404).json({
        success: false,
        message:
          "Label not found.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Label deleted successfully.",

      deletedLabelId:
        id,
    });
  } catch (error) {
    console.error(
      "Delete label error:",
      error
    );

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid label ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete label.",
    });
  }
};

/* ========================================
   EXPORTS
======================================== */

module.exports = {
  createLabel,
  getLabels,
  getLabelById,
  updateLabel,
  deleteLabel,
};