const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "users_db.json");
const GITHUB_JSON_URL = "https://raw.githubusercontent.com/s-pro-v/json-lista/refs/heads/main/mobile-grafik.json";

// Konfiguracja zmiennych środowiskowych (Render / .env)
const JWT_SECRET = process.env.JWT_SECRET || "oxy_os_tactical_auth_jwt_key_9941_sec";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || "s-pro-v";
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || "json-lista";
const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || "users_db.json";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), "utf-8");
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
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), "utf-8");
    }

    return users;
}

function saveUsers(users) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), "utf-8");
        console.log(`[DB] Pomyślnie zaktualizowano lokalny plik ${DB_FILE}`);
        return true;
    } catch (e) {
        console.error(`[DB ERROR] Błąd zapisu do pliku:`, e);
        return false;
    }
}

// ========================================================
// INTEGRACJA Z GITHUB REST API (COMMIT NA BAZIE TOKENA)
// ========================================================
async function fetchUsersFromGitHub() {
    if (!GITHUB_TOKEN) return null;

    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;
        const res = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "OXY_OS-Auth-Server"
            }
        });

        if (!res.ok) {
            console.warn(`[GITHUB WARN] Status pobierania pliku: ${res.status}`);
            return null;
        }

        const data = await res.json();
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return {
            sha: data.sha,
            users: JSON.parse(content)
        };
    } catch (err) {
        console.error(`[GITHUB FETCH ERROR]`, err.message);
        return null;
    }
}

