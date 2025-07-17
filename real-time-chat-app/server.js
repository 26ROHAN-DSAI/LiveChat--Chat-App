require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store user data for each socket
const users = new Map();

// Function to broadcast the updated user list
function updateUserList(room) {
    const usersInRoom = Array.from(users.entries())
        .filter(([socketId, userData]) => userData.currentRoom === room)
        .map(([socketId, userData]) => ({ id: socketId, username: userData.username }));

    io.to(room).emit('update user list', usersInRoom);
}

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Set default user data
    users.set(socket.id, {
        username: 'Anonymous',
        currentRoom: 'General',
    });

    // Join the default room
    socket.join('General');

    // Emit the updated user list
    updateUserList('General');

    // Listen for username submission
    socket.on('user joined', (data) => {
        const userData = users.get(socket.id) || {};
        userData.username = data.username || 'Anonymous';
        userData.currentRoom = data.room || 'General';
        users.set(socket.id, userData);

        socket.join(userData.currentRoom);
        console.log(`${userData.username} joined ${userData.currentRoom}`);
        updateUserList(userData.currentRoom);
    });

    // Listen for room switching
    socket.on('switch room', (data) => {
        const userData = users.get(socket.id);
        if (userData) {
            socket.leave(userData.currentRoom);
            updateUserList(userData.currentRoom); // Update the old room
            userData.currentRoom = data.newRoom;
            users.set(socket.id, userData);
            socket.join(userData.currentRoom);
            console.log(`${userData.username} switched to room: ${userData.currentRoom}`);
            updateUserList(userData.currentRoom); // Update the new room
        }
    });

    // Listen for chat messages
    socket.on('chat message', (data) => {
        const userData = users.get(socket.id);
        if (userData) {
            const messageId = `${socket.id}-${Date.now()}`; // Generate a unique message ID
            io.to(userData.currentRoom).emit('chat message', {
                id: messageId,
                username: userData.username,
                msg: data.msg,
                room: userData.currentRoom,
                avatar: data.avatar,
                timestamp: new Date(),
            });
        }
    });

    // Listen for private messages
    socket.on('private message', (data) => {
        const { recipientId, message } = data;
        const senderData = users.get(socket.id);

        if (senderData && users.has(recipientId)) {
            // Emit the private message to the recipient
            socket.to(recipientId).emit('private message', {
                senderId: socket.id,
                senderUsername: senderData.username,
                message,
                timestamp: new Date(),
            });

            console.log(`Private message from ${senderData.username} to ${recipientId}: ${message}`);
        }
    });

    // Listen for file uploads
    socket.on('file upload', (data) => {
        const userData = users.get(socket.id);
        if (userData) {
            io.to(userData.currentRoom).emit('file upload', {
                username: data.username || userData.username, // Use the username from the data or fallback to the stored username
                file: data.file,
                filename: data.filename,
                avatar: data.avatar || userData.avatar, // Use the avatar from the data or fallback to the stored avatar
                room: userData.currentRoom,
            });
        }
    });

    // Listen for reactions
    socket.on('reaction', (data) => {
        io.to(data.room).emit('reaction', data);
    });

    // Listen for typing indicators
    socket.on('typing', (data) => {
        socket.to(data.room).emit('typing', { username: data.username, room: data.room });
    });

    socket.on('stop typing', (data) => {
        socket.to(data.room).emit('stop typing');
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        const userData = users.get(socket.id);
        if (userData) {
            console.log(`${userData.username} disconnected`);
            updateUserList(userData.currentRoom);
        }
        users.delete(socket.id);
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});