const socket = io('http://localhost:3000'); // Update to match your server port
const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');
const nameModal = document.getElementById('name-modal');
const usernameInput = document.getElementById('username-input');
const genderSelect = document.getElementById('gender-select');
const startChatButton = document.getElementById('start-chat');
const chatApp = document.getElementById('chat-app');
const toggleThemeButton = document.getElementById('toggle-theme');
const rooms = document.getElementById('rooms');
const currentRoomDisplay = document.getElementById('current-room');
const typingIndicator = document.getElementById('typing-indicator');
const fileForm = document.getElementById('file-form');
const fileInput = document.getElementById('file-input');
const userList = document.getElementById('user-list'); // Add a user list for private messaging

let username = ''; // Store the user's name
let avatarUrl = ''; // Store the user's avatar URL
let currentRoom = 'General'; // Default room
let typingTimeout;

// Handle name submission
startChatButton.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    const gender = genderSelect.value;
    if (name) {
        username = name; // Store the username
        avatarUrl = `https://robohash.org/${encodeURIComponent(username)}.png?set=set${gender === 'male' ? 1 : 2}`; // Generate avatar using RoboHash
        nameModal.classList.add('hidden'); // Hide the modal
        chatApp.classList.remove('hidden'); // Show the chat app
        socket.emit('user joined', { username, room: currentRoom, avatar: avatarUrl }); // Send username, room, and avatar to the server
    } else {
        alert('Please enter a valid name.'); // Alert if the name is empty
    }
});

// Handle room switching
rooms.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
        const newRoom = e.target.textContent;
        if (newRoom !== currentRoom) {
            socket.emit('switch room', { username, newRoom, oldRoom: currentRoom }); // Notify server of room switch
            currentRoom = newRoom; // Update current room
            currentRoomDisplay.textContent = currentRoom; // Update the displayed room name
            messages.innerHTML = ''; // Clear messages for the new room
        }
    }
});

// Handle form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', { room: currentRoom, msg: input.value, avatar: avatarUrl }); // Send message to the current room
        input.value = ''; // Clear the input field
    }
});

// Handle file sharing
fileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            socket.emit('file upload', {
                room: currentRoom,
                file: reader.result,
                filename: file.name,
                username: username, // Include the username
                avatar: avatarUrl, // Include the avatar URL
            });
        };
        reader.readAsDataURL(file);
    }
});

// Listen for chat messages from the server
socket.on('chat message', (data) => {
    if (data.room === currentRoom) { // Only display messages for the current room
        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        const item = document.createElement('li');
        item.id = data.id; // Set the message ID
        item.innerHTML = `
            <img src="${data.avatar}" alt="Avatar">
            <span><strong>${data.username}:</strong> ${data.msg} <small>${timestamp}</small></span>
            <div class="reactions">
                <button class="reaction-btn" data-reaction="👍">👍</button>
                <button class="reaction-btn" data-reaction="❤️">❤️</button>
                <button class="reaction-btn" data-reaction="😂">😂</button>
            </div>
        `;
        messages.appendChild(item);

        // Add event listeners for reactions
        const reactionButtons = item.querySelectorAll('.reaction-btn');
        reactionButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const reaction = button.getAttribute('data-reaction');
                socket.emit('reaction', { room: currentRoom, messageId: data.id, reaction });
            });
        });

        messages.scrollTop = messages.scrollHeight; // Auto-scroll to the latest message
    }
});

// Listen for reactions
socket.on('reaction', (data) => {
    const message = document.getElementById(data.messageId);
    if (message) {
        const reaction = document.createElement('span');
        reaction.textContent = data.reaction;
        message.querySelector('.reactions').appendChild(reaction);
    }
});

// Listen for file uploads
socket.on('file upload', (data) => {
    if (data.room === currentRoom) {
        const item = document.createElement('li');
        item.innerHTML = `
            <strong>${data.username}:</strong> <a href="${data.file}" download="${data.filename}">${data.filename}</a>
        `;
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
    }
});

// Listen for typing indicators
input.addEventListener('input', () => {
    socket.emit('typing', { username, room: currentRoom });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing', { room: currentRoom });
    }, 1000); // Stop typing after 1 second of inactivity
});

socket.on('typing', (data) => {
    if (data.room === currentRoom) {
        typingIndicator.textContent = `${data.username} is typing...`;
        typingIndicator.classList.remove('hidden');
    }
});

socket.on('stop typing', () => {
    typingIndicator.classList.add('hidden');
});

// Handle private messaging
function sendPrivateMessage(recipientId, message) {
    socket.emit('private message', { recipientId, message });
}

// Listen for private messages
socket.on('private message', (data) => {
    const { senderUsername, message, timestamp } = data;
    console.log(`Private message from ${senderUsername}: ${message} at ${timestamp}`);
    // Display the private message in the UI (you can customize this)
    alert(`Private message from ${senderUsername}: ${message}`);
});

// Update user list for private messaging
socket.on('update user list', (users) => {
    userList.innerHTML = ''; // Clear the user list
    users.forEach((user) => {
        if (user.id !== socket.id) { // Exclude the current user
            const userItem = document.createElement('li');
            userItem.textContent = user.username;
            userItem.addEventListener('click', () => {
                const message = prompt(`Send a private message to ${user.username}:`);
                if (message) {
                    sendPrivateMessage(user.id, message);
                }
            });
            userList.appendChild(userItem);
        }
    });
});

// Dark mode toggle
toggleThemeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});