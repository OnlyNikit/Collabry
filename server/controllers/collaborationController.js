    const Collaboration = require(
    "../models/Collaboration"
    );

    const asyncHandler = require(
    "../utils/asyncHandler"
    );

    const ApiError = require(
    "../utils/apiError"
    );


    /* =========================================================
    GET ALL COLLABORATIONS
    ========================================================= */

    const getCollaborations =
    asyncHandler(
        async (req, res) => {

        const collaborations =
            await Collaboration.find({
            user: req.user._id,
            })
            .sort({
                createdAt: -1,
            })
            .lean();


        res.status(200).json({
            success: true,
            count:
            collaborations.length,
            data: {
            collaborations,
            },
        });

        }
    );


    /* =========================================================
    GET SINGLE COLLABORATION
    ========================================================= */

    const getCollaborationById =
    asyncHandler(
        async (req, res) => {

        const collaboration =
            await Collaboration.findOne({
            _id: req.params.id,
            user: req.user._id,
            }).lean();


        if (!collaboration) {
            throw new ApiError(
            404,
            "Collaboration not found"
            );
        }


        res.status(200).json({
            success: true,
            data: {
            collaboration,
            },
        });

        }
    );


    /* =========================================================
    CREATE COLLABORATION
    ========================================================= */

    const createCollaboration =
    asyncHandler(
        async (req, res) => {

        const {
            brandName,
            contactName,
            title,
            status,
            priority,
            editor,
            platform,
            amount,
            currency,
            paymentStatus,
            deadline,
            notes,
        } = req.body;


        if (
            !brandName ||
            !title
        ) {
            throw new ApiError(
            400,
            "Brand name and collaboration title are required"
            );
        }


        const collaboration =
            await Collaboration.create({
            user: req.user._id,

            brandName,
            contactName,
            title,
            status,
            priority,
            editor,
            platform,

            amount:
                Number(amount) || 0,

            currency,
            paymentStatus,

            deadline:
                deadline || null,

            notes,
            });


        res.status(201).json({
            success: true,
            message:
            "Collaboration created successfully",
            data: {
            collaboration,
            },
        });

        }
    );


    /* =========================================================
    UPDATE COLLABORATION
    ========================================================= */

    const updateCollaboration =
    asyncHandler(
        async (req, res) => {

        const collaboration =
            await Collaboration.findOne({
            _id: req.params.id,
            user: req.user._id,
            });


        if (!collaboration) {
            throw new ApiError(
            404,
            "Collaboration not found"
            );
        }


        const allowedFields = [
            "brandName",
            "contactName",
            "title",
            "status",
            "priority",
            "editor",
            "platform",
            "amount",
            "currency",
            "paymentStatus",
            "deadline",
            "notes",
        ];


        allowedFields.forEach(
            (field) => {

            if (
                Object.prototype.hasOwnProperty.call(
                req.body,
                field
                )
            ) {

                collaboration[field] =
                req.body[field];

            }

            }
        );


        if (
            Object.prototype.hasOwnProperty.call(
            req.body,
            "amount"
            )
        ) {

            collaboration.amount =
            Number(req.body.amount) || 0;

        }


        if (
            Object.prototype.hasOwnProperty.call(
            req.body,
            "deadline"
            )
        ) {

            collaboration.deadline =
            req.body.deadline ||
            null;

        }


        await collaboration.save();


        res.status(200).json({
            success: true,
            message:
            "Collaboration updated successfully",
            data: {
            collaboration,
            },
        });

        }
    );


    /* =========================================================
    DELETE COLLABORATION
    ========================================================= */

    const deleteCollaboration =
    asyncHandler(
        async (req, res) => {

        const collaboration =
            await Collaboration.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id,
            });


        if (!collaboration) {
            throw new ApiError(
            404,
            "Collaboration not found"
            );
        }


        res.status(200).json({
            success: true,
            message:
            "Collaboration deleted successfully",
        });

        }
    );


    module.exports = {
    getCollaborations,
    getCollaborationById,
    createCollaboration,
    updateCollaboration,
    deleteCollaboration,
    };