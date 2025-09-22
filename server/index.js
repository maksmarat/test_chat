const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

// Store channels and global user list
const channels = {}; // { channelName: { owner, participants: [] } }
let allUsers = [];   // all users who have joined

io.on('connection', (socket) => {
  console.log('connected', socket.id);

  socket.on('join', ({ channel, username }) => {
    socket.username = username;
    socket.channel = channel;

    socket.join(channel);

    // If channel is new, create and assign owner
    if (!channels[channel]) {
      channels[channel] = { owner: username, participants: [] };
      io.to(channel).emit('owner', username);
    }

    // Add user to channel participants
    if (!channels[channel].participants.includes(username)) {
      channels[channel].participants.push(username);
    }

    // Add user to global list
    if (!allUsers.includes(username)) {
      allUsers.push(username);
    }

    // Update participants and global user list
    io.to(channel).emit('participants', channels[channel].participants);
    io.emit('allUsers', allUsers);

    // System message for join
    io.to(channel).emit('message', { system: true, text: `${username} joined` });
  });

  socket.on('message', ({ channel, text, username }) => {
    io.in(channel).emit('message', { username, text, ts: Date.now() });
  });

  socket.on('kick', ({ channel, target }) => {
    const ch = channels[channel];
    // Only owner can kick
    if (ch && ch.owner === socket.username) {
      ch.participants = ch.participants.filter((u) => u !== target);
      io.to(channel).emit('participants', ch.participants);

      const targetSocket = [...io.sockets.sockets.values()]
        .find((s) => s.username === target);

      if (targetSocket) {
        targetSocket.leave(channel);
        targetSocket.emit('kicked', channel);
      }

      io.to(channel).emit('message', {
        system: true,
        text: `${target} was kicked by ${socket.username}`
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      // Remove from global user list
      allUsers = allUsers.filter((u) => u !== socket.username);

      // Remove from channel participants
      if (socket.channel && channels[socket.channel]) {
        channels[socket.channel].participants =
          channels[socket.channel].participants.filter((u) => u !== socket.username);

        io.to(socket.channel).emit('participants', channels[socket.channel].participants);
        io.to(socket.channel).emit('message', {
          system: true,
          text: `${socket.username} left`
        });
      }

      io.emit('allUsers', allUsers);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Socket.IO server running at :${PORT}`));
