# 🌐 GitHub Pages Deployment Guide (100% Free & Forever Live)

Ye guide aapko batayegi ki kaise aap is Ludo project ko **GitHub Pages** par 2 minute mein deploy kar sakte hain, jahan ye **100% Free** chalega aur **WebRTC Peer-to-Peer** ke through real-time multiplayer bhi chalega!

---

## 📌 Step 1: GitHub Par New Repository Banayein

1. Apne browser mein [https://github.com/new](https://github.com/new) kholein.
2. Form mein:
   * **Repository name**: `ludo-c-game` (ya apni pasand ka koi bhi naam)
   * **Description**: `Multiplayer Ludo Game powered by C Language Core Logic & WebRTC`
   * **Visibility**: **Public** (zaroori hai GitHub Pages ke free deployment ke liye)
   * *Initialize this repository with...*: Sabhi checkboxes ko **UNCHECKED (Khali)** chhod dein!
3. Click karein: **Create repository**.

---

## 📌 Step 2: Apne Laptop Se Code GitHub Par Push Karein

Apne terminal mein ye commands run karein:

```bash
# 1. Project directory mein jayein
cd /Users/balajimishra/.gemini/antigravity/scratch/ludo-game

# 2. Saare files add karein aur commit karein
git add .
git commit -m "Configure for 100% free GitHub Pages deployment with WebRTC multiplayer"

# 3. Main branch set karein
git branch -M main

# 4. Apne GitHub repo ka URL jodein (Apna GitHub username daalein):
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/ludo-c-game.git

# Agar pehle se koi remote tha, toh use update karein:
# git remote set-url origin https://github.com/<YOUR_GITHUB_USERNAME>/ludo-c-game.git

# 5. Push kar dein!
git push -u origin main
```

---

## 📌 Step 3: GitHub Pages Enable Karna (Sirf 2 Clicks!)

1. GitHub par apni repository (`ludo-c-game`) ke page par jayein.
2. Upar menu bar mein **⚙️ Settings** tab par click karein.
3. Left side panel mein **Pages** par click karein.
4. **Build and deployment** section ke andar:
   * **Source**: `Deploy from a branch` select karein.
   * **Branch**: `main` select karein aur folder `/ (root)` hi rehne dein.
   * Click karein: **Save**!

⏳ **Bas 1 se 2 minute wait kijiye!**  
GitHub aapki site automatically live kar dega aur upar aapko ek green notification ke sath aapka **Live URL** mil jayega:
👉 **`https://<YOUR_GITHUB_USERNAME>.github.io/ludo-c-game/`**

---

## 🎮 Doston Ke Sath Kaise Khelein (Online Multi-device):

1. **Host (Red):**
   * Apne mobile ya laptop par live link kholein: `https://<YOUR_GITHUB_USERNAME>.github.io/ludo-c-game/`
   * **Online Multiplayer** tab par click karein.
   * Apna naam likhein aur **➕ Create Room** par click karein.
   * Ek 5-letter **Room Code** aayega (jaise: `A8X2K`). **Copy** karke WhatsApp/Chat par doston ko bhejein.

2. **Dost (Green, Yellow, Blue):**
   * Apne-apne phone par wahi link kholein.
   * **Online Multiplayer** tab par jayein.
   * Room code daal kar **Join Room** par click karein!

3. **Game Shuru:**
   * Chaaron log alag-alag phone se jud jayenge.
   * Dice roll karne par WebRTC ke zariye sabhi ke screen par instant sync hoga!
   * Koi server nahi, koi sleep time nahi, aur koi hosting bill nahi! 🚀
