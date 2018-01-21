// Send the socketio object in here
module.exports = (io) => {

  // Helper for sending to an array of sockets
  const Sender = (sockets, type, data) => sockets && sockets.forEach(socket => socket.emit(type, data));

  // Disconnection Routine
  const disconnect = (socket, sCol) => {
    console.log("Disconnected ", sCol);
    if (socket && socket.id && sockets[sCol].length) {
      // Remove the disconnected socket
      sockets[sCol] = sockets[sCol].filter(s => s.id != socket.id);
    }
    Sender(sockets.server, 'disconnection', socket.id);
  };

  // helper for managing the player arrays  
  const Players = {
    // For emitting individual player event data
    sendPlayer: (playerId, data) => {
      let index = this.playerIds.indexOf(playerId);
      if (index != -1) {
        this.playerSockets[index].emit('event', data);
      }
    },

    // Add method
    Add: (player, playerId, socket) => {
      this.players.push(player);
      this.playerIds.push(playerId);
      this.playerSockets.push(socket);
    },

    // Removal method
    Remove: playerId => {
      let index = this.playerIds.indexOf(playerId);
      if (index != -1) {
        this.players.splice(index, 1);
        this.playerIds.splice(index, 1);
        this.playerSockets.splice(index, 1);
      }
    },

    // Reset method
    Reset: () => {
      this.players = [];
      this.playerIds = [];
      this.playerSockets = [];
    }
  };

  // These will contain active sockets which need to be rebroadcast to
  let sockets = {
    // Track each server socket in here, to broadcast updates to
    server: [],

    // Track each player here, to broadcast personal events to
    player: []
  };

  // The configuration of the current game
  this.currentGame = null;

  // The status of the current game
  this.gameStatus = null;

  // An array of logged in players of the current game
  this.players = [];

  // Their ids in an array
  this.playerIds = [];

  // the player sockets
  this.playerSockets = [];

// display server Data
io
  .of('/display')
  .on('connection', socket => {
    // Add this connection to the sockets.server pool
    sockets.server.push(socket);
    console.log("New server %s COUNT: %s", socket.id, sockets.server.length);

    // This is a new connection
    Sender(sockets.admin, 'connection', sockets.server.length);
    
    // Subscribe to disconnect routines
    socket.on('disconnect', () => disconnect(socket, "server"));

    // Player event (goes to one player)
    socket.on('event', (playerId, eventType, eventData) => 
      Players.sendPlayer(playerId, {eventType: eventType, eventData: eventData}));
  });

  // Controller data (received from the player, emit to server)
  io
    .of('/controls')
    .on('connection', socket => {
      console.log("controls connection");

      // Forward disconnect notifications with the socket id
      socket.on('disconnect', () =>
        Sender(sockets.server, 'controlsDisconnect', socket.id.replace("/controls#", "")));

      // forward control data
      socket.on('control', data => {
        // console.log("control data", JSON.stringify(data, null, 2));
        // Add the user socket id to the data
        data = Object.assign({i: socket.id.replace("/controls#", "")}, data);

        // forward the data to the display server
        Sender(sockets.server, 'control', data);
      });
    });
};