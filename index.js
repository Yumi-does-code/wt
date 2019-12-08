
const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;

const lobbies = {};
const userMap = {};

const usernames =
`Crazy koala,
Reverse giraffe,
Poofy cat,
Sneaky snek,
Abradolf Lincler,
Good doggo,
Big ant,
Krabby Krab,
Zoomer Boomer,
Light Yagami,
Speedy hedgehog,
Bongo cat,
Assasin cat,
Cyborg bunny,
Sphere pancake,
Bob,
Rocket scientist,
eDgy qUaCK birb,
ChunkeY watermelooon`.split(/\,/gmi);

function getId() {
  return (Date.now() + performance.now()).toString().replace(".", "");
}

io.on("connection", function(socket) {
  //console.log("socket connected");

  socket.on("createLobby", data => {
    if (lobbies[userMap[socket.id]]) {
      socket.emit("lobbyCreated", {d: lobbies[userMap[socket.id]], me: socket.id});
      return;
    }

    let id = getId();
    while (lobbies[id])
      id = getId();
    lobbies[id] = new Lobby(socket);
    lobbies[id].id = id;
    socket.emit("lobbyCreated", lobbies[id]);
  });

  socket.on("joinLobby", ({l, user}) => {
    if (!lobbies[l]) {
      socket.emit("noJoin", "No such lobby");
      return;
    }
    if (lobbies[l].size === lobbies[l].members.length) {
      socket.emit("noJoin", "This lobby is full");
      return;
    }
    if (userMap[socket.id]) {
      socket.emit("noJoin", "You're already in this lobby? (wtf) (are you messing with the js code o-o?)");
      return;
    }
    if (!user) {
      socket.emit("noJoin", "You don't exist");
      return;
    }
    if (lobbies[l].members.some(v => v.userId === user.id)) {
      socket.emit("noJoin", "You're already in this lobby, you may have a tab/window with the lobby open somewhere.");
      return;
    }


    console.log(`${socket.id} joined ${l}`)
    lobbies[l].members.push(new User(socket, lobbies[l], user));
    userMap[socket.id] = l;
    socket.join(l);
    io.to(l).emit("playerJoined", {
      joined: socket.id,
      lobby: lobbies[l]
    })
  });


  socket.on("disconnect", leave);
  socket.on("playerLeave", leave);

  socket.on("kickUser", user => {
    if (lobbies[userMap[socket.id]] && lobbies[userMap[socket.id]].owner === socket.id) {
      leave(false, user)
      io.sockets.sockets[user] && io.sockets.sockets[user].emit("kicked", userMap[user].id);
    }

  });

  socket.on("lobbySizeChange", data => {
    const pass = lobbies[data.id] && lobbies[data.id].members.length - 1 < +data.p && lobbies[data.id].owner === socket.id;
    if (pass)
      lobbies[data.id].size = +data.p;

    if (userMap[socket.id])
      io.to(userMap[socket.id]).emit("lobbySizeChange", {
        pass: pass,
        max: data.p,
        players: lobbies[data.id].members.length,
        lobby: lobbies[data.id]
      });
  });

  socket.on("lobbySend", obj => {
    console.log(obj)
    if (!obj) return;
    if (!obj.type) return;
    if (!obj.func) return;
    if (!obj.parameters) return;
    console.log(obj)
    io.to(userMap[socket.id]).broadcast("lobbySend", obj);

  });

  function leave(d, s) {
    let id = socket.id;
    if (!userMap[id]) return;
    if (s) id = s;


    io.sockets.sockets[id] && io.sockets.sockets[id].leave(userMap[id]);
    

    lobbies[userMap[id]].members = lobbies[userMap[id]]
      .members
      .slice(0)
      .filter(v => v.id !== id);

    console.log(`${id} left ${userMap[id]}`, "hey1")
    if (lobbies[userMap[id]].owner === id && lobbies[userMap[id]].members.length >= 1) {
      lobbies[userMap[id]].owner = lobbies[userMap[id]].members[0].id;
    }
    else if (!lobbies[userMap[id]].members >= 1) {
      delete lobbies[userMap[id]];
      return;
    }
    io.to(userMap[id]).emit("playerJoined", {
      joined: id,
      lobby: lobbies[userMap[id]]
    })

    userMap[id] = false;
  }

});

http.listen(port, () => {
  console.log(`lisetning to ${port}`);
});


function User(socket, lobby, user) {
  const av = usernames.slice(0).filter(k => !lobby.members.slice(0).map(v => v.name).includes(k));
  this.id = socket.id;
  this.name = av[~~(Math.random() * av.length)];
  this.timeStamp = Date.now();
  this.userId = user.id;
  this.username = user.username;
}
function Lobby(socket) {
  this.members = [];
  this.timeStamp = Date.now();
  this.size = 16;
  this.owner = socket.id;
}
function getId() {
  const s = ("ABCDEFGHJIKLMNOPQRSTUVWXYZ" + "ABCDEFGHJIKLMNOPQRSTUVWXYZ".toLowerCase());
  return new Array(6).fill(0).map((v, i) => s.substr(~~(Math.random() * s.length), 1)).join("");
}