async function commitUsersToGitHub(usersList, commitMessage = "chore(auth): update users_db.json") {
    if (!GITHUB_TOKEN) {
        console.warn("[GITHUB] Brak GITHUB_TOKEN w zmiennych środowiskowych. Pominięto commit do repozytorium.");
        return false;
    }

    try {
        const currentFile = await fetchUsersFromGitHub();
        const sha = currentFile ? currentFile.sha : undefined;

        const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`;
        const contentBase64 = Buffer.from(JSON.stringify(usersList, null, 2), "utf-8").toString("base64");

        const bodyPayload = {
            message: commitMessage,
            content: contentBase64,
            branch: GITHUB_BRANCH
        };
        if (sha) bodyPayload.sha = sha;

        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "OXY_OS-Auth-Server"
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!putRes.ok) {
            const errData = await putRes.json();
            console.error("[GITHUB COMMIT ERROR]", errData);
            return false;
        }

        console.log(`[GITHUB SUCCESS] Zacommitowano zmiany do repozytorium: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} (${GITHUB_BRANCH})`);
        return true;
    } catch (err) {
        console.error("[GITHUB ERROR]", err.message);
        return false;
    }
}

// ========================================================
// MIDDLEWARE: Weryfikacja Tokenu JWT
// ========================================================
function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Wymagana autoryzacja: brak tokena." });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Sesja wygasła lub nieprawidłowy token. Zaloguj się ponownie." });
        }
        req.user = decoded;
        next();
    });
}

// ========================================================
// 1. ENDPOINT LOGOWANIA (GENERUJE JWT TOKEN)
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
        const candidate = users.find(u => (u.user || "").trim().toLowerCase() === rawLogin);
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

        const tokenPayload = {
            username: matchedUser.user,
            role: matchedUser.role,
            workerId: matchedUser.workerId
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

        return res.json({
            success: true,
            token: token,
            user: tokenPayload
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
// 3. ENDPOINT ZMIANY HASŁA (TOKEN + DYSK + COMMIT GITHUB)
// ========================================================
app.put("/api/users/:username/password", verifyToken, async (req, res) => {
    try {
        const rawParam = req.params.username;
        const decodedUser = decodeURIComponent(rawParam).trim().toLowerCase();
        const newPassword = req.body.newPassword || req.body.password || req.body.pass;

        const isSelf = req.user.username.trim().toLowerCase() === decodedUser;
        const isAdmin = req.user.role === "admin" || req.user.username.toLowerCase() === "admin";

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ success: false, message: "Brak uprawnień do zmiany hasła innego użytkownika." });
        }

        if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 3) {
            return res.status(400).json({ success: false, message: "Hasło musi mieć co najmniej 3 znaki." });
        }

        let users = loadUsers();
        let userObj = users.find(u => (u.user || "").trim().toLowerCase() === decodedUser);

        if (!userObj) {
            const ghData = await fetchUsersFromGitHub();
            if (ghData && Array.isArray(ghData.users)) {
                users = ghData.users;
                userObj = users.find(u => (u.user || "").trim().toLowerCase() === decodedUser);
            }
        }

        if (!userObj) {
            return res.status(404).json({ success: false, message: `Nie znaleziono profilu "${decodedUser}" w bazie danych.` });
        }

        userObj.pass = bcrypt.hashSync(newPassword.trim(), 10);
        saveUsers(users);

        let githubCommitted = false;
        if (GITHUB_TOKEN) {
            githubCommitted = await commitUsersToGitHub(
                users,
                `sec(auth): zmiana hasła dla użytkownika ${userObj.user}`
            );
        }

        return res.json({
            success: true,
            user: userObj.user,
            githubSynced: githubCommitted,
            updatedFile: path.basename(DB_FILE),
            message: githubCommitted
                ? `Hasło dla "${userObj.user}" zostało zapisane na serwerze i zacommitowane do GitHub!`
                : `Hasło dla "${userObj.user}" zostało zapisane w lokalnej bazie serwera.`
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Błąd serwera: " + err.message });
    }
});

// ========================================================
// 4. ENDPOINT DODAWANIA UŻYTKOWNIKA (TOKEN + COMMIT GITHUB)
// ========================================================
app.post("/api/users", verifyToken, async (req, res) => {
    const isAdmin = req.user.role === "admin" || req.user.username.toLowerCase() === "admin";
    if (!isAdmin) {
        return res.status(403).json({ success: false, message: "Tylko administrator może tworzyć nowe konta." });
    }

    const user = req.body.user || req.body.username;
    const pass = req.body.pass || req.body.password;
    const role = req.body.role || "custom";

    if (!user || !pass) {
        return res.status(400).json({ success: false, message: "Wymagany login i hasło." });
    }

    const users = loadUsers();
    const cleanUser = String(user).trim().replace(/\s+/g, "_");
    const cleanPass = String(pass).trim();

    if (users.some(u => (u.user || "").toLowerCase() === cleanUser.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Użytkownik o tym loginie już istnieje na serwerze." });
    }

    const newUser = {
        user: cleanUser,
        pass: bcrypt.hashSync(cleanPass, 10),
        role: role,
        workerId: null
    };

    users.push(newUser);
    saveUsers(users);

    let githubCommitted = false;
    if (GITHUB_TOKEN) {
        githubCommitted = await commitUsersToGitHub(
            users,
            `feat(auth): dodano konto ${newUser.user}`
        );
    }

    res.json({
        success: true,
        githubSynced: githubCommitted,
        updatedFile: path.basename(DB_FILE),
        message: `Konto ${newUser.user} zostało dodane i zapisane.`,
        user: { user: newUser.user, role: newUser.role, workerId: newUser.workerId }
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
        version: "2.3.0 (Token + GitHub Auth)",
        usersCount: users.length,
        githubConfigured: Boolean(GITHUB_TOKEN),
        serverTime: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// ========================================================
// 6. USUWANIE KONTA (TOKEN + COMMIT GITHUB)
// ========================================================
app.delete("/api/users/:username", verifyToken, async (req, res) => {
    const isAdmin = req.user.role === "admin" || req.user.username.toLowerCase() === "admin";
    if (!isAdmin) {
        return res.status(403).json({ success: false, message: "Tylko administrator może usuwać konta." });
    }

    const { username } = req.params;
    const cleanUser = decodeURIComponent(username).trim().toLowerCase();
    let users = loadUsers();

    if (cleanUser === "admin" || cleanUser === "robert_s") {
        return res.status(403).json({ success: false, message: "Konta głównego administratora nie można usunąć." });
    }

    const prevLen = users.length;
    users = users.filter(u => (u.user || "").trim().toLowerCase() !== cleanUser);

    if (users.length === prevLen) {
        return res.status(404).json({ success: false, message: "Nie znaleziono użytkownika na serwerze." });
    }

    saveUsers(users);

    let githubCommitted = false;
    if (GITHUB_TOKEN) {
        githubCommitted = await commitUsersToGitHub(
            users,
            `chore(auth): usunięto konto ${username}`
        );
    }

    res.json({
        success: true,
        githubSynced: githubCommitted,
        message: `Konto ${username} usunięte z bazy serwera.`
    });
});

// ========================================================
// 7. SYNCHRONIZACJA Z GRAFIKIEM GITHUB
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
                const exists = users.find(u => (u.user || "").toLowerCase() === userName.toLowerCase());

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

        if (addedCount > 0 && GITHUB_TOKEN) {
            await commitUsersToGitHub(users, `chore(auth): synchronizacja kont z grafiku (${addedCount} nowych)`);
        }

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
    console.log(`[OXY_OS] Serwer autoryzacji z Tokenem JWT i GitHub Commit działa na porcie ${PORT}`);
});