/**
 * ============================================================================
 * Project: Ludo Game - Backend Server & C Engine Bridge
 * Stack: Node.js, Express, Socket.io, C (compiled ludo_engine)
 * Description: Handles real-time online multiplayer rooms, proxies game logic
 *              actions to the compiled C engine, and provides /ping for UptimeRobot.
 * ============================================================================
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const ENGINE_PATH = path.join(__dirname, '..', 'ludo_engine');

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * UptimeRobot Keep-Alive Endpoint
 * Pinging this URL every 5 minutes prevents Render free instance from sleeping!
 */
app.get('/ping', (req, res) => {
    res.status(200).send('pong - C Ludo Server is awake and active!');
});

/**
 * Health check & C Engine status endpoint
 */
app.get('/api/c-status', (req, res) => {
    const exists = fs.existsSync(ENGINE_PATH);
    res.json({
        engineFound: exists,
        enginePath: ENGINE_PATH,
        status: exists ? "C Engine compiled & ready" : "C Engine binary missing, please run npm run build"
    });
});

/* ============================================================================
 * C Engine Bridge
 * Executes the compiled C binary (ludo_engine) for all game rules and actions.
 * ============================================================================ */

function callCEngine(args) {
    return new Promise((resolve, reject) => {
        // If C binary exists, execute it
        if (fs.existsSync(ENGINE_PATH)) {
            execFile(ENGINE_PATH, args, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    console.error("C Engine execution error:", stderr || error.message);
                    return resolve(fallbackEngine(args));
                }
                try {
                    const parsed = JSON.parse(stdout.trim());
                    return resolve(parsed);
                } catch (e) {
                    console.error("Failed to parse C engine JSON output:", stdout);
                    return resolve(fallbackEngine(args));
                }
            });
        } else {
            console.warn("ludo_engine binary not found on disk, running JS fallback mirror.");
            return resolve(fallbackEngine(args));
        }
    });
}

/**
 * 100% Identical JavaScript Mirror of the C Logic
 * Ensures zero crashes if environment runs before 'make' or on read-only environments.
 */
