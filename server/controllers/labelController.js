const Label = require("../models/Label");

const ensureDefaultLabels = require("../utils/ensureDefaultLabels");

/* =========================================================
   MAILBOX OWNER (delegation support)

   actingAs middleware req.mailboxOwnerId set karta hai:
   - normal mode    -> logged-in user
   - delegated mode -> owner jiski mailbox khuli hai

   Labels hamesha OWNER ke naam par bante / padhe jate hain.
========================================================= */

const ownerOf = (req) => req.mailboxOwnerId || req.user._id;

/* Label name regex me use hota hai: special characters escape karo
   (warna "C++" ya "(work" jaise naam se query toot jati hai) */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ========================================
   CREATE LABEL
======================================== */

const createLabel = async (req, res) => {
  try {
    const owner = ownerOf(req);

    /* Default labels owner ke liye maujood hon */
    await ensureDefaultLabels(owner);

    const { name, description, color, icon } = req.body;

    const trimmedName = name?.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Label name is required.",
      });
    }

    /* CHECK DUPLICATE */
    const existingLabel = await Label.findOne({
      user: owner,
      name: {
        $regex: `^${escapeRegex(trimmedName)}$`,
        $options: "i",
      },
    });

    if (existingLabel) {
      return res.status(409).json({
        success: false,
        message: "A label with this name already exists.",
      });
    }

    /* CREATE */
    const label = await Label.create({
      user: owner,
      name: trimmedName,
      description: description?.trim() || "",
      color: color || "pink",
      icon: icon || "🏷️",
    });

    return res.status(201).json({
      success: true,
      message: "Label created successfully.",
      label,
    });
  } catch (error) {
    console.error("Create label error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A label with this name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create label.",
    });
  }
};

/* ========================================
   GET ALL LABELS
======================================== */

const getLabels = async (req, res) => {
  try {
    const owner = ownerOf(req);

    /* Missing default labels bana do */
    await ensureDefaultLabels(owner);

    const labels = await Label.find({
      user: owner,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: labels.length,
      labels,
    });
  } catch (error) {
    console.error("Get labels error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch labels.",
    });
  }
};

/* ========================================
   GET SINGLE LABEL
======================================== */

const getLabelById = async (req, res) => {
  try {
    const owner = ownerOf(req);

    await ensureDefaultLabels(owner);

    const { id } = req.params;

    const label = await Label.findOne({
      _id: id,
      user: owner,
    }).lean();

    if (!label) {
      return res.status(404).json({
        success: false,
        message: "Label not found.",
      });
    }

    return res.status(200).json({
      success: true,
      label,
    });
  } catch (error) {
    console.error("Get label error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid label ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch label.",
    });
  }
};

/* ========================================
   UPDATE LABEL
======================================== */

const updateLabel = async (req, res) => {
  try {
    const owner = ownerOf(req);

    await ensureDefaultLabels(owner);

    const { id } = req.params;

    const { name, description, color, icon } = req.body;

    /* FIND LABEL (sirf owner ka label) */
    const label = await Label.findOne({
      _id: id,
      user: owner,
    });

    if (!label) {
      return res.status(404).json({
        success: false,
        message: "Label not found.",
      });
    }

    /* UPDATE NAME */
    if (name !== undefined) {
      const trimmedName = name?.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Label name cannot be empty.",
        });
      }

      /* Duplicate check (current label ko chhod ke) */
      const duplicateLabel = await Label.findOne({
        user: owner,
        _id: {
          $ne: label._id,
        },
        name: {
          $regex: `^${escapeRegex(trimmedName)}$`,
          $options: "i",
        },
      });

      if (duplicateLabel) {
        return res.status(409).json({
          success: false,
          message: "A label with this name already exists.",
        });
      }

      label.name = trimmedName;
    }

    /* UPDATE DESCRIPTION */
    if (description !== undefined) {
      label.description = description?.trim() || "";
    }

    /* UPDATE COLOR */
    if (color !== undefined) {
      label.color = color || "pink";
    }

    /* UPDATE ICON */
    if (icon !== undefined) {
      label.icon = icon || "🏷️";
    }

    await label.save();

    return res.status(200).json({
      success: true,
      message: "Label updated successfully.",
      label,
    });
  } catch (error) {
    console.error("Update label error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid label ID.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A label with this name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update label.",
    });
  }
};

/* ========================================
   DELETE LABEL
======================================== */

const deleteLabel = async (req, res) => {
  try {
    const owner = ownerOf(req);

    const { id } = req.params;

    /*
    NOTE: abhi default labels bhi delete ho sakte hain.
    Unhe permanent banana ho to schema me `isDefault` field chahiye.
    */
    const label = await Label.findOneAndDelete({
      _id: id,
      user: owner,
    });

    if (!label) {
      return res.status(404).json({
        success: false,
        message: "Label not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Label deleted successfully.",
      deletedLabelId: id,
    });
  } catch (error) {
    console.error("Delete label error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid label ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete label.",
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