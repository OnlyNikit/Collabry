    const express = require("express");

    const {
    gmailPubSubWebhook,
    } = require(
    "../controllers/gmailWebhookController",
    );

    const router =
    express.Router();

    /*
    IMPORTANT:
    This route should NOT use your normal
    protect middleware because Google Pub/Sub
    won't have your application's JWT/cookie.
    */

    router.post(
    "/gmail",
    gmailPubSubWebhook,
    );

    module.exports = router;