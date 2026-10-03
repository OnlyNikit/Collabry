const ShareLink = require("../models/ShareLink");

const NAMESPACE = "/shared";
const TOKEN_LENGTH = 48; // randomBytes(24).toString("hex")

let ioInstance = null;

const roomName = (token) => `share:${token}`;

/* server.js me ek baar call karo */
function initShareSocket(io) {
  ioInstance = io;

  io.of(NAMESPACE).on("connection", (socket) => {
    socket.on("join", async (token, ack) => {
      try {
        if (typeof token !== "string" || token.length !== TOKEN_LENGTH) {
          return ack?.({ ok: false });
        }

        const link = await ShareLink.findOne({ token, isActive: true })
          .select("_id")
          .lean();

        if (!link) {
          return ack?.({ ok: false });
        }

        socket.join(roomName(token));
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false });
      }
    });
  });
}

/* data change hone par call hota hai */
async function emitShareUpdate(userId, type) {
  if (!ioInstance) return;

  try {
    const link = await ShareLink.findOne({
      user: userId,
      type,
      isActive: true,
    })
      .select("token")
      .lean();

    if (link) {
      ioInstance.of(NAMESPACE).to(roomName(link.token)).emit("share:refresh");
    }
  } catch (error) {
    console.error("Share emit failed:", error.message);
  }
}

/* link revoke / regenerate hone par purane viewers ko batao */
function emitShareRevoked(token) {
  if (!ioInstance || !token) return;

  ioInstance.of(NAMESPACE).to(roomName(token)).emit("share:revoked");
}

module.exports = { initShareSocket, emitShareUpdate, emitShareRevoked };