function fallbackEngine(args) {
    const action = args[0];

    if (action === 'init') {
        return {
            currentPlayer: 0,
            lastDice: 0,
            diceRolled: 0,
            extraTurn: 0,
            winner: -1,
            statusMsg: "Game started! Red player's turn to roll.",
            players: [
                { id: 0, name: "Red", homeCount: 0, tokens: [-1, -1, -1, -1] },
                { id: 1, name: "Green", homeCount: 0, tokens: [-1, -1, -1, -1] },
                { id: 2, name: "Yellow", homeCount: 0, tokens: [-1, -1, -1, -1] },
                { id: 3, name: "Blue", homeCount: 0, tokens: [-1, -1, -1, -1] }
            ]
        };
    }

    if (action === 'roll' && args[1]) {
        const state = JSON.parse(args[1]);
        if (state.winner !== -1) return state;

        const dice = Math.floor(Math.random() * 6) + 1;
        state.lastDice = dice;
        state.diceRolled = 1;

        // Check if any move is possible
        const p = state.currentPlayer;
        const tokens = state.players[p].tokens;
        let canMove = false;
        for (let t = 0; t < 4; t++) {
            if (tokens[t] === -1 || (tokens[t] >= 0 && tokens[t] + dice <= 56)) {
                canMove = true;
                break;
            }
        }

        if (!canMove) {
            state.statusMsg = `${state.players[p].name} rolled ${dice}, but has no valid moves. Passing turn.`;
            state.diceRolled = 0;
            state.currentPlayer = (p + 1) % 4;
        } else {
            state.statusMsg = `${state.players[p].name} rolled ${dice}! Select a token to move.`;
        }
        return state;
    }

    if (action === 'move' && args[1]) {
        const state = JSON.parse(args[1]);
        const playerId = parseInt(args[2]);
        const tokenId = parseInt(args[3]);
        const dice = state.lastDice;

        const START_TILES = [0, 13, 26, 39];
        const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

        const curStep = state.players[playerId].tokens[tokenId];
        if (curStep === -1) {
            // Option A: Opens to start tile
            state.players[playerId].tokens[tokenId] = 0;
            state.statusMsg = `${state.players[playerId].name} unlocked Token #${tokenId + 1} to the start tile!`;
        } else {
            const nextStep = curStep + dice;
            state.players[playerId].tokens[tokenId] = nextStep;

            if (nextStep === 56) {
                state.players[playerId].homeCount++;
                state.statusMsg = `🎉 ${state.players[playerId].name}'s Token #${tokenId + 1} reached HOME!`;
                if (state.players[playerId].homeCount === 4) {
                    state.winner = playerId;
                    state.statusMsg = `🏆 Player ${state.players[playerId].name} has WON the game!`;
                    state.diceRolled = 0;
                    return state;
                }
            } else if (nextStep <= 50) {
                const destTile = (START_TILES[playerId] + nextStep) % 52;
                if (!SAFE_SPOTS.includes(destTile)) {
                    for (let opp = 0; opp < 4; opp++) {
                        if (opp === playerId) continue;
                        for (let ot = 0; ot < 4; ot++) {
                            const oStep = state.players[opp].tokens[ot];
                            if (oStep >= 0 && oStep <= 50) {
                                const oTile = (START_TILES[opp] + oStep) % 52;
                                if (oTile === destTile) {
                                    state.players[opp].tokens[ot] = -1;
                                    state.statusMsg = `⚔️ ${state.players[playerId].name} captured ${state.players[opp].name}'s Token #${ot + 1}!`;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        state.diceRolled = 0;
        if (dice === 6) {
            state.extraTurn = 1;
            state.statusMsg += " (Rolled a 6 -> Extra Turn!)";
        } else {
            state.extraTurn = 0;
            state.currentPlayer = (state.currentPlayer + 1) % 4;
            state.lastDice = 0;
        }
        return state;
    }

    return null;
}

/* ============================================================================
 * Room Management & Socket.io Events
 * ============================================================================ */

const rooms = {}; // roomId -> { id, state, players: [ { socketId, id, name, role } ] }

const COLOR_NAMES = ["Red", "Green", "Yellow", "Blue"];

io.on('connection', (socket) => {
    let currentRoom = null;
    let playerSlot = null;

    // 1. Create Online Room
    socket.on('create-room', async (data) => {
        const roomId = (data && data.roomId) ? data.roomId.toUpperCase().trim() : Math.random().toString(36).substring(2, 7).toUpperCase();
        const playerName = (data && data.name) ? data.name.trim() : "Player 1";

        const initialState = await callCEngine(['init']);

        rooms[roomId] = {
            id: roomId,
            state: initialState,
            players: [
                { socketId: socket.id, id: 0, name: playerName, color: COLOR_NAMES[0] }
            ]
        };

        currentRoom = roomId;
        playerSlot = 0;
        socket.join(roomId);

        socket.emit('room-created', {
            roomId,
            playerSlot: 0,
            players: rooms[roomId].players,
            state: rooms[roomId].state
        });
    });

    // 2. Join Online Room
    socket.on('join-room', (data) => {
        const roomId = data.roomId ? data.roomId.toUpperCase().trim() : "";
        const playerName = data.name ? data.name.trim() : "Player";

        if (!rooms[roomId]) {
            return socket.emit('error-msg', "Room not found! Check room code.");
        }

        const room = rooms[roomId];
        if (room.players.length >= 4) {
            return socket.emit('error-msg', "Room is full! (Max 4 players)");
        }

        // Find first empty player slot
        const takenSlots = room.players.map(p => p.id);
        let availableSlot = 0;
        for (let i = 0; i < 4; i++) {
            if (!takenSlots.includes(i)) {
                availableSlot = i;
                break;
            }
        }

        const newPlayer = {
            socketId: socket.id,
            id: availableSlot,
            name: playerName,
            color: COLOR_NAMES[availableSlot]
        };

        room.players.push(newPlayer);
        currentRoom = roomId;
        playerSlot = availableSlot;
        socket.join(roomId);

        // Notify joined player
        socket.emit('room-joined', {
            roomId,
            playerSlot: availableSlot,
            players: room.players,
            state: room.state
        });

        // Broadcast to everyone in room
        io.to(roomId).emit('players-updated', {
            players: room.players,
            state: room.state
        });
    });

    // 3. Roll Dice
    socket.on('roll-dice', async () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];

        // Ensure it's this player's turn
        if (room.state.currentPlayer !== playerSlot) {
            return socket.emit('error-msg', "It's not your turn!");
        }

        if (room.state.diceRolled) {
            return socket.emit('error-msg', "Dice already rolled! Move a token.");
        }

        // Call C Engine to roll dice & evaluate moves
        const updatedState = await callCEngine(['roll', JSON.stringify(room.state)]);
        room.state = updatedState;

        io.to(currentRoom).emit('state-updated', { state: room.state });
    });

    // 4. Move Token
    socket.on('move-token', async (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];

        const tokenId = parseInt(data.tokenId);
        if (isNaN(tokenId) || tokenId < 0 || tokenId > 3) return;

        // Ensure it's this player's turn and dice is rolled
        if (room.state.currentPlayer !== playerSlot) {
            return socket.emit('error-msg', "It's not your turn!");
        }

        if (!room.state.diceRolled) {
            return socket.emit('error-msg', "Roll the dice first!");
        }

        // Call C Engine to execute move
        const updatedState = await callCEngine([
            'move',
            JSON.stringify(room.state),
            playerSlot.toString(),
            tokenId.toString()
        ]);
        room.state = updatedState;

        io.to(currentRoom).emit('state-updated', { state: room.state });
    });

    // 5. Restart / Reset Game
    socket.on('restart-game', async () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];

        room.state = await callCEngine(['init']);
        io.to(currentRoom).emit('state-updated', { state: room.state });
    });

    // 6. In-game Chat & Quick Reactions
    socket.on('send-chat', (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players.find(p => p.socketId === socket.id);
        const name = player ? player.name : "Player";
        const color = player ? player.color : "Gray";

        io.to(currentRoom).emit('chat-message', {
            sender: name,
            color: color,
            text: (data.text || "").substring(0, 80)
        });
    });

    // 7. Handle Disconnect
    socket.on('disconnect', () => {
        if (currentRoom && rooms[currentRoom]) {
            const room = rooms[currentRoom];
            room.players = room.players.filter(p => p.socketId !== socket.id);

            if (room.players.length === 0) {
                delete rooms[currentRoom];
            } else {
                io.to(currentRoom).emit('players-updated', {
                    players: room.players,
                    state: room.state
                });
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🎲 Ludo Server running on http://localhost:${PORT}`);
    console.log(`📡 Keep-Alive Endpoint: http://localhost:${PORT}/ping`);
    console.log(`⚙️  C Engine Status: http://localhost:${PORT}/api/c-status`);
    console.log(`=======================================================`);
});
