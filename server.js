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

// Stockage des comptes en mémoire (Pseudo -> Mot de passe)
// Note : Si le serveur redémarre sur Render, les comptes sont réinitialisés.
const users = new Map(); 

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log(`Nouvelle connexion socket : ${socket.id}`);

    // --- SYSTEME DE COMPTE (CONNEXION / INSCRIPTION) ---
    socket.on('authenticate', (data) => {
        const { action, username, password } = data;

        if (!username || !password || username.trim() === "" || password.trim() === "") {
            socket.emit('authResponse', { success: false, message: "Champs invalides." });
            return;
        }

        const trimmedUser = username.trim();

        if (action === 'register') {
            if (users.has(trimmedUser)) {
                socket.emit('authResponse', { success: false, message: "Ce pseudo existe déjà !" });
            } else {
                users.set(trimmedUser, password);
                socket.username = trimmedUser;
                socket.emit('authResponse', { success: true, message: "Inscription réussie !", username: trimmedUser });
                console.log(`Nouveau compte créé : ${trimmedUser}`);
            }
        } 
        else if (action === 'login') {
            if (!users.has(trimmedUser)) {
                socket.emit('authResponse', { success: false, message: "Ce compte n'existe pas." });
            } else if (users.get(trimmedUser) !== password) {
                socket.emit('authResponse', { success: false, message: "Mot de passe incorrect." });
            } else {
                socket.username = trimmedUser;
                socket.emit('authResponse', { success: true, message: "Connexion réussie !", username: trimmedUser });
                console.log(`Joueur connecté à son compte : ${trimmedUser}`);
            }
        }
    });

    // --- REJOINDRE LA FILE D'ATTENTE (SEULEMENT SI AUTHENTIFIÉ) ---
    socket.on('joinQueue', () => {
        if (!socket.username) {
            socket.emit('statusUpdate', { text: "Erreur : Vous devez être connecté." });
            return;
        }

        if (waitingPlayer === null) {
            waitingPlayer = socket;
            console.log(`${socket.username} est entré dans la file.`);
        } else {
            // Éviter de jouer contre soi-même si on ouvre deux onglets avec le MÊME compte
            if (waitingPlayer.username === socket.username) {
                socket.emit('authResponse', { success: true, message: "Déjà en file avec ce compte. Utilisez un autre compte sur l'autre onglet !", stayInMenu: true });
                return;
            }

            const roomName = `room-${waitingPlayer.id}-${socket.id}`;
            waitingPlayer.join(roomName);
            socket.join(roomName);

            console.log(`Match trouvé : ${waitingPlayer.username} VS ${socket.username}`);

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
        }
    });

    socket.on('playerMove', (data) => {
        socket.to(data.room).emit('opponentMove', { index: data.index });
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en ligne sur le port ${PORT}`);
});
