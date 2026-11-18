# 🚀 Ludo Game Deployment Guide: Render + UptimeRobot (Free 24/7 Hosting)

Ye guide aapko step-by-step batayegi ki kaise aap is project ko **GitHub** par daal kar **Render** par free deploy kar sakte hain, aur **UptimeRobot** se 24/7 active rakh sakte hain.

---

## 📌 Step 1: Code Ko GitHub Par Push Karna

1. Apne terminal mein project directory par jayein:
   ```bash
   cd /Users/balajimishra/.gemini/antigravity/scratch/ludo-game
   ```

2. Git repository initialize karein aur commit karein:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Ludo Game with C Engine"
   ```

3. GitHub.com par jaakar ek naya **Public Repository** banayein (naam: `ludo-c-game`).

4. Apne local code ko GitHub se link karke push karein:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/ludo-c-game.git
   git push -u origin main
   ```

---

## 📌 Step 2: Render.com Par Free Deploy Karna

1. [https://render.com](https://render.com) par jayein aur **Sign In with GitHub** karein.
2. Dashboard par **New +** button par click karke **Web Service** choose karein.
3. Apni GitHub repository (`ludo-c-game`) select karein.
4. Settings form mein ye details bharein:
   * **Name**: `ludo-c-game` (ya apni pasand ka koi bhi naam)
   * **Region**: Singapore / Frankfurt (koi bhi paas ka region)
   * **Branch**: `main`
   * **Root Directory**: (Isko blank / empty chhod dein)
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && gcc -O2 c_src/ludo.c -o ludo_engine
     ```
   * **Start Command**:
     ```bash
     node server/server.js
     ```
   * **Instance Type**: `Free` ($0/month)
5. Neeche **Create Web Service** button par click kar dein!

> ⏳ **Note:** Render 2 se 3 minute mein aapka code download karega, GCC se C code compile karega, aur server start kar dega.  
> Deploy hote hi aapko upar ek URL milega, jaise:  
> `https://ludo-c-game.onrender.com`

---

## 📌 Step 3: UptimeRobot Setup Karna (Render Ko Sone Se Rokne Ke Liye)

Render ka Free tier 15 minute baad inactive hokar band ho jata hai. UptimeRobot lagane ke baad ye **kabhi sleep nahi karega**!

1. [https://uptimerobot.com](https://uptimerobot.com) par jayein aur free account banayein / login karein.
2. Dashboard par **+ Add New Monitor** par click karein.
3. Form mein ye bharein:
   * **Monitor Type**: `HTTP(s)`
   * **Friendly Name**: `Ludo Game KeepAlive`
   * **URL (or IP)**: Aapke Render URL ke aage `/ping` lagayein:  
     `https://ludo-c-game.onrender.com/ping`
   * **Monitoring Interval**: `Every 5 minutes`
4. **Create Monitor** par click kar dein!

🎉 **Mubarak ho!** Ab UptimeRobot har 5 minute mein aapke server ko ping karega aur Render ka server 24/7 bina kisi rukawat ke online rahega!

---

## 🎮 Khelne Ka Tareeka

1. Apne doston ko link bhejiye: `https://ludo-c-game.onrender.com`
2. **Online Mode** select karein.
3. Ek dost **Create Room** par click karega aur Room Code copy karega.
4. Baaki 3 dost **Room Code** daal kar **Join** karenge.
5. Chaaro log alag-alag phone/laptop se real-time Ludo khelenge, aur saara logic C Engine calculate karega!
