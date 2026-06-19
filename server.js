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

    // 1. REJOINDRE LA FILE D'ATTENTE (Prend désormais en compte le pseudo envoyé)
    socket.on('joinQueue', (data) => {
        // On stocke le pseudo reçu sur l'objet socket du joueur
        socket.username = data && data.username ? data.username : "Joueur anonyme";

        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const roomName = `room_${waitingPlayer.id}_${socket.id}`;
            
            socket.join(roomName);
            waitingPlayer.join(roomName);

            // On envoie le pseudo de l'un à l'autre !
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

    // 2. JOUER UN COUP
    socket.on('playerMove', (data) => {
        socket.to(data.room).emit('opponentMove', { index: data.index });
    });

    // 3. ENVOYER LES ÉMOTES (Transmet à l'autre joueur du salon)
    socket.on('emotes', (data) => {
        socket.to(data.room).emit('emotes', { 
            emote: data.emote, 
            emotion: data.emotion 
        });
    });

    // 4. GESTION DE LA DÉCONNEXION
    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur Morpion actif sur le port ${PORT}`);
});
