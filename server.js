require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

// Plik bazy użytkowników – przestawiony na main.json
const DB_FILE = path.join(__dirname, "main.json");
const GITHUB_JSON_URL = "https://raw.githubusercontent.com/s-pro-v/json-lista/refs/heads/main/mobile-grafik.json";

// Zmienne środowiskowe (Render / .env)
const JWT_SECRET = process.env.JWT_SECRET || "oxy_os_tactical_auth_jwt_key_9941_sec";
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || "").trim();
const GITHUB_REPO_OWNER = (process.env.GITHUB_REPO_OWNER || "s-pro-v").trim();
const GITHUB_REPO_NAME = (process.env.GITHUB_REPO_NAME || "json-lista").trim();
const GITHUB_FILE_PATH = (process.env.GITHUB_FILE_PATH || "main.json").trim(); // ZAWSZE main.json
const GITHUB_BRANCH = (process.env.GITHUB_BRANCH || "main").trim();

console.log("[CONFIG] Inicjalizacja serwera OXY_OS...");
console.log(`[CONFIG] Baza GitHub: ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} -> ${GITHUB_FILE_PATH} (${GITHUB_BRANCH})`);
console.log(`[CONFIG] GitHub Token: ${GITHUB_TOKEN ? "ZAŁADOWANY (długość: " + GITHUB_TOKEN.length + ")" : "BRAK TOKENA!"}`);

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
    return entry.count >= 15;
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

// Odczyt lokalny z pliku main.json
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

// Zapis lokalny do pliku main.json
function saveUsers(users) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), "utf-8");
        console.log(`[DB LOCAL] Zapisano ${users.length} kont w pliku ${DB_FILE}`);
        return true;
    } catch (e) {
        console.error(`[DB LOCAL ERROR] Błąd zapisu do pliku:`, e);
        return false;
    }
}

// ========================================================
// POBIERANIE PLIKU main.json I JEGO SHA Z GITHUB
// ========================================================
async function fetchUsersFromGitHub() {
    if (!GITHUB_TOKEN) {
        console.warn("[GITHUB API] Pominięto fetch: brak GITHUB_TOKEN");
        return null;
    }

    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;
    try {
        const res = await fetch(url, {
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "OXY-OS-Server"
            }
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[GITHUB FETCH ERROR] Status ${res.status}:`, errText);
            return null;
        }

        const data = await res.json();
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return {
            sha: data.sha,
            users: JSON.parse(content)
        };
    } catch (err) {
        console.error(`[GITHUB FETCH EXCEPTION]`, err.message);
        return null;
    }
}

// ========================================================
// COMMIT DO main.json W GITHUB PRZEZ REST API
// ========================================================
async function commitUsersToGitHub(usersList, commitMessage) {
    if (!GITHUB_TOKEN) {
        console.error("[GITHUB COMMIT ERROR] Brak zmiennej GITHUB_TOKEN w serwerze!");
        return { ok: false, error: "Brak GITHUB_TOKEN na serwerze" };
    }

    try {
        const currentData = await fetchUsersFromGitHub();
        const sha = currentData ? currentData.sha : null;

        const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`;
        const contentBase64 = Buffer.from(JSON.stringify(usersList, null, 2), "utf-8").toString("base64");

        const bodyPayload = {
            message: commitMessage || `chore(auth): aktualizacja ${GITHUB_FILE_PATH}`,
            content: contentBase64,
            branch: GITHUB_BRANCH
        };
        if (sha) {
            bodyPayload.sha = sha;
        }

        console.log(`[GITHUB COMMIT] Wysyłanie commita do ${url} (sha: ${sha || "nowy plik"})...`);

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "OXY-OS-Server"
            },
            body: JSON.stringify(bodyPayload)
        });

        const resData = await res.json().catch(() => ({}));

        if (!res.ok) {
            console.error("[GITHUB COMMIT FAILED] Błąd z GitHub API:", res.status, resData);
            return { ok: false, status: res.status, error: resData.message || "Błąd GitHub API" };
        }

        console.log(`[GITHUB COMMIT SUCCESS] Pomyślnie zacommitowano do pliku ${GITHUB_FILE_PATH} na gałęzi ${GITHUB_BRANCH}!`);
        return { ok: true, data: resData };
    } catch (err) {
        console.error("[GITHUB COMMIT EXCEPTION]", err);
        return { ok: false, error: err.message };
    }
}

