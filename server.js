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

// Prosty rejestr prób logowania (ochrona przed atakami Brute-Force na IP)
const loginAttempts = new Map();

// Rejestr aktywnych sesji: username -> timestamp (ostatnia aktywność)
const activeSessions = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const entry = loginAttempts.get(ip);
    if (!entry) return false;
    if (now > entry.resetAt) {
        loginAttempts.delete(ip);
        return false;
    }
    return entry.count >= 5;
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

// Sprawdzenie czy hasło jest już haszem bcrypt
function isHash(pass) {
    return typeof pass === "string" && (pass.startsWith("$2a$") || pass.startsWith("$2b$"));
}

// Baza danych użytkowników z automatycznym haszowaniem tekstu jawnego
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

    // Automatyczna migracja istniejących haseł tekstowych do bcrypt
    let migrated = false;
    users.forEach(u => {
        if (!isHash(u.pass)) {
            u.pass = bcrypt.hashSync(u.pass, 10);
            migrated = true;
        }
    });

    if (migrated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
        console.log("[SECURITY] Zmigrowano dotychczasowe hasła tekstowe do skrótów Bcrypt.");
    }

    return users;
}

function saveUsers(users) {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

function generateUniquePass(firstName, workerId, fallbackIdx, existingUsers) {
    const cleanFirst = (firstName || "Pracownik").trim().split(" ")[0];
    const idPart = workerId != null ? workerId : fallbackIdx + 1;
    return `${cleanFirst}${idPart}`;
}

// ========================================================
// ENDPOINT: Logowanie (Obsługa admina i pracowników)
// ========================================================
app.post("/api/login", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (isRateLimited(clientIp)) {
        return res.status(429).json({
            success: false,
            message: "Zbyt wiele prób logowania. Odczekaj 60 sekund."
        });
    }

    const { login, password } = req.body;
    const users = loadUsers();
    const rawLogin = (login || "").trim().toLowerCase();
    const rawPass = (password || "").trim();

    if (!rawPass && !rawLogin) {
        return res.status(400).json({ success: false, message: "Wprowadź hasło lub login." });
    }

    let matchedUser = null;

    // 1. Logowanie z podanym loginem i hasłem (szybkie - O(1))
    if (rawLogin && rawPass) {
        const candidate = users.find(u => u.user.toLowerCase() === rawLogin);
        if (candidate && bcrypt.compareSync(rawPass, candidate.pass)) {
            matchedUser = candidate;
        }
    }
    // 2. Logowanie samym hasłem (weryfikacja skrótu)
    else if (rawPass) {
        for (const u of users) {
            if (bcrypt.compareSync(rawPass, u.pass)) {
                matchedUser = u;
                break;
            }
        }
    }

    if (matchedUser) {
        resetAttempts(clientIp);
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
        message: "Odmowa autoryzacji: nieprawidłowe hasło."
    });
});

// ========================================================
// ENDPOINT: Pobieranie listy użytkowników (BEZ UJAWNIANIA HASEŁ)
// ========================================================
app.get("/api/users", (req, res) => {
    const users = loadUsers();
    
    // Zwracamy listę bez hashy kryptograficznych dla bezpieczeństwa
    const sanitized = users.map(u => ({
        user: u.user,
        role: u.role,
        workerId: u.workerId,
        lastSeen: activeSessions.get(u.user.toLowerCase()) || null
    }));
    res.json({ success: true, users: sanitized });
});

// ========================================================
// ENDPOINT: Dodanie użytkownika przez administratora
// ========================================================
app.post("/api/users", (req, res) => {
    const { user, pass, role } = req.body;
    if (!user || !pass) {
        return res.status(400).json({ success: false, message: "Wymagany login i hasło." });
    }

    const users = loadUsers();
    const cleanUser = user.trim().replace(/\s+/g, "_");
    const cleanPass = pass.trim();

    if (users.some(u => u.user.toLowerCase() === cleanUser.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Użytkownik o tym loginie już istnieje." });
    }

    // Haszowanie nowego hasła przed zapisem do bazy
    const hashedPass = bcrypt.hashSync(cleanPass, 10);
    const newUser = { user: cleanUser, pass: hashedPass, role: role || "custom", workerId: null };
    users.push(newUser);
    saveUsers(users);

    res.json({
        success: true,
        user: { user: newUser.user, role: newUser.role, workerId: newUser.workerId }
    });
});

// ========================================================
// ENDPOINT: Usunięcie konta
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
        return res.status(404).json({ success: false, message: "Nie znaleziono użytkownika." });
    }

    saveUsers(users);
    res.json({ success: true, message: "Konto usunięte." });
});

// ========================================================
// ENDPOINT: Status serwera i bazy
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
        version: "2.0.0",
        usersCount: users.length,
        serverTime: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// ========================================================
// ENDPOINT: Zmiana / Reset hasła użytkownika
// ========================================================
app.put("/api/users/:username/password", (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 3) {
        return res.status(400).json({ success: false, message: "Hasło musi mieć co najmniej 3 znaki." });
    }

    const users = loadUsers();
    const userObj = users.find(u => u.user.toLowerCase() === username.toLowerCase());

    if (!userObj) {
        return res.status(404).json({ success: false, message: "Nie znaleziono użytkownika." });
    }

    userObj.pass = bcrypt.hashSync(newPassword.trim(), 10);
    saveUsers(users);

    res.json({
        success: true,
        message: `Hasło dla "${userObj.user}" zostało zaktualizowane.`
    });
});


// ========================================================
// ENDPOINT: Synchronizacja z GitHub z bezpiecznym haszowaniem
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
                if (!w.name || w.name.trim() === "" || w.name === "Przykład") return;

                const userName = w.name.trim().replace(/\s+/g, "_");
                const exists = users.find(u => u.user.toLowerCase() === userName.toLowerCase());

                if (!exists) {
                    const plainPass = w.pass ? w.pass.trim() : generateUniquePass(w.name, w.id, idx, users);
                    // Zapisujemy wyłącznie zahaszowane hasło
                    users.push({
                        user: userName,
                        pass: bcrypt.hashSync(plainPass, 10),
                        role: "worker",
                        workerId: w.id || null
                    });
                    addedCount++;
                } else {
                    if (w.id != null && exists.workerId == null) exists.workerId = w.id;
                    if (w.pass && !bcrypt.compareSync(w.pass.trim(), exists.pass)) {
                        exists.pass = bcrypt.hashSync(w.pass.trim(), 10);
                    }
                }
            });
        });

        saveUsers(users);
        res.json({ success: true, addedCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Serwowanie plików frontendu
app.use(express.static(path.join(__dirname, ".")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`[OXY_OS] Bezpieczny serwer autoryzacji uruchomiony na porcie ${PORT}`);
});