let io;

module.exports = {
  init: (server) => {
    const { Server } = require("socket.io");
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    
    io.on("connection", (socket) => {
      console.log(`[Socket] Admin/User connected: ${socket.id}`);
      
      socket.on("disconnect", () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
      });
    });

    return io;
  },
  getIO: () => {
    return io;
  },
};
