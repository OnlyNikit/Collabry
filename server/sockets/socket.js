const { Server } = require("socket.io");

let io;

const initializeSocket = (
  server,
) => {
  io = new Server(
    server,
    {
      cors: {
        origin:
          process.env.FRONTEND_URL,
        credentials: true,
      },
    },
  );

  global.io = io;

  io.on(
    "connection",
    (socket) => {
      console.log(
        "Socket connected:",
        socket.id,
      );

      /*
        Frontend should send:
        authenticate
        {
          userId: "..."
        }
      */

      socket.on(
        "authenticate",
        ({
          userId,
        } = {}) => {
          if (!userId) {
            return;
          }

          socket.join(
            `user:${userId}`,
          );

          socket.emit(
            "socket:authenticated",
            {
              success: true,
            },
          );
        },
      );

      socket.on(
        "disconnect",
        () => {
          console.log(
            "Socket disconnected:",
            socket.id,
          );
        },
      );
    },
  );

  return io;
};

const getIO = () => {
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};