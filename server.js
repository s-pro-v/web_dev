const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "users_db.json");
const GITHUB_JSON_URL = "https://raw.githubusercontent.com/s-pro-v/json-lista/refs/heads/main/mobile-grafik.json";

app.use(cors());
app.use(express.json());

// Inicjalizacja bazy użytkowników
function loadUsers() {
    if (!fs.existsSync(DB_FILE)) {
        const initialUsers = [
            { user: "admin", pass: "admin123", role: "admin", workerId: null }
        ];
        fs.writeFileSync(DB_FILE, JSON.stringify(initialUsers, null, 2));
        return initialUsers;
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
        return [{ user: "admin", pass: "admin123", role: "admin", workerId: null }];
    }
}

function saveUsers(users) {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

function generateUniquePass(firstName, workerId, fallbackIdx, existingUsers) {
    const cleanFirst = (firstName || "Pracownik").trim().split(" ")[0];
    const idPart = workerId != null ? workerId : fallbackIdx + 1;
    let candidate = `${cleanFirst}${idPart}`;
    let counter = 1;

    while (existingUsers.some(u => u.pass && u.pass.toLowerCase() === candidate.toLowerCase())) {
        candidate = `${cleanFirst}${idPart}_${counter}`;
        counter++;
    }
    return candidate;
}

// ENDPOINT 1: Logowanie (para login+hasło lub samo unikalne hasło)
app.post("/api/login", (req, res) => {
    const { login, password } = req.body;
    const users = loadUsers();
    const rawLogin = (login || "").trim().toLowerCase();
    const rawPass = (password || "").trim();

    if (!rawPass && !rawLogin) {
        return res.status(400).json({ success: false, message: "Wprowadź hasło lub login." });
    }

    let matchedUser = null;

    // Tryb 1: Pełne logowanie (login + hasło)
    if (rawLogin && rawPass) {
        matchedUser = users.find(u => u.user.toLowerCase() === rawLogin && u.pass === rawPass);
    }
    // Tryb 2: Logowanie samym unikalnym hasłem wpisanym w pole hasła
    else if (!rawLogin && rawPass) {
        matchedUser = users.find(u => u.pass === rawPass);
    }
    // Tryb 3: Logowanie hasłem wpisanym w pierwsze pole
    else if (rawLogin && !rawPass) {
        matchedUser = users.find(u => u.pass.toLowerCase() === rawLogin);
    }

    if (matchedUser) {
        return res.json({
            success: true,
            user: {
                username: matchedUser.user,
                role: matchedUser.role,
                workerId: matchedUser.workerId
            }
        });
    }

    return res.status(401).json({
        success: false,
        message: "Odmowa autoryzacji: nieprawidłowe poświadczenia."
    });
});

// ENDPOINT 2: Pobieranie listy kont (dla panelu administratora)
app.get("/api/users", (req, res) => {
    const users = loadUsers();
    res.json({ success: true, users });
});

// ENDPOINT 3: Dodanie nowego konta
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

    if (users.some(u => u.pass.toLowerCase() === cleanPass.toLowerCase())) {
        return res.status(400).json({ success: false, message: "To hasło jest zajęte. Wpisz inne unikalne hasło." });
    }

    const newUser = { user: cleanUser, pass: cleanPass, role: role || "custom", workerId: null };
    users.push(newUser);
    saveUsers(users);

    res.json({ success: true, user: newUser });
});

// ENDPOINT 4: Usuwanie konta
app.delete("/api/users/:username", (req, res) => {
    const { username } = req.params;
    let users = loadUsers();

    if (username === "admin") {
        return res.status(403).json({ success: false, message: "Konta administratora nie można usunąć." });
    }

    const initialLen = users.length;
    users = users.filter(u => u.user.toLowerCase() !== username.toLowerCase());

    if (users.length === initialLen) {
        return res.status(404).json({ success: false, message: "Nie znaleziono użytkownika." });
    }

    saveUsers(users);
    res.json({ success: true, message: "Użytkownik usunięty." });
});

// ENDPOINT 5: Synchronizacja z GitHubem i generowanie unikalnych haseł
app.post("/api/sync-github", async (req, res) => {
    try {
        const fetchRes = await fetch(`${GITHUB_JSON_URL}?_t=${Date.now()}`);
        if (!fetchRes.ok) throw new Error("Błąd pobierania pliku z GitHub");
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
                    const pass = w.pass ? w.pass.trim() : generateUniquePass(w.name, w.id, idx, users);
                    users.push({
                        user: userName,
                        pass: pass,
                        role: "worker",
                        workerId: w.id || null
                    });
                    addedCount++;
                } else {
                    if (w.id != null && exists.workerId == null) exists.workerId = w.id;
                    if (w.pass && exists.pass !== w.pass.trim()) exists.pass = w.pass.trim();
                }
            });
        });

        saveUsers(users);
        res.json({ success: true, addedCount, users, monthsData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Serwowanie plików statycznych frontendu (HTML, CSS, JS, ikony)
app.use(express.static(path.join(__dirname, ".")));

// Fallback dla tras PWA
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`[OXY_OS] Serwer autoryzacji uruchomiony na porcie ${PORT}`);
});