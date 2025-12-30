const express = require("express");
const path = require("path");
const app = express();
const httpServer = require("http").createServer(app);
// const websocketServer = require("websocket").server;
// const io = new websocketServer({
//   httpServer,co
// });
const io = require("socket.io")(httpServer);
const public = path.join(__dirname, "/public");

app.use(express.static(public));
app.get("/", (req, res) => {
  res.sendFile(path.join(public, "call.html"));
});

app.get("/rtc/*", (req, res) => {
  res.sendFile(path.join(public, "rtc.html"));
});

app.get("/authrtc/*", (req, res) => {
  res.sendFile(path.join(public, "rtc.html"));
});

function logIt(msg) {
  const date = new Date();
  console.log(`${date}:${msg}`);
}
// TODO WebRTC信令服务器拆分点1
io.on("connection", function (socket) {
  socket.on("join", function (room) {
    
  });
  // TODO WebRTC信令服务器拆分点2
  // Relay candidate messages
  socket.on("icecandidate", function (candidate, room) {
    
  });

  // TODO WebRTC信令服务器拆分点3
  // Relay offers
  socket.on("offer", function (offer, room) {
  });

  // Relay answers
  socket.on("answer", function (answer, room) {
  });
});

const port = process.env.PORT || 8000;
httpServer.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
