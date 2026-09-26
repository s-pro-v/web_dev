(function () {
  "use strict";

  // ==========================================
  // SYNTEZATOR DŹWIĘKU SPRZĘTOWEGO (HARDWARE AUDIO)
  // ==========================================
  class HardwareAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    playClick(type = "normal") {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === "heavy") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === "switch") {
          osc.type = "square";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.start(now);
          osc.stop(now + 0.02);
        } else {
          osc.type = "sine";
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
          osc.start(now);
          osc.stop(now + 0.015);
        }
      } catch (e) {
        // Fallback w przypadku braku uprawnień audio
      }
    }
  }

  const audio = new HardwareAudio();

  // ==========================================
  // KONTROLKA TAKTYLNA: CUSTOM SELECT
  // ==========================================
  class CustomSelect {
    constructor(element, onSelectCallback = null) {
      this.container = element;
      this.chassis = element.querySelector(".select-chassis");
      this.trigger = element.querySelector(".select-trigger");
      this.optionsContainer = element.querySelector(".select-options");
      this.options = Array.from(element.querySelectorAll(".option"));
      this.hiddenInput = element.querySelector('input[type="hidden"]');
      this.triggerContent = element.querySelector(".trigger-content");
      this.onSelectCallback = onSelectCallback;

      this.isOpen = false;
      this.focusedOptionIndex = -1;

      this.init();
    }

    init() {
      this.trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        audio.playClick("switch");
        this.toggle();
      });

      this.options.forEach((opt, index) => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          audio.playClick("normal");
          this.selectOption(opt);
          this.close();
        });

        opt.addEventListener("mouseenter", () => {
          this.setFocusedIndex(index, false);
        });
      });

      this.trigger.addEventListener("keydown", (e) => this.handleKeyDown(e));

      const initialSelected = this.options.findIndex((opt) =>
        opt.classList.contains("selected")
      );
      if (initialSelected !== -1) {
        this.focusedOptionIndex = initialSelected;
      }
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        CustomSelect.closeAll(this);
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      if (this.chassis) this.chassis.classList.add("active");
      this.trigger.classList.add("active");
      this.trigger.setAttribute("aria-expanded", "true");
      this.optionsContainer.classList.add("show");

      const selected = this.options.find((opt) =>
        opt.classList.contains("selected")
      );
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      if (this.chassis) this.chassis.classList.remove("active");
      this.trigger.classList.remove("active");
      this.trigger.setAttribute("aria-expanded", "false");
      this.optionsContainer.classList.remove("show");
      this.clearKeyboardFocus();
    }

    handleKeyDown(e) {
      if (!this.isOpen) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          this.open();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.moveFocus(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          this.moveFocus(-1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (
            this.focusedOptionIndex >= 0 &&
            this.focusedOptionIndex < this.options.length
          ) {
            this.selectOption(this.options[this.focusedOptionIndex]);
            this.close();
          }
          break;
        case "Escape":
          e.preventDefault();
          this.close();
          this.trigger.focus();
          break;
      }
    }

    moveFocus(delta) {
      let newIndex = this.focusedOptionIndex + delta;
      if (newIndex < 0) newIndex = this.options.length - 1;
      if (newIndex >= this.options.length) newIndex = 0;
      this.setFocusedIndex(newIndex);
    }

    setFocusedIndex(index, scroll = true) {
      this.clearKeyboardFocus();
      this.focusedOptionIndex = index;
      const opt = this.options[index];
      if (opt) {
        opt.classList.add("keyboard-focused");
        if (scroll) opt.scrollIntoView({ block: "nearest" });
      }
    }

    clearKeyboardFocus() {
      this.options.forEach((opt) => opt.classList.remove("keyboard-focused"));
    }

    selectOption(optionElement) {
      const val = optionElement.getAttribute("data-value");
      const icon = optionElement.querySelector("i");
      const text = optionElement.textContent.trim();

      this.options.forEach((opt) => {
        const isSelected = opt === optionElement;
        opt.classList.toggle("selected", isSelected);
        opt.setAttribute("aria-selected", isSelected ? "true" : "false");
      });

      let iconHtml = "";
      if (icon) {
        iconHtml = `<i class="${icon.className}"></i>`;
      }
      this.triggerContent.innerHTML = `${iconHtml}<span>${text}</span>`;

      if (this.hiddenInput) {
        this.hiddenInput.value = val;
        this.hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      }

      if (typeof this.onSelectCallback === "function") {
        this.onSelectCallback({
          name: this.container.getAttribute("data-name"),
          value: val,
          label: text,
        });
      }
    }

    static closeAll(exceptInstance = null) {
      document.querySelectorAll(".custom-select").forEach((el) => {
        if (el._customSelect && el._customSelect !== exceptInstance) {
          el._customSelect.close();
        }
      });
    }
  }

  // ==========================================
  // SYSTEM ALERTÓW I MONITÓW OXY_OS
  // ==========================================
  function oxyAlert(message, type = "info", title = "") {
    let container = document.getElementById("oxy-alert-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "oxy-alert-container";
      document.body.appendChild(container);
    }

    const alertEl = document.createElement("div");
    alertEl.className = `oxy-alert ${type}`;

    let icon = "fa-info-circle";
    let defaultTitle = "INFORMACJA SYSTEMOWA";
    if (type === "success") {
      icon = "fa-check-circle";
      defaultTitle = "SUKCES";
    } else if (type === "error") {
      icon = "fa-exclamation-triangle";
      defaultTitle = "BŁĄD SYSTEMU";
    } else if (type === "warning") {
      icon = "fa-exclamation-circle";
      defaultTitle = "OSTRZEŻENIE";
    }

    alertEl.innerHTML = `
      <div class="oxy-alert-icon"><i class="fas ${icon}"></i></div>
      <div class="oxy-alert-content">
        <div class="oxy-alert-title">${title || defaultTitle}</div>
        <div class="oxy-alert-msg">${message}</div>
      </div>
    `;

    container.appendChild(alertEl);

    setTimeout(() => {
      alertEl.classList.add("hiding");
      setTimeout(() => {
        if (alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
      }, 300);
    }, 4000);
  }

  function oxyConfirm(message, onConfirm) {
    let overlay = document.getElementById("oxy-confirm-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "oxy-confirm-overlay";
      overlay.className = "login-overlay hidden";
      overlay.style.zIndex = "9999999";
      overlay.innerHTML = `
        <div class="login-box card" style="max-width: 380px; text-align: center; border-top: 4px solid var(--warning-color);">
          <div style="font-size: 40px; color: var(--warning-color); margin-bottom: 1rem;"><i class="fas fa-exclamation-triangle"></i></div>
          <h2 class="card-title" style="margin-bottom: 1rem;">WYMAGANE POTWIERDZENIE</h2>
          <p id="oxy-confirm-msg" style="margin-bottom: 1.5rem; color: var(--text-muted); font-size: 14px; line-height: 1.4;"></p>
          <div style="display: flex; gap: 10px;">
            <div class="btn-bg" style="flex: 1; display:flex;"><button id="oxy-confirm-no" class="btn" style="flex: 1; justify-content: center; height: 40px; border:none;">ANULUJ</button></div>
            <div class="btn-bg" style="flex: 1; display:flex;"><button id="oxy-confirm-yes" class="btn active" style="flex: 1; justify-content: center; height: 40px; background: var(--danger-color) !important; border:none; color: #fff;">TAK, WYKONAJ</button></div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    document.getElementById("oxy-confirm-msg").textContent = message;
    setTimeout(() => overlay.classList.remove("hidden"), 10);

    const btnYes = document.getElementById("oxy-confirm-yes");
    const btnNo = document.getElementById("oxy-confirm-no");

    const newBtnYes = btnYes.cloneNode(true);
    const newBtnNo = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    btnNo.parentNode.replaceChild(newBtnNo, btnNo);

    newBtnNo.addEventListener("click", () => {
      overlay.classList.add("hidden");
    });

    newBtnYes.addEventListener("click", () => {
      overlay.classList.add("hidden");
      if (typeof onConfirm === "function") onConfirm();
    });
  }

  // ==========================================
  // ZARZĄDZANIE STANEM, DANYMI I GRUPAMI
  // ==========================================
  const STORAGE_KEY = "harmonogram_data";
  const USERS_KEY = "oxy_os_users";
  const GITHUB_URL =
    "https://raw.githubusercontent.com/s-pro-v/json-lista/refs/heads/main/mobile-grafik.json";

  const groupMetadata = {
    d: { colorLight: "#d35400", colorDark: "#cc8a28" },
    s: { colorLight: "#0056b3", colorDark: "#0052cc" },
    p: { colorLight: "#3178c6", colorDark: "#5981cc" },
    k: { colorLight: "#c0392b", colorDark: "#cc6f44" },
    m: { colorLight: "#b7950b", colorDark: "#cccc00" },
    y: { colorLight: "#196f3d", colorDark: "#00cc00" },
  };

  function getDisplayShiftCode(rawShift) {
    let code = String(rawShift || "")
      .toUpperCase()
      .replace(/\s*\([^)]+\)/g, "")
      .trim();
    if (code === "P1") return "1";
    if (["P2", "N1", "N2"].includes(code)) return "2";
    return code;
  }

  function getWorkerGroupCode(w) {
    if (w.group) return w.group.toLowerCase();
    if (Array.isArray(w.shifts)) {
      for (let s of w.shifts) {
        const match = String(s || "").match(/\(\s*([a-zA-Z])\s*\)/);
        if (match) return match[1].toLowerCase();
      }
    }
    return null;
  }

  const DEFAULT_JSON = [
    {
      meta: {
        generated: new Date().toISOString(),
        days: ["1", "2", "3"],
        weekdays: ["PN", "WT", "SR"],
        month: "BRAK DANYCH",
      },
      workers: [{ id: 1, name: "Przykład", shifts: ["1 (D)", "2 (D)", ""] }],
    },
  ];

  let appState = {
    allMonths: [],
    activeMonthIdx: 0,
    content: "",
  };

  function findCurrentMonthIndex() {
    if (!appState.allMonths || appState.allMonths.length === 0) return 0;
    const polishMonths = [
      "STYCZEN", "LUTY", "MARZEC", "KWIECIEN", "MAJ", "CZERWIEC",
      "LIPIEC", "SIERPIEN", "WRZESIEN", "PAZDZIERNIK", "LISTOPAD", "GRUDZIEN",
    ];
    const currentMonthName = polishMonths[new Date().getMonth()];

    const idx = appState.allMonths.findIndex((m) => {
      if (!m.meta || !m.meta.month) return false;
      const normalizedMetaMonth = m.meta.month
        .toUpperCase()
        .replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (match) => {
          const map = {
            Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
          };
          return map[match] || match;
        });
      return normalizedMetaMonth.includes(currentMonthName);
    });
    return idx !== -1 ? idx : 0;
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          appState.allMonths = parsed;
        } else if (parsed.meta && parsed.workers) {
          appState.allMonths = [parsed];
        } else {
          throw new Error("Nieprawidłowa struktura danych");
        }
      } else {
        appState.allMonths = DEFAULT_JSON;
      }
    } catch (e) {
      console.warn("Wyrzucono uszkodzony cache lokalny.");
      appState.allMonths = DEFAULT_JSON;
      localStorage.removeItem(STORAGE_KEY);
    }
    appState.content = JSON.stringify(appState.allMonths, null, 2);
    appState.activeMonthIdx = findCurrentMonthIndex();
  }

  // ==========================================
  // ZARZĄDZANIE KONTAMI I UNIKALNYMI HASŁAMI
  // ==========================================
  function generateUniquePass(firstName, workerId, fallbackIdx, currentUsers) {
    const cleanFirst = (firstName || "Pracownik").trim().split(" ")[0];
    const idPart = workerId != null ? workerId : fallbackIdx + 1;
    let candidate = `${cleanFirst}${idPart}`;
    let counter = 1;

    while (
      currentUsers.some(
        (u) => u.pass && u.pass.toLowerCase() === candidate.toLowerCase()
      )
    ) {
      candidate = `${cleanFirst}${idPart}_${counter}`;
      counter++;
    }
    return candidate;
  }

  function cleanupDuplicatePasswords() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    const passMap = new Set();
    let modified = false;

    users.forEach((u, idx) => {
      if (u.user === "admin") {
        passMap.add(u.pass.toLowerCase());
        return;
      }

      const lowerPass = (u.pass || "").toLowerCase();
      if (!lowerPass || passMap.has(lowerPass)) {
        const base = (u.user || "Pracownik").split("_")[0];
        u.pass = generateUniquePass(
          base,
          u.workerId,
          idx,
          users.filter((_, i) => i !== idx)
        );
        modified = true;
      }
      passMap.add(u.pass.toLowerCase());
    });

    if (modified) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }

  function syncUsersFromSchedule(silent = false) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    let addedCount = 0;

    appState.allMonths.forEach((m) => {
      if (!m.workers || !Array.isArray(m.workers)) return;

      m.workers.forEach((w, wIdx) => {
        if (!w.name || w.name.trim() === "" || w.name === "Przykład") return;

        const username = w.name.trim().replace(/\s+/g, "_");
        const exists = users.find(
          (u) => u.user.toLowerCase() === username.toLowerCase()
        );

        if (!exists) {
          const firstName = w.name.trim().split(" ")[0];
          const uniquePass = generateUniquePass(firstName, w.id, wIdx, users);

          users.push({
            user: username,
            pass: uniquePass,
            workerId: w.id || null,
            role: "worker",
          });
          addedCount++;
        } else if (w.id != null && exists.workerId == null) {
          exists.workerId = w.id;
        }
      });
    });

    if (addedCount > 0) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      renderUsersModalList();
      if (!silent) {
        oxyAlert(
          `Utworzono ${addedCount} kont z unikalnymi hasłami (format: [Imię][ID]).`,
          "success",
          "SYNCHRONIZACJA KONT"
        );
      }
    } else if (!silent) {
      oxyAlert(
        "Wszyscy pracownicy posiadają już wygenerowane unikalne hasła.",
        "info",
        "SYNCHRONIZACJA"
      );
    }
  }

  function renderUsersModalList() {
    const listEl = document.getElementById("users-list");
    if (!listEl) return;
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    listEl.innerHTML = "";

    users.forEach((u, idx) => {
      const isAdmin = u.user === "admin";
      const row = document.createElement("div");
      row.className = "user-item-chassis";

      row.innerHTML = `
        <div class="user-item-main">
          <div class="user-item-identity">
            <i class="fas ${isAdmin ? "fa-shield-halved text-highlight" : "fa-user text-muted"}"></i>
            <div class="user-item-details">
              <span class="user-item-name">${u.user}</span>
              <span class="user-item-role">${isAdmin
          ? "GŁÓWNY ADMIN"
          : u.role === "worker"
            ? `PRACOWNIK (ID: ${u.workerId != null ? u.workerId : idx + 1})`
            : "UŻYTKOWNIK"
        }</span>
            </div>
          </div>

          <div class="user-item-creds" title="Kliknij, aby skopiować unikalne hasło" data-copy-pass="${u.pass}">
            <span class="creds-label">UNIKALNE HASŁO:</span>
            <code class="creds-val">${u.pass}</code>
            <i class="fas fa-copy creds-copy-icon"></i>
          </div>
        </div>

        <div class="user-item-actions">
          <div class="btn-bg">
            <button type="button" class="btn btn-login-as" data-username="${u.user}" title="Zaloguj na to konto">
              <i class="fas fa-right-to-bracket"></i>
              <span class="btn-text">ZALOGUJ</span>
            </button>
          </div>

          ${isAdmin
          ? `<div class="admin-locked-badge" title="Konto systemowe"><i class="fas fa-lock"></i></div>`
          : `<div class="btn-bg">
                   <button type="button" class="btn btn-icon delete-user-btn" data-idx="${idx}" title="Usuń konto">
                     <i class="fas fa-trash"></i>
                   </button>
                 </div>`
        }
        </div>
      `;

      listEl.appendChild(row);
    });
  }

  function initUserManagementModal() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(
        USERS_KEY,
        JSON.stringify([{ user: "admin", pass: "admin123", role: "admin" }])
      );
    }
    cleanupDuplicatePasswords();

    const modalUsers = document.getElementById("users-modal-overlay");
    const btnCloseUsers = document.getElementById("users-modal-close");
    const btnOpenUsers = document.getElementById("btn-users");
    const btnSyncUsers = document.getElementById("btn-sync-users");
    const btnAdd = document.getElementById("btn-add-user");
    const listEl = document.getElementById("users-list");

    if (btnOpenUsers) {
      btnOpenUsers.addEventListener("click", () => {
        if (sessionStorage.getItem("oxy_os_user") !== "admin") return;
        renderUsersModalList();
        modalUsers.classList.add("active");
      });
    }

    if (btnCloseUsers && modalUsers) {
      btnCloseUsers.addEventListener("click", () =>
        modalUsers.classList.remove("active")
      );
      modalUsers.addEventListener("click", (e) => {
        if (e.target === modalUsers) modalUsers.classList.remove("active");
      });
    }

    if (btnSyncUsers) {
      btnSyncUsers.addEventListener("click", () => syncUsersFromSchedule(false));
    }

    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        const uInp = document.getElementById("new-username");
        const pInp = document.getElementById("new-password");
        const uVal = uInp.value.trim().replace(/\s+/g, "_");
        const pVal = pInp.value.trim();

        if (!uVal || !pVal) {
          oxyAlert("Wprowadź nazwę użytkownika oraz hasło.", "warning", "BRAK DANYCH");
          return;
        }

        const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
        if (users.find((u) => u.user.toLowerCase() === uVal.toLowerCase())) {
          oxyAlert("Użytkownik o takiej nazwie już istnieje w bazie.", "error", "DUPLIKAT LOGINU");
          return;
        }

        if (users.find((u) => u.pass.toLowerCase() === pVal.toLowerCase())) {
          oxyAlert("To hasło jest już przypisane do innego konta. Każde hasło musi być unikalne.", "error", "DUPLIKAT HASŁA");
          return;
        }

        users.push({ user: uVal, pass: pVal, role: "custom" });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        uInp.value = "";
        pInp.value = "";
        renderUsersModalList();
        oxyAlert(`Utworzono konto dla "${uVal}" z unikalnym hasłem.`, "success", "NOWY UŻYTKOWNIK");
      });
    }

    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const loginBtn = e.target.closest(".btn-login-as");
        if (loginBtn) {
          const targetUser = loginBtn.dataset.username;
          sessionStorage.setItem("oxy_os_user", targetUser);
          if (modalUsers) modalUsers.classList.remove("active");
          renderLoginScreen();
          renderSchedule();
          oxyAlert(`Zalogowano jako: <strong>${targetUser}</strong>`, "success", "AUTORYZACJA");
          return;
        }

        const copyBadge = e.target.closest("[data-copy-pass]");
        if (copyBadge) {
          const pass = copyBadge.getAttribute("data-copy-pass");
          navigator.clipboard.writeText(pass).then(() => {
            oxyAlert(`Skopiowano unikalne hasło: <code>${pass}</code>`, "info", "SCHOWEK");
          });
          return;
        }

        const deleteBtn = e.target.closest(".delete-user-btn");
        if (deleteBtn) {
          const idx = parseInt(deleteBtn.dataset.idx, 10);
          const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

          if (users[idx].user === "admin") {
            oxyAlert("Konta 'admin' nie można usunąć.", "error", "ODMOWA DOSTĘPU");
            return;
          }

          oxyConfirm(
            `Czy na pewno chcesz bezpowrotnie usunąć konto "${users[idx].user}"?`,
            () => {
              users.splice(idx, 1);
              localStorage.setItem(USERS_KEY, JSON.stringify(users));
              renderUsersModalList();
              oxyAlert("Konto użytkownika zostało usunięte.", "info", "USUNIĘTO");
            }
          );
        }
      });
    }
  }

  // ==========================================
  // DYNAMICZNY RENDERER EKRANU LOGOWANIA
  // ==========================================
  function renderLoginScreen(mode = "quick_pass") {
    let overlay = document.getElementById("login-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "login-overlay";
      overlay.className = "login-overlay";
      document.body.prepend(overlay);
    }

    const currentUser = sessionStorage.getItem("oxy_os_user");
    const wrapper = document.querySelector(".dashboard-wrapper");
    const btnUsers = document.getElementById("btn-users");
    const btnCodeView = document.getElementById("btn-view-code");
    const pageTitle = document.querySelector(".page-title");

    if (currentUser) {
      overlay.classList.add("hidden");
      if (wrapper) wrapper.classList.remove("locked");

      const isAdmin = currentUser === "admin";
      if (btnUsers) btnUsers.style.display = isAdmin ? "flex" : "none";
      if (btnCodeView) btnCodeView.style.display = isAdmin ? "inline-flex" : "none";
      if (pageTitle) {
        pageTitle.innerHTML = `Workspace <span class="tactile-badge active" style="margin-left:8px;font-size:10px;">${currentUser}</span>`;
      }
      return;
    }

    if (wrapper) wrapper.classList.add("locked");
    overlay.classList.remove("hidden");
    if (btnUsers) btnUsers.style.display = "none";
    if (btnCodeView) btnCodeView.style.display = "none";

    const currentMonth =
      appState.allMonths && appState.allMonths[appState.activeMonthIdx]
        ? appState.allMonths[appState.activeMonthIdx]
        : null;
    const workers =
      currentMonth && currentMonth.workers
        ? currentMonth.workers.filter(
          (w) => w.name && w.name.trim() !== "" && w.name !== "Przykład"
        )
        : [];

    overlay.innerHTML = `
      <div class="login-box card hud-bracket" style="max-width: 420px; width: 95%;">
        <!-- Pasek stanu HUD -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="led-indicator active" style="background:var(--highlight-color); box-shadow:0 0 8px var(--highlight-color);"></span>
            <span style="font-family:var(--font-tech); font-size:11px; letter-spacing:0.1em; color:var(--text-muted);">SYS.AUTH_MODULE // v2.0</span>
          </div>
          <div class="btn-group tab-chassis" style="margin:0;">
            <button type="button" id="tab-auth-pass" class="btn ${mode === "quick_pass" ? "active" : ""}" style="height:24px; min-width:65px; font-size:9px; padding:0 6px;">HASŁO</button>
            <button type="button" id="tab-auth-admin" class="btn ${mode === "credentials" ? "active" : ""}" style="height:24px; min-width:65px; font-size:9px; padding:0 6px;">ADMIN</button>
          </div>
        </div>

        <!-- Nagłówek -->
        <div style="text-align:center; margin-bottom:1.25rem;">
          <div style="width:42px; height:42px; margin:0 auto 0.5rem; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border:1px solid var(--border-color); box-shadow:var(--shadow-inset);">
            <i class="fas fa-fingerprint" style="font-size:22px; color:var(--highlight-color);"></i>
          </div>
          <h2 class="card-title" style="font-size:1.1rem; margin:0;">AUTORYZACJA OXY_OS</h2>
          <p style="font-size:11px; color:var(--text-muted); margin-top:3px;">
            ${mode === "quick_pass" ? "Wprowadź unikalne hasło pracownika:" : "Wprowadź poświadczenia administratora:"}
          </p>
        </div>

        <!-- Formularz w gniazdach chassis -->
        <div class="login-input-group" style="gap:8px;">
          ${mode === "credentials"
        ? `
            <div class="input-chassis">
              <input type="text" id="login-username" class="shift-input login-input-field tactile-input" 
                     placeholder="Login administratora..." autocomplete="off">
            </div>
          `
        : ""
      }

          <div class="input-chassis">
            <input type="password" id="login-password" class="shift-input login-input-field tactile-input" 
                   placeholder="${mode === "quick_pass" ? "Unikalne hasło..." : "Hasło dostępu..."}" autocomplete="current-password">
          </div>

          <!-- Matryca szybkiego wyboru operatora (w trybie hasła) -->
          ${mode === "quick_pass" && workers.length > 0
        ? `
            <div style="margin-top:4px;">
              <div style="font-size:9px; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px; font-family:var(--font-tech); display:flex; justify-content:space-between;">
                <span>Wskaż profil pracownika:</span>
                <span style="color:var(--highlight-color);">${workers.length} PROFILI</span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(90px, 1fr)); gap:4px; max-height:95px; overflow-y:auto; padding:4px; background:var(--bg-color); border:1px solid var(--border-color); box-shadow:var(--shadow-inset);">
                ${workers
          .map(
            (w) => `
                  <button type="button" class="btn-worker-chip" data-worker="${w.name}" 
                          style="padding:3px 6px; font-size:10px; font-family:var(--font-family); background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-color); text-align:left; cursor:pointer; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                    <i class="fas fa-user" style="font-size:8px; opacity:0.5; margin-right:3px;"></i>${w.name.split(" ")[0]}
                  </button>
                `
          )
          .join("")}
              </div>
            </div>
          `
        : ""
      }

          <div class="btn-bg" style="width:100%; margin-top:6px;">
            <button type="button" id="btn-submit-auth" class="btn active login-submit-btn" style="width:100%; height:38px;">
              <i class="fas fa-right-to-bracket"></i> ZALOGUJ
            </button>
          </div>
        </div>

        <p id="login-error-badge" class="login-error-msg" style="display:none; text-align:center; margin-top:8px;"></p>
      </div>
    `;

    const btnPassMode = document.getElementById("tab-auth-pass");
    const btnAdminMode = document.getElementById("tab-auth-admin");
    const btnSubmit = document.getElementById("btn-submit-auth");
    const passInp = document.getElementById("login-password");
    const userInp = document.getElementById("login-username");
    const errBadge = document.getElementById("login-error-badge");

    if (btnPassMode)
      btnPassMode.addEventListener("click", () => renderLoginScreen("quick_pass"));
    if (btnAdminMode)
      btnAdminMode.addEventListener("click", () => renderLoginScreen("credentials"));

    let selectedWorkerName = null;
    overlay.querySelectorAll(".btn-worker-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        audio.playClick("normal");
        selectedWorkerName = chip.dataset.worker;
        overlay.querySelectorAll(".btn-worker-chip").forEach((c) => {
          c.style.borderColor = "var(--border-color)";
          c.style.color = "var(--text-color)";
        });
        chip.style.borderColor = "var(--highlight-color)";
        chip.style.color = "var(--highlight-color)";
        if (passInp) {
          passInp.placeholder = `Hasło: ${selectedWorkerName.split(" ")[0]}...`;
          passInp.focus();
        }
      });
    });

    const performLogin = () => {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      const passVal = passInp ? passInp.value.trim() : "";
      const userVal = userInp ? userInp.value.trim() : "";

      let matched = null;

      if (mode === "credentials") {
        matched = users.find(
          (u) =>
            u.user.toLowerCase() === userVal.toLowerCase() && u.pass === passVal
        );
      } else {
        if (selectedWorkerName && passVal) {
          const uKey = selectedWorkerName.replace(/\s+/g, "_").toLowerCase();
          matched = users.find(
            (u) => u.user.toLowerCase() === uKey && u.pass === passVal
          );
        }
        if (!matched && passVal) {
          matched = users.find((u) => u.pass === passVal);
        }
      }

      if (matched) {
        audio.playClick("heavy");
        sessionStorage.setItem("oxy_os_user", matched.user);
        renderLoginScreen();
        renderSchedule();
        oxyAlert(
          `Zalogowano jako: <strong>${matched.user}</strong>`,
          "success",
          "AUTORYZACJA"
        );
      } else {
        audio.playClick("switch");
        if (errBadge) {
          errBadge.textContent = "Odmowa autoryzacji: nieprawidłowe hasło.";
          errBadge.style.display = "block";
        }
        const box = overlay.querySelector(".login-box");
        if (box) {
          box.classList.add("login-shake");
          setTimeout(() => box.classList.remove("login-shake"), 350);
        }
        if (passInp) {
          passInp.value = "";
          passInp.focus();
        }
      }
    };

    if (btnSubmit) btnSubmit.addEventListener("click", performLogin);
    [passInp, userInp].forEach((inp) => {
      if (inp) {
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") performLogin();
        });
      }
    });

    setTimeout(() => {
      if (passInp) passInp.focus();
    }, 50);
  }

  // ==========================================
  // LOGIKA ZAKŁADEK I EDYTORA
  // ==========================================
  function initTabsAndEditor() {
    const tabs = ["dashboard", "schedule", "code"];
    tabs.forEach((tab) => {
      const btn = document.getElementById(`btn-view-${tab}`);
      if (btn) {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".view-container")
            .forEach((el) => el.classList.remove("active"));
          document
            .querySelectorAll(".btn-group .btn")
            .forEach((el) => el.classList.remove("active"));

          const viewEl = document.getElementById(`view-${tab}`);
          if (viewEl) viewEl.classList.add("active");
          btn.classList.add("active");

          if (tab === "schedule") renderSchedule();
          if (tab === "dashboard") syncDashboardCharts();
        });
      }
    });

    const editor = document.getElementById("json-editor");
    if (editor) {
      editor.value = appState.content;
      editor.addEventListener("input", (e) => {
        appState.content = e.target.value;
        try {
          const parsed = JSON.parse(appState.content);
          if (Array.isArray(parsed)) {
            appState.allMonths = parsed;
            localStorage.setItem(STORAGE_KEY, appState.content);
            renderSchedule();
          }
        } catch (err) { }
      });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        oxyConfirm("Czy na pewno chcesz zakończyć sesję operatora OXY_OS?", () => {
          sessionStorage.removeItem("oxy_os_user");
          renderLoginScreen();
        });
      });
    }
  }

  function startClock() {
    setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("pl-PL");
      const tcTime = document.getElementById("tc-time");
      if (tcTime) tcTime.textContent = timeStr;
    }, 1000);
  }

  // ==========================================
  // RENDEROWANIE TABELI GRAFIKU
  // ==========================================
  function renderSchedule() {
    const container = document.getElementById("schedule-content");
    if (!container || appState.allMonths.length === 0) return;

    if (appState.activeMonthIdx >= appState.allMonths.length)
      appState.activeMonthIdx = 0;
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.meta || !currentData.workers) return;

    const currentTheme =
      document.documentElement.getAttribute("theme") || "dark";
    const loggedUser = (sessionStorage.getItem("oxy_os_user") || "").toLowerCase();
    const isAdmin = loggedUser === "admin";

    let html = `<div class="month-controls tab-chassis" style="display:flex;">`;
    appState.allMonths.forEach((monthObj, idx) => {
      const monthName = monthObj.meta.month || `Miesiąc ${idx + 1}`;
      const isActive = idx === appState.activeMonthIdx;

      html += `<button class="month-tab-btn${isActive ? " active" : ""}" data-idx="${idx}">
                 ${monthName}
               </button>`;
    });
    html += `</div>`;

    const days = currentData.meta.days || [];
    const weekdays = currentData.meta.weekdays || [];

    html += `<table class="schedule-table">
              <thead>
                <tr>
                  <th class="sticky-col">ID</th>
                  <th class="sticky-col-2">Pracownik</th>`;

    days.forEach((d, i) => {
      const wd = weekdays[i] || "";
      const isWeekend = wd === "SO" || wd === "ND";
      const highlightStyle = isWeekend ? "color:red;" : "";
      html += `<th class="top-header bottom-header" style="${highlightStyle}">
                 ${d}<br><small style="font-size:9px;">${wd}</small>
               </th>`;
    });

    html += `<th class="sum-header">Suma</th>
             </tr>
           </thead><tbody>`;

    currentData.workers.forEach((w, wIdx) => {
      const grpCode = getWorkerGroupCode(w);
      const groupData = groupMetadata[grpCode];
      let rowStyle = "";
      if (groupData) {
        const themeColor =
          currentTheme === "light" ? groupData.colorLight : groupData.colorDark;
        rowStyle = `border-left: 3px solid ${themeColor}; color: ${themeColor};`;
      }

      const workerUserKey = (w.name || "").trim().replace(/\s+/g, "_").toLowerCase();
      const isCurrentLoggedWorker = loggedUser && loggedUser === workerUserKey;
      const rowClass = isCurrentLoggedWorker ? ' class="active-row"' : "";
      const nameHighlight = isCurrentLoggedWorker
        ? ' style="color:var(--highlight-color); font-weight:700;"'
        : "";

      html += `<tr${rowClass}>
                <td class="sticky-col">${w.id != null ? w.id : wIdx + 1}</td>
                <td class="sticky-col-2 worker-name-cell" data-w="${wIdx}" style="cursor: pointer; padding:0 10px; font-weight:600; font-size:12px; background:var(--card-bg); border-bottom:1px solid var(--border-color); ${rowStyle}" title="Kliknij, aby zobaczyć kalendarz pracownika">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span${nameHighlight}>${w.name || "Brak"}</span>
                    <i class="fas fa-calendar-alt" style="${isCurrentLoggedWorker
          ? "color:var(--highlight-color); opacity:1;"
          : "opacity: 0.3;"
        }"></i>
                  </div>
                </td>`;

      let totalHours = 0;

      days.forEach((day, dIdx) => {
        const displayCode = getDisplayShiftCode(w.shifts[dIdx]);

        if (["1", "2"].includes(displayCode)) {
          totalHours += 12;
        }

        const isWeekend = weekdays[dIdx] === "SO" || weekdays[dIdx] === "ND";
        const bgStyle = isWeekend
          ? "background-color: rgba(243, 108, 0, 0.05);"
          : "";

        const canEdit = isAdmin || isCurrentLoggedWorker;
        const disabledAttr = canEdit ? "" : "readonly";

        html += `<td class="shift-cell" style="${bgStyle}">
                  <input type="text" class="shift-input grid-chassis-input" 
                         data-w="${wIdx}" data-s="${dIdx}" 
                         value="${displayCode}" 
                         ${disabledAttr}
                         style="${canEdit ? "" : "cursor:default;opacity:0.85;"}">
                </td>`;
      });

      html += `<td class="sum-cell">${totalHours}h</td></tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    container.querySelectorAll(".month-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        appState.activeMonthIdx = parseInt(e.target.dataset.idx);
        renderSchedule();
      });
    });

    container.querySelectorAll(".shift-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const w = parseInt(e.target.dataset.w);
        const s = parseInt(e.target.dataset.s);

        if (!appState.allMonths[appState.activeMonthIdx].workers[w].shifts) {
          appState.allMonths[appState.activeMonthIdx].workers[w].shifts = [];
        }

        appState.allMonths[appState.activeMonthIdx].workers[w].shifts[s] =
          e.target.value;

        appState.content = JSON.stringify(appState.allMonths, null, 2);
        localStorage.setItem(STORAGE_KEY, appState.content);

        if (document.getElementById("json-editor")) {
          document.getElementById("json-editor").value = appState.content;
        }

        renderSchedule();
      });

      input.addEventListener("focus", (e) => {
        e.target.select();
        e.target.closest("tr").style.backgroundColor = "var(--hover-bg)";
      });
      input.addEventListener("blur", (e) => {
        e.target.closest("tr").style.backgroundColor = "";
      });
    });

    container.querySelectorAll(".worker-name-cell").forEach((cell) => {
      cell.addEventListener("click", (e) => {
        const wIdx = parseInt(e.currentTarget.dataset.w);
        if (typeof openWorkerCalendarModal === "function") {
          openWorkerCalendarModal(wIdx);
        }
      });
    });

    syncDashboardCharts();
  }

  // ==========================================
  // KALENDARZ INDYWIDUALNY PRACOWNIKA
  // ==========================================
  function createWorkerCalendarModal() {
    if (document.getElementById("worker-cal-overlay")) return;
    const modal = document.createElement("div");
    modal.id = "worker-cal-overlay";
    modal.className = "shift-modal-overlay";

    modal.innerHTML = `
      <div class="shift-modal-content" style="max-width: 750px;">
        <div class="shift-modal-header">
          <h3 class="shift-modal-title" id="worker-cal-title">Kalendarz</h3>
          <div class="chassis-socket"><button id="worker-cal-close" class="shift-modal-close">&times;</button></div>
        </div>
        <div id="worker-cal-body" class="shift-modal-body" style="flex-direction: column;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document
      .getElementById("worker-cal-close")
      .addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  function openWorkerCalendarModal(wIdx) {
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.workers) return;
    const w = currentData.workers[wIdx];
    if (!w) return;

    const daysArr = currentData.meta.days || [];
    const weekdaysArr = currentData.meta.weekdays || [];

    const title = document.getElementById("worker-cal-title");
    title.innerHTML = `<i class="fas fa-calendar-alt" style="color: var(--highlight-color); margin-right: 8px;"></i> ${w.name} <span style="color: var(--text-muted); font-size: 14px; margin-left: 10px;">| ${currentData.meta.month || ""}</span>`;

    let totalHours = 0;
    let dCount = 0;
    let nCount = 0;
    let otherCount = 0;
    let freeDays = 0;
    let weekendShifts = 0;

    const weekMap = { PN: 0, WT: 1, SR: 2, ŚR: 2, CZ: 3, PT: 4, SO: 5, ND: 6 };
    let firstDayOffset = 0;
    if (weekdaysArr.length > 0) {
      firstDayOffset = weekMap[weekdaysArr[0].toUpperCase()] || 0;
    }

    let gridHtml = `<div class="cal-grid" style="margin-bottom: 25px;">`;
    ["PN", "WT", "ŚR", "CZ", "PT", "SO", "ND"].forEach((day) => {
      gridHtml += `<div class="cal-header">${day}</div>`;
    });

    for (let i = 0; i < firstDayOffset; i++) {
      gridHtml += `<div class="cal-cell empty"></div>`;
    }

    daysArr.forEach((dayNum, idx) => {
      const shift = getDisplayShiftCode(w.shifts[idx]);
      let shiftHtml = "";

      let cellClass = "cal-cell";
      const isWeekend = weekdaysArr[idx] === "SO" || weekdaysArr[idx] === "ND";
      if (isWeekend) {
        cellClass += " weekend";
      }

      if (shift === "1") {
        shiftHtml = `<div class="cal-shift day-shift">Dniówka</div>`;
        totalHours += 12;
        dCount++;
        if (isWeekend) weekendShifts++;
      } else if (shift === "2") {
        shiftHtml = `<div class="cal-shift night-shift">Nocka</div>`;
        totalHours += 12;
        nCount++;
        if (isWeekend) weekendShifts++;
      } else if (shift !== "") {
        shiftHtml = `<div class="cal-shift other-shift">${shift}</div>`;
        otherCount++;
        if (isWeekend) weekendShifts++;
      } else {
        freeDays++;
      }

      gridHtml += `
        <div class="${cellClass}">
          <div class="cal-day-num">${dayNum}</div>
          ${shiftHtml}
        </div>
      `;
    });

    const totalCells = firstDayOffset + daysArr.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      gridHtml += `<div class="cal-cell empty"></div>`;
    }

    gridHtml += `</div>`;

    const statsHtml = `
      <div class="cal-stats">
        <div class="cal-stat-box cal-align-center hours-stat">
          <span>Godziny</span> 
          <strong>${totalHours}h</strong>
        </div>
        <div class="cal-stat-box cal-align-center shifts-stat">
          <span>S. Zmian</span> 
          <strong>${dCount + nCount + otherCount}</strong>
        </div>
        <div class="cal-stat-box cal-align-center free-stat">
          <span>Wolne</span> 
          <strong class="cal-success">${freeDays}</strong>
        </div>
        <div class="cal-stat-box cal-align-center day-stat">
          <span>Dniówki</span> 
          <strong class="cal-day">${dCount}</strong>
        </div>
        <div class="cal-stat-box cal-align-center night-stat">
          <span>Nocki</span> 
          <strong class="cal-night">${nCount}</strong>
        </div>
        <div class="cal-stat-box cal-align-center weekend-stat">
          <span>Weekendy</span> 
          <strong class="cal-warning">${weekendShifts}</strong>
        </div>
        ${otherCount > 0
        ? `
          <div class="cal-stat-box cal-align-center cal-other-row">
            <span>Inne Wpisy (np. Urlop, L4)</span> 
            <strong class="cal-other">${otherCount}</strong>
          </div>`
        : ""
      }
      </div>
    `;

    document.getElementById("worker-cal-body").innerHTML = statsHtml + gridHtml;
    document.getElementById("worker-cal-overlay").classList.add("active");
  }

  // ==========================================
  // MODAL LISTY OSÓB NA ZMIANIE
  // ==========================================
  function createShiftListModal() {
    if (document.getElementById("shift-modal-overlay")) return;
    const modal = document.createElement("div");
    modal.id = "shift-modal-overlay";
    modal.className = "shift-modal-overlay";

    modal.innerHTML = `
      <div class="shift-modal-content">
        <div class="shift-modal-header">
          <h3 class="shift-modal-title" id="shift-modal-title">Obsada Zmianowa</h3>
          <div class="chassis-socket"><button id="shift-modal-close" class="shift-modal-close">&times;</button></div>
        </div>
        <div id="shift-modal-body" class="shift-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document
      .getElementById("shift-modal-close")
      .addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  function openShiftListModal(eOrIdx) {
    const modal = document.getElementById("shift-modal-overlay");
    const body = document.getElementById("shift-modal-body");
    const title = document.getElementById("shift-modal-title");

    if (appState.allMonths.length === 0) return;
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.workers) return;

    const daysArr = currentData.meta.days || [];
    const weekdaysArr = currentData.meta.weekdays || [];
    const todayStr = String(new Date().getDate());
    const todayIdx = daysArr.indexOf(todayStr);

    let targetIdx = typeof eOrIdx === "number" ? eOrIdx : todayIdx;
    if (targetIdx === -1 || targetIdx >= daysArr.length) {
      targetIdx = 0;
    }

    if (daysArr.length === 0) {
      body.innerHTML = `<div class="shift-modal-empty">Brak dni w wybranym miesiącu.</div>`;
      modal.classList.add("active");
      return;
    }

    let customSelectOptions = "";
    daysArr.forEach((d, i) => {
      const wd = weekdaysArr[i] || "";
      const isSelected = i === targetIdx ? " selected" : "";
      const ariaSelected = i === targetIdx ? "true" : "false";
      customSelectOptions += `
        <div class="option${isSelected}" data-value="${i}" role="option" aria-selected="${ariaSelected}">
            <i class="fa-solid fa-calendar-day"></i>
            <span>Dzień ${d} (${wd})</span>
        </div>`;
    });

    let currentSelectedText =
      targetIdx >= 0 && targetIdx < daysArr.length
        ? `Dzień ${daysArr[targetIdx]} (${weekdaysArr[targetIdx] || ""})`
        : "Wybierz dzień...";

    let selectorHtml = `
      <div class="modal-day-controls">
        <div class="btn-bg">
            <button id="modal-prev-day" class="btn modal-nav-btn" title="Poprzedni dzień"><i class="fas fa-chevron-left"></i></button>
        </div>
        <div class="custom-select wide" id="modal-day-selector-custom" data-name="modalDay">
            <input type="hidden" name="modalDay" value="${targetIdx}">
            <div class="select-chassis">
                <button type="button" class="select-trigger" aria-haspopup="listbox" aria-expanded="false">
                    <span class="trigger-content">
                        <i class="fa-solid fa-calendar-day"></i>
                        <span>${currentSelectedText}</span>
                    </span>
                    <i class="fa-solid fa-chevron-down chevron-icon"></i>
                </button>
            </div>
            <div class="select-options" role="listbox">
                ${customSelectOptions}
            </div>
        </div>
        <div class="btn-bg">
            <button id="modal-next-day" class="btn modal-nav-btn" title="Następny dzień"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>`;

    title.innerHTML = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div><i class="fas fa-users" style="color: var(--highlight-color); margin-right: 8px;"></i> Obsada</div>
        ${selectorHtml}
    </div>`;

    setTimeout(() => {
      const customSelectElement = document.getElementById("modal-day-selector-custom");
      if (customSelectElement) {
        new CustomSelect(customSelectElement, (data) => {
          openShiftListModal(parseInt(data.value));
        });
      }

      const btnPrev = document.getElementById("modal-prev-day");
      const btnNext = document.getElementById("modal-next-day");

      if (btnPrev) {
        btnPrev.addEventListener("click", () => {
          let newIdx = targetIdx - 1;
          if (newIdx < 0) newIdx = daysArr.length - 1;
          openShiftListModal(newIdx);
        });
      }

      if (btnNext) {
        btnNext.addEventListener("click", () => {
          let newIdx = targetIdx + 1;
          if (newIdx >= daysArr.length) newIdx = 0;
          openShiftListModal(newIdx);
        });
      }
    }, 0);

    const dayWorkers = [];
    const nightWorkers = [];
    const currentTheme =
      document.documentElement.getAttribute("theme") || "dark";

    currentData.workers.forEach((w) => {
      const val = getDisplayShiftCode(w.shifts[targetIdx]);

      if (val !== "") {
        const grpCode = getWorkerGroupCode(w);
        const groupData = groupMetadata[grpCode];

        let color = "var(--text-muted)";
        if (groupData)
          color =
            currentTheme === "light"
              ? groupData.colorLight
              : groupData.colorDark;

        const workerHtml = `
          <div class="shift-worker-item" style="border-left: 4px solid ${color};">
            <span class="shift-worker-name">${w.name}</span>
            <span class="shift-worker-id">ID: ${w.id != null ? w.id : "-"}</span>
          </div>`;

        if (val === "1") dayWorkers.push(workerHtml);
        else if (val === "2") nightWorkers.push(workerHtml);
      }
    });

    body.innerHTML = `
      <div class="shift-column">
        <div class="shift-col-header day">
          <i class="fas fa-sun"></i> DNIÓWKA (${dayWorkers.length} osób)
        </div>
        <div class="shift-col-list">
          ${dayWorkers.length ? dayWorkers.join("") : "<div class='shift-empty-msg'>Brak obsady na tę zmianę</div>"}
        </div>
      </div>
      <div class="shift-column">
        <div class="shift-col-header night">
          <i class="fas fa-moon"></i> NOCKA (${nightWorkers.length} osób)
        </div>
        <div class="shift-col-list">
          ${nightWorkers.length ? nightWorkers.join("") : "<div class='shift-empty-msg'>Brak obsady na tę zmianę</div>"}
        </div>
      </div>
    `;

    modal.classList.add("active");
  }

  // ==========================================
  // WYKRESY I STATYSTYKI DASHBOARDU
  // ==========================================
  let charts = {};

  function initCharts() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = "var(--font-main)";
    Chart.defaults.color =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--text-color")
        .trim() || "#e0e0e0";

    const mainStatsEl = document.getElementById("mainStatsChart");
    if (mainStatsEl) {
      const cardTitle = mainStatsEl.closest(".card")?.querySelector(".card-title");
      if (cardTitle) cardTitle.textContent = "Rozkład Godzin Pracowników";

      const ctxMain = mainStatsEl.getContext("2d");
      let gradientMain = ctxMain.createLinearGradient(0, 0, 0, 300);
      gradientMain.addColorStop(0, "rgba(220, 38, 38, 0.45)");
      gradientMain.addColorStop(0.5, "rgba(243, 108, 0, 0.45)");
      gradientMain.addColorStop(1, "rgba(34, 197, 94, 0.5)");

      charts.main = new Chart(ctxMain, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "Przepracowane godziny",
              data: [],
              backgroundColor: gradientMain,
              borderColor:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--text-color")
                  .trim() || "#e0e0e0",
              borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
              borderRadius: 0,
              barThickness: "flex",
              maxBarThickness: 40,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(0,0,0,0.8)",
              titleFont: { size: 13 },
              bodyFont: { size: 12 },
              callbacks: {
                label: function (context) {
                  return context.parsed.y + " godzin";
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: {
                font: { family: "var(--font-main)", size: 10 },
                maxRotation: 45,
                minRotation: 0,
                color: "#ccc",
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: "rgba(17,17,17,0.08)", borderDash: [5, 5] },
              ticks: { color: "#ccc" },
            },
          },
        },
      });
    }

    const walletEl = document.getElementById("walletSummaryChart");
    if (walletEl) {
      charts.wallet = new Chart(walletEl.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Brak"],
          datasets: [
            {
              data: [0],
              backgroundColor: [
                "#f36c00", "#3b82f6", "#af5308", "#ffc107", "#17a2b8", "#28a745"
              ],
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { grid: { display: false } } },
        },
      });
    }

    const waveEl = document.getElementById("waveChart");
    if (waveEl) {
      const cardTitle = waveEl.closest(".card")?.querySelector(".card-title");
      if (cardTitle) cardTitle.textContent = "Obsada Zmianowa (Dzień vs Noc)";

      const legendIn = waveEl
        .closest(".card")
        ?.querySelector(".legend-area .legend-item:nth-child(1)");
      if (legendIn)
        legendIn.innerHTML = '<span class="legend-dot bg-blue"></span> Dzień';
      const legendOut = waveEl
        .closest(".card")
        ?.querySelector(".legend-area .legend-item:nth-child(2)");
      if (legendOut)
        legendOut.innerHTML = '<span class="legend-dot bg-red"></span> Noc';

      const ctx = waveEl.getContext("2d");
      let gradientDay = ctx.createLinearGradient(0, 0, 0, 300);
      gradientDay.addColorStop(0, "rgba(255, 255, 255, 0.04)");
      gradientDay.addColorStop(1, "rgba(0, 210, 255, 0.0)");

      let gradientNight = ctx.createLinearGradient(0, 0, 0, 300);
      gradientNight.addColorStop(0, "rgba(255, 255, 255, 0.04)");
      gradientNight.addColorStop(1, "rgba(255, 0, 85, 0.0)");

      charts.wave = new Chart(ctx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Dzień",
              data: [],
              borderColor: "#00d2ff",
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 2,
              fill: true,
              backgroundColor: gradientDay,
            },
            {
              label: "Noc",
              data: [],
              borderColor: "#ff0055",
              borderWidth: 3,
              tension: 0.5,
              pointRadius: 2,
              fill: true,
              backgroundColor: gradientNight,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(0,0,0,0.8)",
            },
          },
          scales: {
            x: {
              display: true,
              grid: { display: false, drawBorder: false },
              ticks: { maxTicksLimit: 15 },
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: { color: "rgba(200,200,200,0.1)" },
              ticks: { stepSize: 1 },
            },
          },
          interaction: { mode: "nearest", axis: "x", intersect: false },
        },
      });
    }

    const inEl = document.getElementById("incomeSparkline");
    if (inEl) {
      charts.sparkDay = new Chart(inEl.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [{ data: [], borderColor: "#4ade80", tension: 0.4 }],
        },
        options: {
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false, beginAtZero: true },
          },
          maintainAspectRatio: false,
        },
      });
    }

    const outEl = document.getElementById("outcomeSparkline");
    if (outEl) {
      charts.sparkNight = new Chart(outEl.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [{ data: [], borderColor: "#ff0055", tension: 0.4 }],
        },
        options: {
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false, beginAtZero: true },
          },
          maintainAspectRatio: false,
        },
      });
    }
  }

  function syncDashboardCharts() {
    if (appState.allMonths.length === 0) return;
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.workers) return;

    let totalHours = 0;
    let shiftCounts = {};
    const daysArr = currentData.meta.days || [];
    const weekdaysArr = currentData.meta.weekdays || [];

    const dailyDayCount = new Array(daysArr.length).fill(0);
    const dailyNightCount = new Array(daysArr.length).fill(0);

    currentData.workers.forEach((w) => {
      daysArr.forEach((_, dIdx) => {
        const val = getDisplayShiftCode(w.shifts[dIdx]);

        if (val !== "") {
          if (["1", "2"].includes(val)) totalHours += 12;
          shiftCounts[val] = (shiftCounts[val] || 0) + 1;

          if (val === "1") {
            dailyDayCount[dIdx]++;
          } else if (val === "2") {
            dailyNightCount[dIdx]++;
          }
        }
      });
    });

    const todayStr = String(new Date().getDate());
    const todayIdx = daysArr.indexOf(todayStr);
    let dayToday = 0;
    let nightToday = 0;
    let dayYesterday = 0;
    let nightYesterday = 0;

    if (todayIdx !== -1) {
      dayToday = dailyDayCount[todayIdx];
      nightToday = dailyNightCount[todayIdx];
      if (todayIdx > 0) {
        dayYesterday = dailyDayCount[todayIdx - 1];
        nightYesterday = dailyNightCount[todayIdx - 1];
      }
    }

    const widget1Card = document.querySelector(".widget-card:nth-child(1)");
    const widget2Card = document.querySelector(".widget-card:nth-child(2)");

    if (widget1Card) {
      const wAmt = widget1Card.querySelector(".widget-amount");
      const wLbl = widget1Card.querySelector(".widget-label");
      const trendEl = widget1Card.querySelector(".widget-trend");

      if (wAmt) wAmt.innerHTML = `${dayToday} <span class="cents">osób</span>`;
      if (wLbl) wLbl.innerText = "Dniówka (Dziś)";

      if (trendEl) {
        const diff = dayToday - dayYesterday;
        if (diff > 0) {
          trendEl.className = "widget-trend text-green";
          trendEl.innerHTML = `<i class="fas fa-caret-up"></i> <span>+${diff} od wczoraj</span>`;
        } else if (diff < 0) {
          trendEl.className = "widget-trend text-red";
          trendEl.innerHTML = `<i class="fas fa-caret-down"></i> <span>${diff} od wczoraj</span>`;
        } else {
          trendEl.className = "widget-trend";
          trendEl.style.color = "var(--text-muted)";
          trendEl.innerHTML = `<i class="fas fa-minus"></i> <span>Brak zmian</span>`;
        }
      }

      if (!widget1Card.dataset.modalBound) {
        widget1Card.dataset.modalBound = "true";
        widget1Card.style.cursor = "pointer";
        widget1Card.title = "Kliknij, aby zobaczyć kto idzie na zmianę";
        widget1Card.addEventListener("click", openShiftListModal);

        const hint = document.createElement("div");
        hint.className = "widget-hint";
        hint.innerHTML = '<i class="fas fa-list"></i> Zobacz listę osób';
        widget1Card.appendChild(hint);
      }
    }

    if (widget2Card) {
      const wAmt = widget2Card.querySelector(".widget-amount");
      const wLbl = widget2Card.querySelector(".widget-label");
      const trendEl = widget2Card.querySelector(".widget-trend");
      const iconWrap = widget2Card.querySelector(".widget-icon");

      if (wAmt) wAmt.innerHTML = `${nightToday} <span class="cents">osób</span>`;
      if (wLbl) wLbl.innerText = "Nocka (Dziś)";

      if (iconWrap) {
        iconWrap.className = "widget-icon";
        iconWrap.style.backgroundColor = "rgba(255, 0, 85, 0.15)";
        iconWrap.style.color = "#ff0055";
        iconWrap.innerHTML = '<i class="fas fa-moon"></i>';
      }

      if (trendEl) {
        const diff = nightToday - nightYesterday;
        if (diff > 0) {
          trendEl.className = "widget-trend text-green";
          trendEl.innerHTML = `<i class="fas fa-caret-up"></i> <span>+${diff} od wczoraj</span>`;
        } else if (diff < 0) {
          trendEl.className = "widget-trend text-red";
          trendEl.innerHTML = `<i class="fas fa-caret-down"></i> <span>${diff} od wczoraj</span>`;
        } else {
          trendEl.className = "widget-trend";
          trendEl.style.color = "var(--text-muted)";
          trendEl.innerHTML = `<i class="fas fa-minus"></i> <span>Brak zmian</span>`;
        }
      }

      if (!widget2Card.dataset.modalBound) {
        widget2Card.dataset.modalBound = "true";
        widget2Card.style.cursor = "pointer";
        widget2Card.title = "Kliknij, aby zobaczyć kto idzie na zmianę";
        widget2Card.addEventListener("click", openShiftListModal);

        const hint = document.createElement("div");
        hint.className = "widget-hint";
        hint.innerHTML = '<i class="fas fa-list"></i> Zobacz listę osób';
        widget2Card.appendChild(hint);
      }
    }

    const sparkLabels = [];
    const sparkDayData = [];
    const sparkNightData = [];

    const endIdx = todayIdx !== -1 ? todayIdx : daysArr.length - 1;
    const startIdx = Math.max(0, endIdx - 6);

    for (let i = startIdx; i <= endIdx; i++) {
      sparkLabels.push(daysArr[i]);
      sparkDayData.push(dailyDayCount[i]);
      sparkNightData.push(dailyNightCount[i]);
    }

    if (charts.sparkDay) {
      charts.sparkDay.data.labels = sparkLabels;
      charts.sparkDay.data.datasets[0].data = sparkDayData;
      charts.sparkDay.update();
    }

    if (charts.sparkNight) {
      charts.sparkNight.data.labels = sparkLabels;
      charts.sparkNight.data.datasets[0].data = sparkNightData;
      charts.sparkNight.update();
    }

    const tcMonth = document.getElementById("tc-month");
    const tcDay = document.getElementById("tc-day");
    const tcTotalDays = document.getElementById("tc-total-days");

    if (tcMonth)
      tcMonth.textContent =
        currentData.meta.month || `Miesiąc ${appState.activeMonthIdx + 1}`;
    if (tcTotalDays) tcTotalDays.textContent = daysArr.length;

    if (tcDay) {
      if (todayIdx !== -1) {
        tcDay.textContent = `${daysArr[todayIdx]} (${weekdaysArr[todayIdx] || ""})`;
      } else {
        tcDay.textContent = "Poza zakresem";
      }
    }

    const lastUpdateEl = document.getElementById("last-update-time");
    if (lastUpdateEl) {
      if (currentData.meta && currentData.meta.generated) {
        try {
          const d = new Date(currentData.meta.generated);
          const formatted = d.toLocaleString("pl-PL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          lastUpdateEl.innerHTML = `<i class="fas fa-clock" style="margin-right: 5px;"></i> ${formatted}`;
        } catch (e) {
          lastUpdateEl.innerHTML = `<i class="fas fa-clock" style="margin-right: 5px;"></i> Nieznana data`;
        }
      } else {
        lastUpdateEl.innerHTML = `<i class="fas fa-clock" style="margin-right: 5px;"></i> Brak danych`;
      }
    }

    const systemInfoList = document.getElementById("system-info-list");
    if (systemInfoList) {
      systemInfoList.innerHTML = `
        <div class="transaction-item">
          <div class="transaction-left">
            <div class="transaction-icon icon-purple">
              <i class="fas fa-users"></i>
            </div>
            <div>
              <p class="transaction-title">Liczba Pracowników</p>
              <p class="transaction-date">W tym grafiku</p>
            </div>
          </div>
          <p class="transaction-amount amount-green" style="font-size:16px;">${currentData.workers.length}</p>
        </div>
        <div class="transaction-item">
          <div class="transaction-left">
            <div class="transaction-icon icon-green-alt">
              <i class="fas fa-calendar-alt"></i>
            </div>
            <div>
              <p class="transaction-title">Aktywny Miesiąc</p>
              <p class="transaction-date">${daysArr.length} dni</p>
            </div>
          </div>
          <p class="transaction-amount" style="color:var(--text-color); font-size:14px;">${currentData.meta.month || "Brak"}</p>
        </div>
        <div class="transaction-item">
          <div class="transaction-left">
            <div class="transaction-icon" style="background: rgba(243, 108, 0, 0.15); color: #f36c00;">
              <i class="fas fa-clock"></i>
            </div>
            <div>
              <p class="transaction-title">Łącznie Zaplanowano</p>
              <p class="transaction-date">Godziny całego zespołu</p>
            </div>
          </div>
          <p class="transaction-amount amount-green" style="font-size:14px;">${totalHours}h</p>
        </div>
      `;
    }

    if (charts.main) {
      const workerNames = [];
      const workerHours = [];

      currentData.workers.forEach((w) => {
        let h = 0;
        daysArr.forEach((_, dIdx) => {
          const val = getDisplayShiftCode(w.shifts[dIdx]);
          if (["1", "2"].includes(val)) h += 12;
        });

        const shortName = w.name ? w.name.split(" ")[0] : `ID:${w.id}`;
        workerNames.push(shortName);
        workerHours.push(h);
      });

      charts.main.data.labels = workerNames;
      charts.main.data.datasets[0].data = workerHours;
      charts.main.update();
    }

    if (charts.wallet) {
      const sortedShifts = Object.entries(shiftCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      while (sortedShifts.length < 6) sortedShifts.push(["-", 0]);

      charts.wallet.data.labels = sortedShifts.map((s) => s[0]);
      charts.wallet.data.datasets[0].data = sortedShifts.map((s) => s[1]);
      charts.wallet.update();
    }

    if (charts.wave) {
      charts.wave.data.labels = daysArr;
      charts.wave.data.datasets[0].data = dailyDayCount;
      charts.wave.data.datasets[1].data = dailyNightCount;
      charts.wave.update();
    }
  }

  // ==========================================
  // SYNCHRONIZACJA Z GITHUB & MOTYW
  // ==========================================
  const btnCloud =
    document.getElementById("btn-cloud-fetch") ||
    document.querySelector('[title*="GitHub"]');

  if (btnCloud) {
    btnCloud.addEventListener("click", async () => {
      const iconDest = document.getElementById("icon-cloud-download-dest");

      if (iconDest) {
        iconDest.innerHTML =
          '<i class="fas fa-spinner fa-spin" style="font-size: 20px;"></i>';
      }

      try {
        const res = await fetch(GITHUB_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("Błąd pobierania z GitHub");
        const data = await res.json();

        if (!Array.isArray(data))
          throw new Error("Oczekiwano tablicy miesięcy z GitHub");

        appState.allMonths = data;
        appState.content = JSON.stringify(data, null, 2);
        localStorage.setItem(STORAGE_KEY, appState.content);

        const editorEl = document.getElementById("json-editor");
        if (editorEl) {
          editorEl.value = appState.content;
        }

        appState.activeMonthIdx = findCurrentMonthIndex();
        renderSchedule();
        syncUsersFromSchedule(true);

        if (iconDest && typeof AppIcons !== "undefined") {
          iconDest.innerHTML = AppIcons.circleCheck || "";
          setTimeout(() => {
            iconDest.innerHTML = AppIcons.cloudDownload || "";
          }, 2000);
        }

        oxyAlert("Pobrano najnowsze dane z chmury.", "success", "SYNCHRONIZACJA");
      } catch (e) {
        oxyAlert(
          "Błąd chmury: " + (e && e.message ? e.message : e),
          "error",
          "BŁĄD POBIERANIA"
        );

        if (iconDest && typeof AppIcons !== "undefined") {
          iconDest.innerHTML = AppIcons.cloudDownload || "";
        }
      }
    });
  }

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    document.documentElement.classList.add("theme-switching");

    const isDark = document.documentElement.getAttribute("theme") === "dark";
    document.documentElement.setAttribute("theme", isDark ? "light" : "dark");

    const iconDest = document.getElementById("icon-sun-dest");
    if (iconDest && typeof AppIcons !== "undefined") {
      iconDest.innerHTML = isDark
        ? AppIcons.sparkle2 || ""
        : AppIcons.brightnessIncrease || "";
    }

    if (typeof Chart !== "undefined") {
      Chart.defaults.color =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim() || "#e0e0e0";
      Object.values(charts).forEach((ch) => ch.update());
      renderSchedule();
    }

    setTimeout(() => {
      document.documentElement.classList.remove("theme-switching");
    }, 50);
  });

  // ==========================================
  // PWA SERVICE WORKER, OFFLINE & INSTALACJA
  // ==========================================
  function initPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("./sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker zarejestrowany. Zakres:", reg.scope);
          })
          .catch((err) => {
            console.error("[PWA] Błąd rejestracji Service Workera:", err);
          });
      });
    }

    window.addEventListener("online", () => {
      oxyAlert("Przywrócono połączenie sieciowe.", "info", "TRYB ONLINE");
    });

    window.addEventListener("offline", () => {
      oxyAlert(
        "Praca w trybie lokalnym. Zmiany są zapisywane w pamięci urządzenia.",
        "warning",
        "TRYB OFFLINE"
      );
    });

    let deferredPrompt = null;
    const pwaInstallBtn = document.getElementById("btn-pwa-install");

    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = "none";
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (pwaInstallBtn) {
        pwaInstallBtn.style.display = "flex";
      }
    });

    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          oxyAlert("Instalacja OXY_OS rozpoczęta.", "success", "INSTALACJA");
        }
        deferredPrompt = null;
        pwaInstallBtn.style.display = "none";
      });
    }

    window.addEventListener("appinstalled", () => {
      oxyAlert("Aplikacja OXY_OS została zainstalowana.", "success", "GOTOWE");
      if (pwaInstallBtn) pwaInstallBtn.style.display = "none";
    });
  }

  // ==========================================
  // GŁÓWNY PUNKT STARTOWY APLIKACJI (BOOT)
  // ==========================================
  function bootApplication() {
    initUserManagementModal();
    initPWA();

    document.documentElement.setAttribute("theme", "dark");

    if (typeof AppIcons !== "undefined") {
      const injectIcon = (id, iconSvg) => {
        const dest = document.getElementById(id);
        if (dest && iconSvg) dest.innerHTML = iconSvg;
      };

      injectIcon("icon-calendar-dest", AppIcons.calendarGlass);
      injectIcon("icon-cube-dest", AppIcons.cubeGlass);
      injectIcon("icon-cloud-download-dest", AppIcons.cloudDownload);
      injectIcon("icon-sun-dest", AppIcons.brightnessIncrease);
      injectIcon("icon-file-download-dest", AppIcons.filedownload);
    }

    createShiftListModal();
    createWorkerCalendarModal();
    loadData();
    initTabsAndEditor();
    initCharts();
    startClock();
    renderSchedule();

    syncUsersFromSchedule(true);
    renderLoginScreen();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApplication);
  } else {
    bootApplication();
  }
})();

// Globalny odsłuch kliknięć dla dźwięków taktylnych
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button, .btn, .icon-btn");
  if (btn && !btn.classList.contains("select-trigger")) {
    const audioInstance = window.audio || null;
    if (audioInstance && audioInstance.playClick) {
      audioInstance.playClick("normal");
    }
  }
});

const performLogin = async () => {
  const passVal = passInp ? passInp.value.trim() : "";
  const userVal = userInp ? userInp.value.trim() : "";

  btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> WERYFIKACJA...';
  btnSubmit.disabled = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: mode === "credentials" ? userVal : (selectedWorkerName ? selectedWorkerName.replace(/\s+/g, "_") : ""),
        password: passVal
      })
    });

    const data = await response.json();

    if (data.success) {
      audio.playClick("heavy");
      sessionStorage.setItem("oxy_os_user", data.user.username);
      renderLoginScreen();
      renderSchedule();
      oxyAlert(`Zalogowano pomyślnie jako: <strong>${data.user.username}</strong>`, "success", "AUTORYZACJA");
    } else {
      throw new Error(data.message || "Błąd autoryzacji.");
    }
  } catch (err) {
    audio.playClick("switch");
    if (errBadge) {
      errBadge.textContent = err.message || "Odmowa autoryzacji: nieprawidłowe hasło.";
      errBadge.style.display = "block";
    }
    const box = overlay.querySelector(".login-box");
    if (box) {
      box.classList.add("login-shake");
      setTimeout(() => box.classList.remove("login-shake"), 350);
    }
    if (passInp) {
      passInp.value = "";
      passInp.focus();
    }
  } finally {
    btnSubmit.innerHTML = '<i class="fas fa-right-to-bracket"></i> ZALOGUJ';
    btnSubmit.disabled = false;
  }
};