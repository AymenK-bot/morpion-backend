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

            waitingPlayer = null; 
        } else {
            waitingPlayer = socket;
        }
    });

    socket.on('playerMove', (data) => {
        socket.to(data.room).emit('opponentMove', { index: data.index });
    });

    // Événement d'émote ultra propre et synchronisé
    socket.on('sendEmote', (data) => {
        socket.to(data.room).emit('shareEmote', { emote: data.emote });
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Morpion actif sur le port ${PORT}`);
});
