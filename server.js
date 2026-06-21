const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    socket.on('joinQueue', (data) => {
        socket.username = (data && data.username) ? data.username.trim() : "Anonyme";
        console.log(`${socket.username} rejoint la file.`);

        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const roomName = `room_${waitingPlayer.id}_${socket.id}`;

            socket.join(roomName);
            waitingPlayer.join(roomName);

            console.log(`Partie: ${waitingPlayer.username} (X) vs ${socket.username} (O) dans ${roomName}`);

            waitingPlayer.emit('gameStart', {
                room: roomName,
                symbol: 'X',
                opponentName: socket.username
            });

            socket.emit('gameStart', {
                room: roomName,
                symbol: 'O',
                opponentName: waitingPlayer.username
            });

            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            console.log(`${socket.username} attend...`);
        }
    });

    socket.on('playerMove', (data) => {
        if (data.room) {
            socket.to(data.room).emit('opponentMove', { index: data.index });
        }
    });

    socket.on('sendEmote', (data) => {
        console.log(`Emote reçue: ${data.emote} dans room: ${data.room}`);
        if (data.room) {
            socket.to(data.room).emit('shareEmote', { emote: data.emote });
            console.log(`Emote envoyée à la room ${data.room}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Déconnecté : ${socket.id}`);
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Morpion actif sur le port ${PORT}`);
});
