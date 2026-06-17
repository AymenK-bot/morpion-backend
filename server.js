const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    socket.on('joinQueue', () => {
        if (waitingPlayer === null) {
            // Premier joueur : il devient Anonyme 1
            waitingPlayer = socket;
            socket.playerName = "Anonyme 1";
            console.log("Un joueur attend un adversaire...");
        } else {
            // Deuxième joueur : il devient Anonyme 2
            socket.playerName = "Anonyme 2";
            const roomName = `room-${waitingPlayer.id}-${socket.id}`;
            
            waitingPlayer.join(roomName);
            socket.join(roomName);

            console.log(`Partie lancée entre Anonyme 1 et Anonyme 2`);

            // On envoie les infos de match aux deux
            waitingPlayer.emit('gameStart', { 
                room: roomName, 
                symbol: 'X',
                yourName: "Anonyme 1",
                opponentName: "Anonyme 2" 
            });

            socket.emit('gameStart', { 
                room: roomName, 
                symbol: 'O',
                yourName: "Anonyme 2",
                opponentName: "Anonyme 1" 
            });

            waitingPlayer = null; 
        }
    });

    socket.on('playerMove', (data) => {
        socket.to(data.room).emit('opponentMove', { index: data.index });
    });

    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Morpion Anonyme sur le port ${PORT}`);
});
