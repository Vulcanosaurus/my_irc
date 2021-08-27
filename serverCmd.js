const io = require("socket.io")({
  cors: {
    origin: ["http://localhost:3000"],
  },
});

const users = [];
const servers = [];
const his = [];
const server_users = [];

io.on("connection", (socket) => {
  console.log(`connect: ${socket.id}`);

  socket.join("/");
  if (servers[0] !== "/") {
    servers.push("/");
    his["/"] = [];
    server_users["/"] = [];
  }

  socket.currentServer = "/";
  server_users["/"].push(socket.id);

  io.to(socket.id).emit("server", servers);

  if (!(his.length === 0)) {
    io.to(socket.id).emit("msg", his);
  }

  socket.on("msg", (msg) => {
    let msgTab = msg.split(" ");
    if (msgTab[0] !== "/msg") {
      let content = [socket.nickname, msg];
      his[socket.currentServer].push(content);
    }

    if (msg[0] === "/" && msg.length > 1) {
      var cmd = msg.match(/[a-z]+\b/)[0];
      var arg = msg.substr(cmd.length + 2, msg.length);
      chat_command(cmd, arg, socket);
      if (cmd === "join" || cmd === "leave") {
        io.to(socket.currentServer).emit("msg", his[socket.currentServer]);
        return null;
      }
    }
    // console.log(
    //   `msg: ${msg} from ${socket.nickname} on ${socket.currentServer}`
    // );

    if (msgTab[0] !== "/msg") {
      io.to(socket.currentServer).emit("msg", his[socket.currentServer]);
    }
  });
  socket.on("disconnect", () => {
    console.log(`disconnect: ${socket.id}`);
  });
  socket.on("user", (user) => {
    socket.nickname = user;
    users.push({
      userID: socket.id,
      username: socket.nickname,
    });
  });
});

// io.of("/").adapter.on("create-room", (room) => {
//   console.log(`room ${room} was created`);
// });

// io.of("/").adapter.on("join-room", (room, id) => {
//   console.log(`socket ${id} has joined room ${room}`);
// });
// io.of("/").adapter.on("leave-room", (room, id) => {
//   console.log(`socket ${id} has leave room ${room}`);
// });

// io.of("/").adapter.on("delete-room", (room) => {
//   console.log(`room ${room} has been deleted`);
// });

function chat_command(cmd, arg, socket) {
  if (
    cmd === "nick" ||
    cmd === "create" ||
    cmd === "delete" ||
    cmd === "join" ||
    cmd === "msg"
  ) {
    if (arg === "") {
      his[socket.currentServer].push([
        ">",
        "Invalid command use, please insert an argument.",
      ]);
      return null;
    }
  }
  switch (cmd) {
    case "nick":
      let notice = socket.nickname + " changed their name to " + arg;
      users.forEach((el) => {
        if (el.username === socket.nickname) {
          el.username = arg;
        }
      });
      socket.nickname = arg;
      his[socket.currentServer].push([">", notice]);
      io.emit("userchange", {
        nick: socket.nickname,
        msg: his[socket.currentServer],
      });
      break;

    case "create":
      if (servers.includes(arg)) {
        his[socket.currentServer].push([
          ">",
          "Channel already exists. Please choose a different name.",
        ]);
        break;
      }
      io.emit("notice", [">", `Channel ${arg} has been created.`]);
      his[arg] = [];
      servers.push(arg);
      server_users[arg] = [];
      break;
    case "delete":
      // console.log(io.sockets.adapter.rooms["/"]);

      if (arg === "/") {
        his[socket.currentServer].push([">", "Can't delete general channel"]);
        break;
      }

      io.emit("notice", [">", "Channel " + arg + " has been deleted."]);

      servers.splice(servers.indexOf(arg), 1);

      if (socket.currentServer === arg) {
        socket.leave(arg);
        socket.join("/");
        socket.currentServer = "/";
      }
      server_users[arg].forEach((token) => {
        io.to(token).emit("storeIsClosing", true);
      });
      server_users.splice(server_users.indexOf(arg), 1);
      break;

    case "join":
      if (!servers.includes(arg)) {
        his[socket.currentServer].push([">", "Channel doesn't exist."]);
        break;
      }
      socket.leave(socket.currentServer);
      socket.join(arg);
      server_users[socket.currentServer].splice(
        server_users[socket.currentServer].indexOf(socket.id),
        1
      );
      server_users[arg].push(socket.id);
      socket.currentServer = arg;
      var result = Object.keys(server_users).map((key) => [
        key,
        server_users[key],
      ]);
      result.forEach((el) => {
        if (el[1].length === 0 && el[0] !== "/") {
          setTimeout(() => {
            servers.splice(servers.indexOf(el[0]), 1);
          }, 5000);
        }
      });
      break;

    case "leave":
      if (socket.currentServer !== arg) {
        his[socket.currentServer].push([
          ">",
          "Can't leave server that the user is not in.",
        ]);
        break;
      }
      server_users[socket.currentServer].splice(
        server_users[socket.currentServer].indexOf(socket.id),
        1
      );
      var result = Object.keys(server_users).map((key) => [
        key,
        server_users[key],
      ]);
      result.forEach((el) => {
        if (el[1].length === 0 && el[0] !== "/") {
          setTimeout(() => {
            servers.splice(servers.indexOf(el[0]), 1);
          }, 5000);
        }
      });
      socket.leave(socket.currentServer);
      socket.currentServer = "/";
      socket.join(socket.currentServer);
      break;

    case "users":
      server_users[socket.currentServer].forEach((token) => {
        users.forEach((user) => {
          if (user.userID === token) {
            let content = [">", user.username];
            his[socket.currentServer].push(content);
          }
        });
      });
      // console.log(io.sockets.adapter.sids);
      break;

    case "list":
      servers.forEach((el) => {
        let content = [">", el];
        his[socket.currentServer].push(content);
      });
      // console.log(io.sockets.adapter.rooms);
      // console.log(socket.rooms);
      break;

    case "help":
      io.to(socket.currentServer).emit("notice", [">", "commands:"]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/nick 'name': changes username",
      ]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/create 'name': creates channel",
      ]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/join 'name': joins existing channel",
      ]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/leave 'name': leaves channel 'name' and joins general channel",
      ]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/delete 'name': deletes channel",
      ]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/users: displays all users on current channel",
      ]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/list 'search': lists all channels containing 'search' w/ parameter lists all channels",
      ]);
      io.to(socket.currentServer).emit("notice", [
        ">",
        "/msg 'username' 'msg': sends private 'msg' to 'username'",
      ]);
      break;

    case "msg":
      if (arg.length <= 0 || arg.indexOf(" ") === -1) {
        return null;
      }
      console.log(arg);
      let tab = arg.split(" ");
      if (tab.length < 2) {
        return null;
      }
      var to = arg.match(/[a-z]+\b/)[0];
      var message = arg.substr(to.length, arg.length);
      let toID;
      console.log(users);
      users.forEach((user) => {
        if (user.username === to) {
          toID = user.userID;
        }
      });
      if (!toID) {
        io.to(socket.currentServer).emit("notice", [
          ">",
          "This user doesn't exist.",
        ]);
        break;
      }
      io.to(toID).emit("send", {
        message: message,
        to: to,
        from: socket.nickname,
      });
      break;

    default:
      console.log("That is not a valid command.");
      break;
  }
}

io.listen(3000);
