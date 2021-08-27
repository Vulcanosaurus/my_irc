var readline = require('readline');
var socketio = require('socket.io');
var io = socketio.listen(3636);

var rl = readline.createInterface(process.stdin, process.stdout);
 
rl.question("What is your name? ", function(answer) {
    console.log("Hello, " + answer );
    rl.close();
});

 
 
io.sockets.on('connection', function (socket) {
 
    socket.on('send', function (data) {
        io.sockets.emit('message', data);
    });
 
});

rl.question("Please enter a nickname: ", function(name) {
    nick = name;
    var msg = nick + " has joined the chat";
    socket.emit('send', { type: 'notice', message: msg });
    rl.prompt(true);
});

function console_out(msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
}

rl.on('line', function (line) {
    if (line[0] == "/" && line.length > 1) {
        var cmd = line.match(/[a-z]+\b/)[0];
        var arg = line.substr(cmd.length+2, line.length);
        chat_command(cmd, arg);
 
    } else {
        socket.emit('send', { type: 'chat', message: line, nick: nick });
        rl.prompt(true);
    }
});