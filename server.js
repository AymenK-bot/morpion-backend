const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permet à Netlify de se connecter
        methods: ["GET", "POST"]
    }
});

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    // On reçoit ici les données, dont le playerName
    socket.on('joinQueue', (data) => {
        const playerName = (data && data.playerName) ? data.playerName : "Anonyme";
        socket.playerName = playerName; // On stocke le pseudo dans l'objet socket du joueur

        if (waitingPlayer === null) {
            // Premier joueur qui arrive : il attend
            waitingPlayer = socket;
            console.log(`${playerName} attend un adversaire...`);
        } else {
            // Deuxième joueur qui arrive : on lance la partie !
            const roomName = `room-${waitingPlayer.id}-${socket.id}`;
            
            waitingPlayer.join(roomName);
            socket.join(roomName);

            console.log(`Partie lancée entre ${waitingPlayer.playerName} et ${socket.playerName}`);

            // On envoie à chacun le pseudo de son adversaire respectif !
            waitingPlayer.emit('gameStart', { 
                room: roomName, 
                symbol: 'X',
                opponentName: socket.playerName 
            });

            socket.emit('gameStart', { 
                room: roomName, 
                symbol: 'O',
                opponentName: waitingPlayer.playerName 
            });

            waitingPlayer = null; // On vide la file d'attente pour les prochains
        }
    });

    socket.on('playerMove', (data) => {
        // Renvoie le coup à l'autre joueur de la pièce (room)
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
    console.log(`Serveur Morpion en cours d'exécution sur le port ${PORT}`);
});
