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

    // 1. REJOINDRE LA FILE D'ATTENTE (Modifié pour recevoir le pseudo)
    socket.on('joinQueue', (data) => {
        // On sauvegarde le pseudo envoyé par le client sur l'objet socket
        socket.username = data && data.username ? data.username : "Anonyme";

        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            // Un joueur attendait, on crée une pièce unique
            const roomName = `room_${waitingPlayer.id}_${socket.id}`;
            
            socket.join(roomName);
            waitingPlayer.join(roomName);

            // On lance le jeu en envoyant à chacun le pseudo de l'autre !
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

            waitingPlayer = null; // La file est vide
        } else {
            // Personne n'attend, ce joueur devient le joueur en attente
            waitingPlayer = socket;
        }
    });

    // 2. JOUER UN COUP (Inchangé)
    socket.on('playerMove', (data) => {
        // Renvoie le coup à l'autre joueur dans le même salon
        socket.to(data.room).emit('opponentMove', { index: data.index });
    });

    // 3. RELAYER LES ÉMOTES (Nouveau !)
    socket.on('emotes', (data) => {
        // Renvoie l'émote reçue à l'autre joueur présent dans le salon
        socket.to(data.room).emit('emotes', { emote: data.emote });
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
