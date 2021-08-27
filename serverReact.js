const fs = require("fs");
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
  io.to(socket.currentServer).emit("msg", his[socket.currentServer]);

  if (!(his.length === 0)) {
    io.to(socket.id).emit("msg", his);
  }

  socket.on("msg", (msg) => {
    console.log(server_users);
    let msgTab = msg.split(" ");
    console.log(msgTab[0]);
    if (!(msgTab[0] === "/join")) {
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
    io.to(socket.currentServer).emit("msg", his[socket.currentServer]);
  });
  socket.on("privateMessage", ({ content, to }) => {
    socket.to(to).emit("private message", {
      content,
      from: socket.id,
    });
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

io.of("/").adapter.on("create-room", (room) => {
  console.log(`room ${room} was created`);
});

io.of("/").adapter.on("join-room", (room, id) => {
  console.log(`socket ${id} has joined room ${room}`);
});
io.of("/").adapter.on("leave-room", (room, id) => {
  console.log(`socket ${id} has leave room ${room}`);
});

io.of("/").adapter.on("delete-room", (room) => {
  console.log(`room ${room} has been deleted`);
});

function chat_command(cmd, arg, socket) {
  if (
    cmd === "nick" ||
    cmd === "create" ||
    cmd === "delete" ||
    cmd === "join"
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

    case "smiley":
      fs.readFile("./smiley.txt", "utf8", (err, data) => {
        his[socket.currentServer].push([">", data]);
        if (err) {
          console.error(err);
          return;
        }
        console.log(data);
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
      his.forEach((channel) => {
        console.log(channel);
        channel.push([">", `Channel ${arg} has been created.`]);
      });
      his[arg] = [];
      servers.push(arg);
      server_users[arg] = [];
      io.emit("server", servers);
      break;
    case "delete":
      // console.log(io.sockets.adapter.rooms["/"]);

      if (arg === "/") {
        his[socket.currentServer].push([">", "Can't delete general channel"]);
        break;
      }

      his.forEach((channel) => {
        channel.push([">", `Channel ${arg} has been deleted.`]);
      });
      servers.splice(servers.indexOf(arg), 1);
      io.emit("server", servers);
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
      break;

    case "leave":
      if (socket.currentServer !== arg) {
        his[socket.currentServer].push([
          ">",
          "Can't leave server that the user is not in.",
        ]);
        break;
      }
      socket.currentServer = "/";
      break;

    case "users":
      console.log(users);
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
      his[socket.currentServer].push(
        [">", "commands:"],
        [">", "/nick 'name': changes username"],
        [">", "/create 'name': creates channel"],
        [">", "/join 'name': joins existing channel"],
        [">", "/leave 'name': leaves channel 'name' and joins general channel"],
        [">", "/delete 'name': deletes channel"],
        [">", "/users: displays all users on current channel"],
        [
          ">",
          "/list 'search': lists all channels containing 'search' w/ parameter lists all channels",
        ],
        [">", "/users : displays all users on current channel"],
        [">", "/msg 'username' 'msg': sends private 'msg' to 'username'"]
      );
      break;

    case "msg":
      // var to = arg.match(/[a-z]+\b/)[0];
      // var message = arg.substr(to.length, arg.length);
      // socket.emit("send", {
      //   type: "tell",
      //   message: message,
      //   to: to,
      //   from: socket.nickname,
      // });
      // let serverName = socket.nickname + " " + to;
      // if (typeof his[serverName] === "undefined") {
      //   his[serverName] = [];
      // }
      // io.to();
      break;

    default:
      console.log("That is not a valid command.");
      break;
  }
}

io.listen(3001);