// ========================================================
// MIDDLEWARE: Weryfikacja Tokenu JWT
// ========================================================
function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Brak autoryzacji: żądanie nie posiada tokena." });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Sesja wygasła. Zaloguj się ponownie." });
        }
        req.user = decoded;
        next();
    });
}

// ========================================================
// ENDPOINT: Logowanie
// ========================================================
app.post("/api/login", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (isRateLimited(clientIp)) {
        return res.status(429).json({
            success: false,
            message: "Zbyt wiele prób. Odczekaj minutę."
        });
    }

    const login = req.body.login || req.body.username || req.body.user;
    const password = req.body.password || req.body.pass;
    const users = loadUsers();
    const rawLogin = String(login || "").trim().toLowerCase();
    const rawPass = String(password || "").trim();

    if (!rawPass && !rawLogin) {
        return res.status(400).json({ success: false, message: "Wprowadź login i hasło." });
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
// ENDPOINT: Pobieranie listy kont
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
// ENDPOINT: Zmiana hasła (Zapis w main.json + Commit do GitHub)
// ========================================================
app.put("/api/users/:username/password", verifyToken, async (req, res) => {
    try {
        const rawParam = req.params.username;
        const decodedUser = decodeURIComponent(rawParam).trim().toLowerCase();
        const newPassword = req.body.newPassword || req.body.password || req.body.pass;

        console.log(`[REQ PASSWORD CHANGE] Cel: "${decodedUser}", Zmieniający: "${req.user.username}"`);

        const isSelf = req.user.username.trim().toLowerCase() === decodedUser;
        const isAdmin = req.user.role === "admin" || req.user.username.toLowerCase() === "admin";

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ success: false, message: "Brak uprawnień do zmiany hasła innego konta." });
        }

        if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 3) {
            return res.status(400).json({ success: false, message: "Hasło musi mieć co najmniej 3 znaki." });
        }

        let users = loadUsers();
        let userObj = users.find(u => (u.user || "").trim().toLowerCase() === decodedUser);

        if (!userObj) {
            return res.status(404).json({ success: false, message: `Nie znaleziono profilu "${decodedUser}" w pliku ${path.basename(DB_FILE)}.` });
        }

        // 1. Zmiana hasła i haszowanie
        userObj.pass = bcrypt.hashSync(newPassword.trim(), 10);
        saveUsers(users);

        // 2. Commit do GitHuba do pliku main.json
        let ghResult = { ok: false };
        if (GITHUB_TOKEN) {
            ghResult = await commitUsersToGitHub(
                users,
                `sec(auth): zmiana hasła dla użytkownika ${userObj.user}`
            );
        }

        return res.json({
            success: true,
            user: userObj.user,
            githubSynced: ghResult.ok,
            githubError: ghResult.ok ? null : ghResult.error,
            updatedFile: path.basename(DB_FILE),
            message: ghResult.ok
                ? `Hasło dla "${userObj.user}" zostało zapisane i zacommitowane do ${path.basename(DB_FILE)} na GitHub!`
                : `Hasło zapisano lokalnie, ale commit na GitHub do ${path.basename(DB_FILE)} się nie powiódł: ${ghResult.error || "Brak GITHUB_TOKEN"}`
        });
    } catch (err) {
        console.error("[PUT PASSWORD EXCEPTION]", err);
        return res.status(500).json({ success: false, message: "Błąd serwera: " + err.message });
    }
});

// ========================================================
// ENDPOINT: Status serwera i konfiguracji GitHub
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
        version: "2.5.0 (main.json Sync)",
        databaseFile: path.basename(DB_FILE),
        usersCount: users.length,
        githubConfigured: Boolean(GITHUB_TOKEN),
        githubRepo: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
        serverTime: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

// Inicjalizacja: Pobranie świeżego main.json z GitHuba przy starcie
async function initServerDatabase() {
    if (GITHUB_TOKEN) {
        console.log(`[INIT] Synchronizacja pliku ${GITHUB_FILE_PATH} z GitHuba...`);
        const ghData = await fetchUsersFromGitHub();
        if (ghData && Array.isArray(ghData.users)) {
            saveUsers(ghData.users);
            console.log(`[INIT] Załadowano ${ghData.users.length} kont z pliku ${GITHUB_FILE_PATH} na GitHubie.`);
        } else {
            console.warn(`[INIT] Nie udało się pobrać ${GITHUB_FILE_PATH} z GitHuba, używam lokalnego pliku.`);
        }
    }
}

app.use(express.static(path.join(__dirname, ".")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, async () => {
    console.log(`[OXY_OS] Serwer działa na porcie ${PORT}`);
    await initServerDatabase();
});