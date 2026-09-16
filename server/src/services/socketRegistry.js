// One home for the Socket.io server instance. Set once from sockets/events.js
// after the server is created; anything that needs to push to a client reads
// it from here rather than threading `io` down through call stacks.

let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

const getSocketIO = () => ioInstance;

module.exports = { setSocketIO, getSocketIO };
