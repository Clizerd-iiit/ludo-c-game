/**
 * ============================================================================
 * Project: Ludo Game - Frontend Controller
 * Stack: Vanilla JavaScript, HTML5 Canvas/DOM, Web Audio API, Socket.io
 * Description: Renders the 15x15 board, animates dice & tokens, manages sound effects,
 *              and bridges offline pass-and-play and online multiplayer.
 * ============================================================================
 */

(function () {
    'use strict';

    /* --- Constants & Board Mapping --- */
    const NUM_PLAYERS = 4;
    const TOKENS_PER_PLAYER = 4;
    const COLOR_NAMES = ["Red", "Green", "Yellow", "Blue"];
    const COLOR_HEX = ["#ef4444", "#10b981", "#f59e0b", "#3b82f6"];

    // 52 Common Track Tile Coordinates: [row, col] (0-indexed on 15x15 grid)
    const COMMON_TILES = [
        [6, 1],  [6, 2],  [6, 3],  [6, 4],  [6, 5],   // 0-4 (Red Arm Top)
        [5, 6],  [4, 6],  [3, 6],  [2, 6],  [1, 6],  [0, 6], // 5-10 (Green Arm Left)
        [0, 7],  [0, 8],                              // 11-12 (Top Turn)
        [1, 8],  [2, 8],  [3, 8],  [4, 8],  [5, 8],   // 13-17 (Green Arm Right)
        [6, 9],  [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23 (Yellow Arm Top)
        [7, 14], [8, 14],                             // 24-25 (Right Turn)
        [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],  // 26-30 (Yellow Arm Bottom)
        [9, 8],  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36 (Blue Arm Right)
        [14, 7], [14, 6],                             // 37-38 (Bottom Turn)
        [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],  // 39-43 (Blue Arm Left)
        [8, 5],  [8, 4],  [8, 3],  [8, 2],  [8, 1],  [8, 0], // 44-49 (Red Arm Bottom)
        [7, 0],  [6, 0]                               // 50-51 (Left Turn)
    ];

    // Safe Spots indices on common track
    const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

    // Home Stretch Coordinates: steps 51 to 55 for each player
    const HOME_STRETCH = {
        0: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],     // Red
        1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],     // Green
        2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Yellow
        3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]  // Blue
    };

    // Home Goals: step 56 for each player
    const HOME_GOALS = {
        0: [7, 6], // Red
        1: [6, 7], // Green
        2: [7, 8], // Yellow
        3: [8, 7]  // Blue
    };

    // Base Slot Coordinates: 4 tokens inside each base yard
    const BASE_SLOTS = {
        0: [[1, 1], [1, 4], [4, 1], [4, 4]],         // Red
        1: [[1, 10], [1, 13], [4, 10], [4, 13]],     // Green
        2: [[10, 10], [10, 13], [13, 10], [13, 13]], // Yellow
        3: [[10, 1], [10, 4], [13, 1], [13, 4]]      // Blue
    };

    /* --- Sound Synthesizer (Web Audio API) --- */
    class SoundFx {
        constructor() {
            this.muted = false;
            this.ctx = null;
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();
            }
        }

        playDiceRoll() {
            if (this.muted) return;
            this.init();
            const now = this.ctx.currentTime;
            for (let i = 0; i < 4; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200 + Math.random() * 250, now + i * 0.08);
                gain.gain.setValueAtTime(0.15, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.06);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.07);
            }
        }

        playMove() {
            if (this.muted) return;
            this.init();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);
        }

        playCapture() {
            if (this.muted) return;
            this.init();
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.26);
        }

        playWin() {
            if (this.muted) return;
            this.init();
            const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const now = this.ctx.currentTime + idx * 0.12;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.26);
            });
        }
    }

    const sfx = new SoundFx();

    /* --- Application State --- */
    let isOnlineMode = false;
    let socket = null;
    let myPlayerSlot = null; // null for offline, 0-3 for online
    let currentRoomId = null;

    // Offline / Local Game State (Runs identical C logic in client for zero-lag offline play)
    let gameState = {
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

    /* --- DOM Elements --- */
    const boardEl = document.getElementById('ludo-board');
    const statusTextEl = document.getElementById('status-text');
    const turnDotEl = document.getElementById('turn-indicator-dot');
    const currentPlayerNameEl = document.getElementById('current-player-name');
    const currentPlayerRingEl = document.getElementById('current-player-ring');
    const currentPlayerIconEl = document.getElementById('current-player-icon');
    const diceElement = document.getElementById('dice-element');
    const diceVisual = document.getElementById('dice-visual');
    const btnRollDice = document.getElementById('btn-roll-dice');
    const btnRestart = document.getElementById('btn-restart');
    const btnMute = document.getElementById('btn-mute');
    const btnCInfo = document.getElementById('btn-c-info');
    const cModal = document.getElementById('c-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const winnerModal = document.getElementById('winner-modal');
    const winnerTitle = document.getElementById('winner-title');
    const btnPlayAgain = document.getElementById('btn-play-again');

    const tabOffline = document.getElementById('tab-offline');
    const tabOnline = document.getElementById('tab-online');
    const onlineLobby = document.getElementById('online-lobby');
    const chatCard = document.getElementById('chat-card');
    const btnCreateRoom = document.getElementById('btn-create-room');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const playerNameInput = document.getElementById('player-name');
    const roomCodeInput = document.getElementById('room-code-input');
    const roomInfo = document.getElementById('room-info');
    const displayRoomCode = document.getElementById('display-room-code');
    const btnCopyCode = document.getElementById('btn-copy-code');
    const playersChips = document.getElementById('players-chips');
    const chatMessages = document.getElementById('chat-messages');

    /* --- Initialize 15x15 Board Cells --- */
    function buildBoardDOM() {
        boardEl.innerHTML = '';

        // Create 15x15 = 225 cells
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = `cell-${r}-${c}`;
                cell.dataset.row = r;
                cell.dataset.col = c;
                boardEl.appendChild(cell);
            }
        }

        // Overlay 4 Corner Bases
        const bases = [
            { class: 'base-red', color: 'red' },
            { class: 'base-green', color: 'green' },
            { class: 'base-yellow', color: 'yellow' },
            { class: 'base-blue', color: 'blue' }
        ];

        bases.forEach(b => {
            const baseDiv = document.createElement('div');
            baseDiv.className = `base ${b.class}`;
            for (let s = 0; s < 4; s++) {
                const slot = document.createElement('div');
                slot.className = 'base-slot';
                baseDiv.appendChild(slot);
            }
            boardEl.appendChild(baseDiv);
        });

        // Overlay Center Home Triangle
        const centerHome = document.createElement('div');
        centerHome.className = 'center-home';
        centerHome.innerHTML = `
            <div class="triangle-red"></div>
            <div class="triangle-green"></div>
            <div class="triangle-yellow"></div>
            <div class="triangle-blue"></div>
        `;
        boardEl.appendChild(centerHome);

        // Colorize Home Stretch paths
        for (let p = 0; p < 4; p++) {
            const stretch = HOME_STRETCH[p];
            const colorClass = `path-${COLOR_NAMES[p].toLowerCase()}`;
            stretch.forEach(([r, c]) => {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (cell) cell.classList.add(colorClass);
            });

            // Start squares
            const startCoord = COMMON_TILES[p * 13];
            const startCell = document.getElementById(`cell-${startCoord[0]}-${startCoord[1]}`);
            if (startCell) {
                startCell.classList.add(`start-${COLOR_NAMES[p].toLowerCase()}`);
                startCell.innerHTML = '⭐';
            }
        }

        // Add Stars to Safe Spots
        SAFE_SPOTS.forEach(idx => {
            const [r, c] = COMMON_TILES[idx];
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell && !cell.innerHTML) {
                cell.innerHTML = '<span class="safe-star">⭐</span>';
            }
        });
    }

    /* --- Pip Generator for 3D Dice --- */
    function renderDiceFace(val) {
        diceVisual.innerHTML = '';
        const dotFace = document.createElement('div');
        dotFace.className = 'dot-face';

        // 3x3 Grid placements for dice dots (1 to 6)
        const pipPatterns = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };

        const pattern = pipPatterns[val] || [4];
        for (let i = 0; i < 9; i++) {
            if (pattern.includes(i)) {
                const pip = document.createElement('div');
                pip.className = 'pip';
                dotFace.appendChild(pip);
            } else {
                const empty = document.createElement('div');
                dotFace.appendChild(empty);
            }
        }
        diceVisual.appendChild(dotFace);
    }

    /* --- Board Rendering & Token Placement --- */
    function renderBoard() {
        // Remove existing rendered tokens
        document.querySelectorAll('.token').forEach(el => el.remove());

        // Update Header Turn & Status
        const curPlayer = gameState.currentPlayer;
        const curName = COLOR_NAMES[curPlayer];
        const curColorHex = COLOR_HEX[curPlayer];

        statusTextEl.textContent = gameState.statusMsg;
        turnDotEl.className = `dot dot-${curName.toLowerCase()}`;

        currentPlayerNameEl.textContent = `${curName.toUpperCase()} PLAYER`;
        currentPlayerRingEl.className = `avatar-ring ${curName.toLowerCase()}`;

        const icons = ["🔴", "🟢", "🟡", "🔵"];
        currentPlayerIconEl.textContent = icons[curPlayer];

        // Update Scores
        document.getElementById('score-red').textContent = `${gameState.players[0].homeCount}/4`;
        document.getElementById('score-green').textContent = `${gameState.players[1].homeCount}/4`;
        document.getElementById('score-yellow').textContent = `${gameState.players[2].homeCount}/4`;
        document.getElementById('score-blue').textContent = `${gameState.players[3].homeCount}/4`;

        // Update Dice State
        if (gameState.lastDice > 0) {
            renderDiceFace(gameState.lastDice);
        }

        // Enable/Disable Dice Roll Button
        const isMyTurn = !isOnlineMode || (myPlayerSlot === curPlayer);
        if (isMyTurn && !gameState.diceRolled && gameState.winner === -1) {
            btnRollDice.disabled = false;
        } else {
            btnRollDice.disabled = true;
        }

        // Place Tokens
        gameState.players.forEach(player => {
            player.tokens.forEach((step, tokenIdx) => {
                let coords = null;

                if (step === -1) {
                    // Base slot
                    coords = BASE_SLOTS[player.id][tokenIdx];
                } else if (step >= 0 && step <= 50) {
                    // Common 52 track
                    const startOffset = player.id * 13;
                    const commonIdx = (startOffset + step) % 52;
                    coords = COMMON_TILES[commonIdx];
                } else if (step >= 51 && step <= 55) {
                    // Home Stretch
                    coords = HOME_STRETCH[player.id][step - 51];
                } else if (step === 56) {
                    // Home Goal
                    coords = HOME_GOALS[player.id];
                }

                if (coords) {
                    const [r, c] = coords;
                    const cell = document.getElementById(`cell-${r}-${c}`);
                    if (cell) {
                        const tokenEl = document.createElement('div');
                        tokenEl.className = `token token-${COLOR_NAMES[player.id].toLowerCase()}`;
                        tokenEl.textContent = tokenIdx + 1;
                        tokenEl.dataset.playerId = player.id;
                        tokenEl.dataset.tokenId = tokenIdx;

                        // Check if token is movable
                        if (isMyTurn && gameState.diceRolled && player.id === curPlayer && canMoveToken(player.id, tokenIdx, gameState.lastDice)) {
                            tokenEl.classList.add('movable');
                            tokenEl.addEventListener('click', (e) => {
                                e.stopPropagation();
                                handleTokenClick(player.id, tokenIdx);
                            });
                        }

                        cell.appendChild(tokenEl);
                    }
                }
            });
        });

        // Check for winner modal
        if (gameState.winner !== -1) {
            sfx.playWin();
            winnerTitle.textContent = `${COLOR_NAMES[gameState.winner].toUpperCase()} WINS! 🏆`;
            winnerModal.classList.remove('hidden');
        }
    }

    /* --- C Logic Client Mirror for Offline Mode --- */
    function canMoveToken(playerId, tokenId, dice) {
        if (gameState.winner !== -1) return false;
        const step = gameState.players[playerId].tokens[tokenId];
        if (step === 56) return false; // Already finished
        if (step === -1) return true;  // Option A: Any dice (1-6) opens token!
        if (step + dice <= 56) return true;
        return false;
    }

    function hasValidMoves(playerId, dice) {
        for (let t = 0; t < 4; t++) {
            if (canMoveToken(playerId, t, dice)) return true;
        }
        return false;
    }

    function executeOfflineMove(playerId, tokenId) {
        const dice = gameState.lastDice;
        const curStep = gameState.players[playerId].tokens[tokenId];

        if (curStep === -1) {
            // Unlock to start square
            gameState.players[playerId].tokens[tokenId] = 0;
            gameState.statusMsg = `${COLOR_NAMES[playerId]} unlocked Token #${tokenId + 1} to the start tile!`;
            sfx.playMove();
        } else {
            const nextStep = curStep + dice;
            gameState.players[playerId].tokens[tokenId] = nextStep;

            if (nextStep === 56) {
                gameState.players[playerId].homeCount++;
                sfx.playMove();
                gameState.statusMsg = `🎉 ${COLOR_NAMES[playerId]}'s Token #${tokenId + 1} reached HOME!`;
                if (gameState.players[playerId].homeCount === 4) {
                    gameState.winner = playerId;
                    gameState.statusMsg = `🏆 Player ${COLOR_NAMES[playerId]} has WON the game!`;
                    gameState.diceRolled = 0;
                    renderBoard();
                    return;
                }
            } else if (nextStep <= 50) {
                // Check Capture on common track
                const startOffset = playerId * 13;
                const destTile = (startOffset + nextStep) % 52;

                if (!SAFE_SPOTS.includes(destTile)) {
                    for (let opp = 0; opp < 4; opp++) {
                        if (opp === playerId) continue;
                        for (let ot = 0; ot < 4; ot++) {
                            const oStep = gameState.players[opp].tokens[ot];
                            if (oStep >= 0 && oStep <= 50) {
                                const oTile = (opp * 13 + oStep) % 52;
                                if (oTile === destTile) {
                                    // Captured!
                                    gameState.players[opp].tokens[ot] = -1;
                                    sfx.playCapture();
                                    gameState.statusMsg = `⚔️ ${COLOR_NAMES[playerId]} captured ${COLOR_NAMES[opp]}'s Token #${ot + 1}!`;
                                    break;
                                }
                            }
                        }
                    }
                }
                sfx.playMove();
            } else {
                sfx.playMove();
            }
        }

        gameState.diceRolled = 0;
        if (dice === 6) {
            gameState.extraTurn = 1;
            gameState.statusMsg += " (Rolled a 6 -> Extra Turn!)";
        } else {
            gameState.extraTurn = 0;
            gameState.currentPlayer = (gameState.currentPlayer + 1) % 4;
            gameState.lastDice = 0;
        }

        renderBoard();
    }

    function executeOfflineRoll() {
        if (gameState.diceRolled || gameState.winner !== -1) return;

        diceVisual.classList.add('rolling');
        sfx.playDiceRoll();

        setTimeout(() => {
            diceVisual.classList.remove('rolling');
            const dice = Math.floor(Math.random() * 6) + 1;
            gameState.lastDice = dice;
            gameState.diceRolled = 1;

            if (!hasValidMoves(gameState.currentPlayer, dice)) {
                gameState.statusMsg = `${COLOR_NAMES[gameState.currentPlayer]} rolled ${dice}, but has no valid moves. Passing turn.`;
                gameState.diceRolled = 0;
                gameState.currentPlayer = (gameState.currentPlayer + 1) % 4;
            } else {
                gameState.statusMsg = `${COLOR_NAMES[gameState.currentPlayer]} rolled ${dice}! Select a token to move.`;
            }

            renderBoard();
        }, 400);
    }

    /* --- User Action Handlers --- */
    function handleRollClick() {
        if (isOnlineMode) {
            if (!socket || myPlayerSlot !== gameState.currentPlayer) return;
            diceVisual.classList.add('rolling');
            sfx.playDiceRoll();
            setTimeout(() => diceVisual.classList.remove('rolling'), 400);
            socket.emit('roll-dice');
        } else {
            executeOfflineRoll();
        }
    }

    function handleTokenClick(playerId, tokenId) {
        if (isOnlineMode) {
            if (!socket || myPlayerSlot !== playerId) return;
            socket.emit('move-token', { tokenId });
        } else {
            executeOfflineMove(playerId, tokenId);
        }
    }

    /* --- Online Socket.io Setup --- */
    function setupSocket() {
        if (socket) return;

        socket = io();

        socket.on('connect', () => {
            console.log("Connected to Ludo Server!");
        });

        socket.on('room-created', (data) => {
            currentRoomId = data.roomId;
            myPlayerSlot = data.playerSlot;
            gameState = data.state;
            displayRoomCode.textContent = currentRoomId;
            roomInfo.classList.remove('hidden');
            chatCard.classList.remove('hidden');
            updatePlayersLobby(data.players);
            renderBoard();
        });

        socket.on('room-joined', (data) => {
            currentRoomId = data.roomId;
            myPlayerSlot = data.playerSlot;
            gameState = data.state;
            displayRoomCode.textContent = currentRoomId;
            roomInfo.classList.remove('hidden');
            chatCard.classList.remove('hidden');
            updatePlayersLobby(data.players);
            renderBoard();
        });

        socket.on('players-updated', (data) => {
            updatePlayersLobby(data.players);
            if (data.state) {
                gameState = data.state;
                renderBoard();
            }
        });

        socket.on('state-updated', (data) => {
            gameState = data.state;
            renderBoard();
        });

        socket.on('chat-message', (data) => {
            appendChatMessage(data.sender, data.color, data.text);
        });

        socket.on('error-msg', (msg) => {
            alert(msg);
        });
    }

    function updatePlayersLobby(players) {
        playersChips.innerHTML = '';
        players.forEach(p => {
            const chip = document.createElement('span');
            chip.className = `player-chip chip-${p.color.toLowerCase()}`;
            chip.textContent = `${p.color}: ${p.name} ${p.id === myPlayerSlot ? '(You)' : ''}`;
            playersChips.appendChild(chip);
        });
    }

    function appendChatMessage(sender, color, text) {
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<strong style="color:${color.toLowerCase()}">${sender}:</strong> ${text}`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /* --- Event Listeners --- */
    btnRollDice.addEventListener('click', handleRollClick);
    diceElement.addEventListener('click', handleRollClick);

    // Mode Tabs
    tabOffline.addEventListener('click', () => {
        isOnlineMode = false;
        myPlayerSlot = null;
        tabOffline.classList.add('active');
        tabOnline.classList.remove('active');
        onlineLobby.classList.add('hidden');
        chatCard.classList.add('hidden');
        renderBoard();
    });

    tabOnline.addEventListener('click', () => {
        isOnlineMode = true;
        tabOnline.classList.add('active');
        tabOffline.classList.remove('active');
        onlineLobby.classList.remove('hidden');
        setupSocket();
        renderBoard();
    });

    // Room creation / join
    btnCreateRoom.addEventListener('click', () => {
        setupSocket();
        const name = playerNameInput.value || "Host";
        socket.emit('create-room', { name });
    });

    btnJoinRoom.addEventListener('click', () => {
        setupSocket();
        const code = roomCodeInput.value.toUpperCase().trim();
        const name = playerNameInput.value || "Guest";
        if (!code) return alert("Please enter room code!");
        socket.emit('join-room', { roomId: code, name });
    });

    btnCopyCode.addEventListener('click', () => {
        if (currentRoomId) {
            navigator.clipboard.writeText(currentRoomId);
            btnCopyCode.textContent = "Copied! ✅";
            setTimeout(() => btnCopyCode.textContent = "📋 Copy", 2000);
        }
    });

    // Quick Reactions
    document.querySelectorAll('.btn-reaction').forEach(btn => {
        btn.addEventListener('click', () => {
            if (socket && currentRoomId) {
                socket.emit('send-chat', { text: btn.dataset.msg });
            }
        });
    });

    // Mute Button
    btnMute.addEventListener('click', () => {
        sfx.muted = !sfx.muted;
        btnMute.textContent = sfx.muted ? '🔇' : '🔊';
    });

    // C Logic Info Modal
    btnCInfo.addEventListener('click', () => cModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => cModal.classList.add('hidden'));

    // Restart Button
    btnRestart.addEventListener('click', () => {
        if (isOnlineMode && socket && currentRoomId) {
            socket.emit('restart-game');
        } else {
            gameState.currentPlayer = 0;
            gameState.lastDice = 0;
            gameState.diceRolled = 0;
            gameState.extraTurn = 0;
            gameState.winner = -1;
            gameState.statusMsg = "Game restarted! Red player's turn.";
            for (let p = 0; p < 4; p++) {
                gameState.players[p].homeCount = 0;
                gameState.players[p].tokens = [-1, -1, -1, -1];
            }
            winnerModal.classList.add('hidden');
            renderBoard();
        }
    });

    btnPlayAgain.addEventListener('click', () => {
        winnerModal.classList.add('hidden');
        btnRestart.click();
    });

    // Initial Setup
    buildBoardDOM();
    renderDiceFace(1);
    renderBoard();

})();
