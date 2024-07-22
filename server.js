// server.js (Node.js)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let fakeUserCount = 0;
const waitingRoom = new Set();
const activeUsers = new Set();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  activeUsers.add(socket.id);

  // Notify all clients about the updated active users list
  io.emit('activeUsers', Array.from(activeUsers));

  socket.on('startCall', (isTest) => {
    console.log(`${socket.id} started a ${isTest ? 'test' : 'real'} call`);
    if (isTest) {
      const fakeUserId = ++fakeUserCount;
      console.log(`Creating fake user: FakeUser-${fakeUserId}`);
      socket.emit('matched', fakeUserId, true);
      console.log(`Matched ${socket.id} with fake user FakeUser-${fakeUserId}`);
    } else {
      waitingRoom.add(socket.id);
      console.log(`${socket.id} entered waiting room`);
      matchRealUsers();
    }
  });

  socket.on('endCall', () => {
    waitingRoom.delete(socket.id);
    console.log(`${socket.id} ended the call`);
  });

  socket.on('skipCall', (isTest) => {
    console.log(`${socket.id} skipped the ${isTest ? 'test' : 'real'} call`);
    if (isTest) {
      const fakeUserId = ++fakeUserCount;
      console.log(`Creating new fake user: FakeUser-${fakeUserId}`);
      socket.emit('matched', fakeUserId, true);
    } else {
      waitingRoom.add(socket.id);
      console.log(`${socket.id} re-entered waiting room`);
      matchRealUsers();
    }
  });

  socket.on('offer', (offer, partnerId) => {
    console.log(`Offer from ${socket.id} to ${partnerId}`);
    socket.to(partnerId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, partnerId) => {
    console.log(`Answer from ${socket.id} to ${partnerId}`);
    socket.to(partnerId).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate, partnerId) => {
    console.log(`ICE candidate from ${socket.id} to ${partnerId}`);
    socket.to(partnerId).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    waitingRoom.delete(socket.id);
    activeUsers.delete(socket.id);
    console.log('A user disconnected:', socket.id);

    // Notify all clients about the updated active users list
    io.emit('activeUsers', Array.from(activeUsers));
  });
});

function matchRealUsers() {
  console.log('Attempting to match real users');
  const waitingUsers = Array.from(waitingRoom);
  while (waitingUsers.length >= 2) {
    const user1 = waitingUsers.pop();
    const user2 = waitingUsers.pop();
    waitingRoom.delete(user1);
    waitingRoom.delete(user2);
    io.to(user1).emit('matched', user2, false);
    io.to(user2).emit('matched', user1, false);
    console.log(`Matched ${user1} with ${user2}`);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
