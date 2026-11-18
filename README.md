# 🎲 Ludo Champion (C Language Core Engine)

A full-stack, real-time multiplayer Ludo Game powered by a pure **C Language (C99)** rules engine, integrated with **Node.js**, **Express**, **Socket.io**, and **HTML5**.

Designed specifically for 1st Year CSE students to demonstrate core programming concepts (Structures, Arrays, Functions, Pointers, Modulo Arithmetic) in college viva and practical examinations.

---

## 🌟 Key Features

1. **Pure C Language Engine (`c_src/ludo.c`)**:
   - Manages board representation, relative coordinate transformations, token positions, dice rolling, safe spot verifications, capture logic, home stretch, and winning conditions.
   - Standard 1st-year CSE syntax without complex dependencies.
2. **Custom Rules Supported**:
   - **Unlock from Base**: Any dice roll (1 to 6) unlocks a token directly to the player's start tile.
   - **Bonus Turn on 6**: Rolling a 6 grants an immediate extra turn.
   - **8 Safe Spots**: 4 start squares + 4 star squares prevent token captures.
   - **Opponent Capture**: Non-safe collisions send opponent tokens back to base.
3. **Dual Play Modes**:
   - **Offline Pass & Play**: 4 players play locally on the same screen/device.
   - **Online Multiplayer**: Real-time room-code based multiplayer across different devices.
4. **Deployable on Render with UptimeRobot**:
   - Includes `/ping` keep-alive route preventing Render instances from sleeping.

---

## 📂 Project Directory Structure

```text
ludo-game/
├── c_src/
│   ├── ludo.h                 # C Header: structures, constants, function prototypes
│   └── ludo.c                 # C Logic: core engine, CLI game & JSON bridge
├── server/
│   └── server.js              # Node.js + Express + Socket.io bridge
├── public/
│   ├── index.html             # Responsive 15x15 Ludo board UI
│   ├── style.css              # Modern vibrant theme & 3D animated dice
│   └── game.js                # Canvas/DOM controller, Web Audio SFX & socket sync
├── docs/
│   ├── VIVA_EXPLANATION.md    # Complete A-to-Z teacher explanation & viva notes
│   └── DEPLOYMENT_GUIDE.md    # Render + UptimeRobot deployment walkthrough
├── Makefile                   # C compilation helper
└── package.json               # Node.js dependencies & scripts
```

---

## ⚡ Quick Start

### 1. Run Terminal Interactive Game (Pure C):
```bash
gcc -O2 c_src/ludo.c -o ludo_engine
./ludo_engine
```

### 2. Run Local Web Server (Online/Offline Web App):
```bash
npm install
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 📚 Viva & Teacher Explanation
Check [docs/VIVA_EXPLANATION.md](docs/VIVA_EXPLANATION.md) for full viva Q&A and code breakdown.
