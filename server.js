const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "users_db.json");
const GITHUB_JSON_URL = "https://raw.githubusercontent.com/s-pro-v/json-lista/refs/heads/main/mobile-grafik.json";

app.use(cors());
app.use(express.json());

const loginAttempts = new Map();
const activeSessions = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const entry = loginAttempts.get(ip);
    if (!entry) return false;
    if (now > entry.resetAt) {
        loginAttempts.delete(ip);
        return false;
    }
    return entry.count >= 10;
}

function registerFailedAttempt(ip) {
    const now = Date.now();
    const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
    entry.count++;
    loginAttempts.set(ip, entry);
}

function resetAttempts(ip) {
    loginAttempts.delete(ip);
}

function isHash(pass) {
    return typeof pass === "string" && (pass.startsWith("$2a$") || pass.startsWith("$2b$"));
}

function loadUsers() {
    let users = [];
    if (!fs.existsSync(DB_FILE)) {
        users = [
            { user: "admin", pass: bcrypt.hashSync("admin123", 10), role: "admin", workerId: null }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
        return users;
    }

    try {
        users = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
        users = [{ user: "admin", pass: bcrypt.hashSync("admin123", 10), role: "admin", workerId: null }];
    }

    let migrated = false;
    users.forEach(u => {
        if (!isHash(u.pass)) {
            u.pass = bcrypt.hashSync(String(u.pass || "123"), 10);
            migrated = true;
        }
    });

    if (migrated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    }

    return users;
}

function saveUsers(users) {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// ========================================================
// 1. ENDPOINT LOGOWANIA Z SERWERA
// ========================================================
app.post("/api/login", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (isRateLimited(clientIp)) {
        return res.status(429).json({
            success: false,
            message: "Zbyt wiele nieudanych prób logowania. Odczekaj 60 sekund."
        });
    }

    const login = req.body.login || req.body.username || req.body.user;
    const password = req.body.password || req.body.pass;
    const users = loadUsers();
    const rawLogin = String(login || "").trim().toLowerCase();
    const rawPass = String(password || "").trim();

    if (!rawPass && !rawLogin) {
        return res.status(400).json({ success: false, message: "Wprowadź login oraz hasło." });
    }

    let matchedUser = null;

    if (rawLogin && rawPass) {
        const candidate = users.find(u => u.user.toLowerCase() === rawLogin);
        if (candidate) {
            const isValid = isHash(candidate.pass)
                ? bcrypt.compareSync(rawPass, candidate.pass)
                : candidate.pass === rawPass;

            if (isValid) {
                if (!isHash(candidate.pass)) {
                    candidate.pass = bcrypt.hashSync(rawPass, 10);
                    saveUsers(users);
                }
                matchedUser = candidate;
            }
        }
    } else if (rawPass) {
        for (const u of users) {
            const isValid = isHash(u.pass) ? bcrypt.compareSync(rawPass, u.pass) : u.pass === rawPass;
            if (isValid) {
                matchedUser = u;
                break;
            }
        }
    }

    if (matchedUser) {
        resetAttempts(clientIp);
        activeSessions.set(matchedUser.user.toLowerCase(), Date.now());
        return res.json({
            success: true,
            user: {
                username: matchedUser.user,
                role: matchedUser.role,
                workerId: matchedUser.workerId
            }
        });
    }

    registerFailedAttempt(clientIp);
    return res.status(401).json({
        success: false,
        message: "Odmowa autoryzacji: nieprawidłowe hasło lub login."
    });
});

// ========================================================
// 2. ENDPOINT POBIERANIA LISTY PROFILI
// ========================================================
app.get("/api/users", (req, res) => {
    const users = loadUsers();
    const sanitized = users.map(u => ({
        user: u.user,
        role: u.role,
        workerId: u.workerId,
        lastSeen: activeSessions.get(u.user.toLowerCase()) || null
    }));
    res.json({ success: true, users: sanitized });
});

// ========================================================
// 3. ENDPOINT DODAWANIA UŻYTKOWNIKA (BCRYPT NA SERWERZE)
// ========================================================
app.post("/api/users", (req, res) => {
    const user = req.body.user || req.body.username;
    const pass = req.body.pass || req.body.password;
    const role = req.body.role || "custom";

    if (!user || !pass) {
        return res.status(400).json({ success: false, message: "Wymagany login i hasło." });
    }

    const users = loadUsers();
    const cleanUser = String(user).trim().replace(/\s+/g, "_");
    const cleanPass = String(pass).trim();

    if (users.some(u => u.user.toLowerCase() === cleanUser.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Użytkownik o tym loginie już istnieje na serwerze." });
    }

    const hashedPass = bcrypt.hashSync(cleanPass, 10);
    const newUser = { user: cleanUser, pass: hashedPass, role: role, workerId: null };
    users.push(newUser);
    saveUsers(users);

    console.log(`[AUTH] Dodano użytkownika ${newUser.user} do bazy ${path.basename(DB_FILE)}`);

    res.json({
        success: true,
        updatedFile: path.basename(DB_FILE),
        message: `Konto ${newUser.user} zostało dodane i zapisane w pliku ${path.basename(DB_FILE)}.`,
        user: { user: newUser.user, role: newUser.role, workerId: newUser.workerId }
    });
});

// ========================================================
// 4. ENDPOINT ZMIANY HASŁA (ZAPIS W BAZIE SERWERA)
// ========================================================
app.put("/api/users/:username/password", (req, res) => {
    const { username } = req.params;
    const newPassword = req.body.newPassword || req.body.password || req.body.pass;

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 3) {
        return res.status(400).json({ success: false, message: "Hasło musi mieć co najmniej 3 znaki." });
    }

    const users = loadUsers();
    const userObj = users.find(u => u.user.toLowerCase() === String(username).trim().toLowerCase());

    if (!userObj) {
        return res.status(404).json({ success: false, message: "Nie znaleziono użytkownika w bazie serwera." });
    }

    userObj.pass = bcrypt.hashSync(newPassword.trim(), 10);
    saveUsers(users);

    console.log(`[AUTH] Zaktualizowano hasło dla ${userObj.user} w pliku ${path.basename(DB_FILE)}`);

    res.json({
        success: true,
        updatedFile: path.basename(DB_FILE),
        user: userObj.user,
        message: `Hasło dla "${userObj.user}" zostało pomyślnie zaktualizowane w pliku ${path.basename(DB_FILE)}.`
    });
});

// ========================================================
// 5. STATUS SERWERA
// ========================================================
app.get("/api/status", (req, res) => {
    const { user } = req.query;
    if (user) {
        activeSessions.set(user.toLowerCase(), Date.now());
    }

    const users = loadUsers();
    res.json({
        success: true,
        status: "ONLINE",
        version: "2.1.0",
        usersCount: users.length,
        serverTime: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// ========================================================
// 6. USUWANIE KONTA
// ========================================================
app.delete("/api/users/:username", (req, res) => {
    const { username } = req.params;
    let users = loadUsers();

    if (username.toLowerCase() === "admin" || username.toLowerCase() === "robert_s") {
        return res.status(403).json({ success: false, message: "Konta administratora nie można usunąć." });
    }

    const prevLen = users.length;
    users = users.filter(u => u.user.toLowerCase() !== username.toLowerCase());

    if (users.length === prevLen) {
        return res.status(404).json({ success: false, message: "Nie znaleziono użytkownika na serwerze." });
    }

    saveUsers(users);
    res.json({ success: true, message: `Konto ${username} usunięte z bazy serwera.` });
});

// ========================================================
// 7. SYNCHRONIZACJA KONT Z GRAFIKU DO BAZY SERWERA
// ========================================================
app.post("/api/sync-github", async (req, res) => {
    try {
        const fetchRes = await fetch(`${GITHUB_JSON_URL}?_t=${Date.now()}`);
        if (!fetchRes.ok) throw new Error("Błąd pobierania bazy grafiku z GitHub");
        const monthsData = await fetchRes.json();

        const users = loadUsers();
        let addedCount = 0;

        monthsData.forEach(m => {
            if (!m.workers || !Array.isArray(m.workers)) return;
            m.workers.forEach((w, idx) => {
                if (!w.name || w.name.trim() === "" || w.name === "Przykładowy Pracownik") return;

                const userName = w.name.trim().replace(/\s+/g, "_");
                const exists = users.find(u => u.user.toLowerCase() === userName.toLowerCase());

                if (!exists) {
                    const firstName = w.name.trim().split(" ")[0];
                    const plainPass = `${firstName}${w.id != null ? w.id : (idx + 1)}`;
                    users.push({
                        user: userName,
                        pass: bcrypt.hashSync(plainPass, 10),
                        role: "worker",
                        workerId: w.id || null
                    });
                    addedCount++;
                } else if (w.id != null && exists.workerId == null) {
                    exists.workerId = w.id;
                }
            });
        });

        saveUsers(users);
        res.json({ success: true, addedCount, updatedFile: path.basename(DB_FILE) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.use(express.static(path.join(__dirname, ".")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`[OXY_OS] Serwer autoryzacji działa na porcie ${PORT}`);
});