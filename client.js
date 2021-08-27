// ******* TO DO ********
// currently sends private msg on current server
// send it direct to the socket
// by searching through the
// ******* TO DO ********

var readline = require("readline"),
  socketio = require("socket.io-client"),
  util = require("util"),
  color = require("ansi-color").set;

var socket = socketio.connect("http://localhost:3000");
var rl = readline.createInterface(process.stdin, process.stdout);

let nick;

rl.question("Please enter a nickname: ", function (name) {
  socket.emit("user", name);
  nick = name;
  rl.prompt(true);
});

function console_out(msg) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(msg);
  rl.prompt(true);
}
rl.on("line", function (line) {
  rl.prompt(true);
  socket.emit("msg", line);
});

socket.on("storeIsClosing", () => {
  socket.emit("msg", "/join /");
});

socket.on("send", (obj) => {
  if (obj.to !== nick && obj.from !== nick) {
    return null;
  }
  let from = color(obj.from, "red");
  let to = color(obj.to, "green");
  console_out(from + " -> " + to + " : " + obj.message);
});

socket.on("msg", function (his) {
  let msg = his.pop();
  if (!nick || typeof msg === "undefined") {
    return null;
  }
  console_out(msg[0] + " : " + msg[1]);
  while (msg[0] === ">") {
    msg = his.pop();
    console_out(msg[0] + " : " + msg[1]);
  }
  // console.log(msg);
});

socket.on("notice", (data) => {
  if (!nick) {
    return null;
  }
  console_out(data[0] + " : " + data[1]);
});

socket.on("userchange", function (his) {
  if (!nick) {
    return null;
  }
  nick = his.nick;
  // console.log(msg);
});
