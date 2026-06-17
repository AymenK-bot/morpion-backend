const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } }); // Permet à ton site Netlify de se connecter

let queue = []; // Liste des joueurs qui attendent

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    socket.on('joinQueue', () => {
        queue.push(socket);

        // S'il y a au moins 2 joueurs dans la file d'attente, on crée un match !
        if (queue.length >= 2) {
            const player1 = queue.shift();
            const player2 = queue.shift();
            const room = `room_${player1.id}_${player2.id}`;

            player1.join(room);
            player2.join(room);

            // On attribue X au premier et O au deuxième
            player1.emit('gameStart', { room, symbol: 'X' });
            player2.emit('gameStart', { room, symbol: 'O' });
        }
    });

    socket.on('playerMove', (data) => {
        // Renvoie le coup à l'autre joueur dans la même pièce
        socket.to(data.room).emit('opponentMove', { index: data.index });
    });

    socket.on('disconnect', () => {
        queue = queue.filter(s => s.id !== socket.id);
        console.log(`Joueur déconnecté : ${socket.id}`);
        // Logique pour avertir l'adversaire si un joueur quitte en pleine partie...
    });
});

server.listen(3000, () => console.log('Serveur de matchmaking sur le port 3000'));