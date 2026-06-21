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
        socket.username = data && data.username ? data.username : "Joueur anonyme";
        console.log(`${socket.username} rejoint la file.`);

        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const roomName = `room_${waitingPlayer.id}_${socket.id}`;

            socket.join(roomName);
            waitingPlayer.join(roomName);

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

            console.log(`Partie lancée dans ${roomName} : ${waitingPlayer.username} (X) vs ${socket.username} (O)`);
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            console.log(`${socket.username} attend un adversaire...`);
        }
    });

    socket.on('playerMove', (data) => {
        socket.to(data.room).emit('opponentMove', { index: data.index });
    });

    socket.on('sendEmote', (data) => {
        if (data.room) {
            socket.to(data.room).emit('shareEmote', { emote: data.emote });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        // Notifie l'adversaire dans toutes les rooms de ce socket
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.to(room).emit('opponentDisconnected');
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Morpion actif sur le port ${PORT}`);
});
