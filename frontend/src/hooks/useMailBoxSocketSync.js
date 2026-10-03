import { getActingOwnerId } from "../context/MailboxContext";

/*
  Keeps ONE socket.io client socket in the right realtime room.

  - own mailbox       -> the server keeps this socket in your own room
  - delegated mailbox -> the server moves this socket into the OWNER's room,
                         so new mail / sent mail / updates for that inbox
                         reach you live

  Use it on the socket that feeds the mailbox data (EmailContext).
  Do NOT use it on the notifications socket: notifications stay yours.

  Usage, right after the socket is created inside a useEffect:

    const detachMailboxSync = attachMailboxRoomSync(socket, refreshShared);

    return () => {
      detachMailboxSync();
      socket.disconnect();
    };

  onAccessLost is called when the server says access was removed
  (pass `refreshShared` from useMailbox(); it switches back to your own inbox).
*/
export default function attachMailboxRoomSync(socket, onAccessLost) {
  if (!socket) {
    return () => {};
  }

  const sync = () => {
    const ownerId = getActingOwnerId();

    socket.emit("mailbox:watch", { ownerId }, (result) => {
      if (ownerId && result && result.ok === false) {
        onAccessLost?.();
      }
    });
  };

  // Runs now if already connected, and again after every reconnect
  // (a fresh connection always starts in the user's own room).
  if (socket.connected) {
    sync();
  }

  socket.on("connect", sync);

  // Owner removed access while this tab was open
  const handleRevoked = () => onAccessLost?.();

  socket.on("mailbox:revoked", handleRevoked);

  return () => {
    socket.off("connect", sync);
    socket.off("mailbox:revoked", handleRevoked);
  };
}