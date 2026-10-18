(function () {
  "use strict";

  // ==========================================
  // HARDWARE TACTILE AUDIO SYNTHESIZER
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
      } catch (e) { }
    }
  }

  const audio = new HardwareAudio();

  // ==========================================
  // CUSTOM SELECT COMPONENT
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
      this.init();
    }

    init() {
      this.trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        audio.playClick("switch");
        this.toggle();
      });

      this.options.forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          audio.playClick("normal");
          this.selectOption(opt);
          this.close();
        });
      });
    }

    toggle() {
      if (this.isOpen) this.close();
      else {
        CustomSelect.closeAll(this);
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      if (this.chassis) this.chassis.classList.add("active");
      this.trigger.classList.add("active");
      this.optionsContainer.classList.add("show");
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      if (this.chassis) this.chassis.classList.remove("active");
      this.trigger.classList.remove("active");
      this.optionsContainer.classList.remove("show");
    }

    selectOption(optionElement) {
      const val = optionElement.getAttribute("data-value");
      const icon = optionElement.querySelector("i");
      const text = optionElement.textContent.trim();

      this.options.forEach((opt) => opt.classList.toggle("selected", opt === optionElement));

      let iconHtml = icon ? `<i class="${icon.className}"></i>` : "";
      this.triggerContent.innerHTML = `${iconHtml}<span>${text}</span>`;

      if (this.hiddenInput) {
        this.hiddenInput.value = val;
        this.hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      }

      if (typeof this.onSelectCallback === "function") {
        this.onSelectCallback({
          name: this.container.getAttribute("data-name"),
          value: val,
          label: text
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
  // SYSTEM ALERTY & POTWIERDZENIA OXY_OS
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
    let defaultTitle = "KOMUNIKAT SYSTEMOWY";
    if (type === "success") {
      icon = "fa-check-circle";
      defaultTitle = "SUKCES";
    } else if (type === "error") {
      icon = "fa-triangle-exclamation";
      defaultTitle = "BŁĄD";
    } else if (type === "warning") {
      icon = "fa-circle-exclamation";
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
        <div class="login-box card extracted-style-1">
          <div class="extracted-style-2"><i class="fas fa-exclamation-triangle"></i></div>
          <h2 class="card-title extracted-style-3">WYMAGANE POTWIERDZENIE</h2>
          <p id="oxy-confirm-msg" class="extracted-style-4"></p>
          <div class="extracted-style-5">
            <div class="btn-bg extracted-style-6"><button id="oxy-confirm-no" class="btn extracted-style-7">ANULUJ</button></div>
            <div class="btn-bg extracted-style-6"><button id="oxy-confirm-yes" class="btn active extracted-style-8">WYKONAJ</button></div>
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

    newBtnNo.addEventListener("click", () => overlay.classList.add("hidden"));
    newBtnYes.addEventListener("click", () => {
      overlay.classList.add("hidden");
      if (typeof onConfirm === "function") onConfirm();
    });
  }

  // ==========================================
  // STAN I ZARZĄDZANIE GRAFIKIEM
  // ==========================================
  const STORAGE_KEY = "harmonogram_data";
  const HISTORY_STORAGE_KEY = "oxy_schedule_history_log";
  const GITHUB_URL = "https://raw.githubusercontent.com/s-pro-v/json-lista/refs/heads/main/mobile-grafik.json";

  let scheduleHistory = [];

  function loadScheduleHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        scheduleHistory = JSON.parse(saved);
        if (!Array.isArray(scheduleHistory)) scheduleHistory = [];
      }
    } catch (e) {
      scheduleHistory = [];
    }
  }

  function saveScheduleHistory() {
    try {
      // Ograniczenie do ostatnich 200 wpisów
      if (scheduleHistory.length > 200) {
        scheduleHistory = scheduleHistory.slice(0, 200);
      }
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(scheduleHistory));
      renderScheduleHistoryUi();
    } catch (e) { }
  }

  function addScheduleHistoryEntry(entry) {
    const newEntry = {
      id: "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      user: localStorage.getItem("oxy_username") || "Lokalny użytkownik",
      ...entry
    };
    scheduleHistory.unshift(newEntry);
    saveScheduleHistory();
  }

  function computeScheduleDiff(oldMonths, newMonths) {
    if (!Array.isArray(oldMonths) || !Array.isArray(newMonths)) return [];
    const diffs = [];

    newMonths.forEach((newM, mIdx) => {
      const oldM = oldMonths[mIdx];
      const mName = newM.meta?.month || `Miesiąc ${mIdx + 1}`;
      const days = newM.meta?.days || [];

      if (!oldM || !oldM.workers) {
        diffs.push({
          type: "month_added",
          month: mName,
          text: `Dodano nowy miesiąc: ${mName}`
        });
        return;
      }

      const oldWorkersMap = new Map();
      oldM.workers.forEach(w => {
        const key = String(w.name || w.id || "").trim().toLowerCase();
        if (key) oldWorkersMap.set(key, w);
      });

      newM.workers?.forEach(nw => {
        const key = String(nw.name || nw.id || "").trim().toLowerCase();
        const ow = oldWorkersMap.get(key);

        if (!ow) {
          diffs.push({
            type: "worker_added",
            month: mName,
            worker: nw.name || "ID " + nw.id,
            text: `Nowy pracownik w grafiku: ${nw.name || nw.id}`
          });
          return;
        }

        // Porównaj zmiany poszczególnych dni
        const maxLen = Math.max(nw.shifts?.length || 0, ow.shifts?.length || 0);
        for (let d = 0; d < maxLen; d++) {
          const oldRaw = ow.shifts ? (ow.shifts[d] || "") : "";
          const newRaw = nw.shifts ? (nw.shifts[d] || "") : "";
          const oldCode = getDisplayShiftCode(oldRaw);
          const newCode = getDisplayShiftCode(newRaw);

          if (oldCode !== newCode) {
            const dayLabel = days[d] ? `dzień ${days[d]}` : `kolumna ${d + 1}`;
            diffs.push({
              type: "shift_changed",
              month: mName,
              worker: nw.name || "ID " + nw.id,
              day: dayLabel,
              dayIdx: d,
              oldVal: oldCode || "wolne",
              newVal: newCode || "wolne"
            });
          }
        }
      });
    });

    return diffs;
  }

  const groupMetadata = {
    d: { colorLight: "#d35400", colorDark: "#cc8a28", name: "D" },
    s: { colorLight: "#0056b3", colorDark: "#0052cc", name: "S" },
    p: { colorLight: "#3178c6", colorDark: "#5981cc", name: "P" },
    k: { colorLight: "#c0392b", colorDark: "#cc6f44", name: "K" },
    m: { colorLight: "#b7950b", colorDark: "#cccc00", name: "M" },
    y: { colorLight: "#196f3d", colorDark: "#00cc00", name: "Y" }
  };

  function getDisplayShiftCode(rawShift) {
    let code = String(rawShift || "").toUpperCase().replace(/\s*\([^)]+\)/g, "").trim();
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
        month: "PRZYKŁAD"
      },
      workers: [{ id: 1, name: "Przykładowy Pracownik", shifts: ["1", "2", ""] }]
    }
  ];

  let appState = {
    allMonths: [],
    activeMonthIdx: 0,
    content: ""
  };

  function findCurrentMonthIndex() {
    if (!appState.allMonths || appState.allMonths.length === 0) return 0;
    const polishMonths = ["STYCZEN", "LUTY", "MARZEC", "KWIECIEN", "MAJ", "CZERWIEC", "LIPIEC", "SIERPIEN", "WRZESIEN", "PAZDZIERNIK", "LISTOPAD", "GRUDZIEN"];
    const currentMonthName = polishMonths[new Date().getMonth()];

    const idx = appState.allMonths.findIndex((m) => {
      if (!m.meta || !m.meta.month) return false;
      const normalized = m.meta.month.toUpperCase().replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (c) => ({ Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z" }[c] || c));
      return normalized.includes(currentMonthName);
    });
    return idx !== -1 ? idx : 0;
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        appState.allMonths = Array.isArray(parsed) ? parsed : (parsed.meta && parsed.workers ? [parsed] : DEFAULT_JSON);
      } else {
        appState.allMonths = DEFAULT_JSON;
      }
    } catch (e) {
      appState.allMonths = DEFAULT_JSON;
      localStorage.removeItem(STORAGE_KEY);
    }
    appState.content = JSON.stringify(appState.allMonths, null, 2);
    appState.activeMonthIdx = findCurrentMonthIndex();
  }

  function switchView(tab, dayIdx = null, filter = null) {
    document.querySelectorAll(".view-container").forEach((el) => el.classList.remove("active"));
    document.querySelectorAll(".dashboard-header .btn-group .btn").forEach((el) => el.classList.remove("active"));

    const btn = document.getElementById(`btn-view-${tab}`) || (tab === "shifts" ? document.getElementById("btn-kto-na-zmianie") : null);
    if (btn) btn.classList.add("active");

    const viewEl = document.getElementById(`view-${tab}`);
    if (viewEl) viewEl.classList.add("active");

    if (tab === "schedule") renderSchedule();
    if (tab === "dashboard") syncDashboardCharts();
    if (tab === "shifts") {
      // Zapewnienie, że aktywny miesiąc odpowiada bieżącemu miesiącowi
      if (typeof dayIdx !== "number") {
        const curMIdx = findCurrentMonthIndex();
        if (curMIdx !== -1) appState.activeMonthIdx = curMIdx;
      }

      if (typeof dayIdx === "number") {
        activeShiftDayIdx = dayIdx;
      } else {
        // Domyślnie ładuj po dzisiejszym dniu
        const daysArr = appState.allMonths[appState.activeMonthIdx]?.meta?.days || [];
        const todayStr = String(new Date().getDate());
        const tIdx = daysArr.indexOf(todayStr);
        activeShiftDayIdx = tIdx !== -1 ? tIdx : 0;
      }

      if (filter) setShiftFilter(filter);
      renderShiftsView();
    }
  }

  function initTabsAndEditor() {
    ["dashboard", "shifts", "schedule", "code"].forEach((tab) => {
      const btn = document.getElementById(`btn-view-${tab}`) || (tab === "shifts" ? document.getElementById("btn-kto-na-zmianie") : null);
      if (btn) {
        btn.addEventListener("click", () => {
          audio.playClick("switch");
          switchView(tab);
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
  }

  function startClock() {
    setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("pl-PL");
      const tcTime = document.getElementById("tc-time");
      if (tcTime) tcTime.textContent = timeStr;
    }, 1000);
  }

  function renderSchedule() {
    const container = document.getElementById("schedule-content");
    if (!container || appState.allMonths.length === 0) return;

    if (appState.activeMonthIdx >= appState.allMonths.length) appState.activeMonthIdx = 0;
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.meta || !currentData.workers) return;

    const currentTheme = document.documentElement.getAttribute("theme") || "dark";

    let html = `<div class="month-controls tab-chassis extracted-style-9">`;
    appState.allMonths.forEach((monthObj, idx) => {
      const monthName = monthObj.meta.month || `Miesiąc ${idx + 1}`;
      const isActive = idx === appState.activeMonthIdx;
      html += `<button class="month-tab-btn${isActive ? " active" : ""}" data-idx="${idx}">${monthName}</button>`;
    });
    html += `</div>`;

    const days = currentData.meta.days || [];
    const weekdays = currentData.meta.weekdays || [];

    html += `<table class="schedule-table">
              <thead>
                <tr>
                  <th class="sticky-col">ID</th>
                  <th class="sticky-col-2">Pracownik</th>`;

    const isCurrentMonthForSchedule = (function () {
      if (!currentData || !currentData.meta || !currentData.meta.month) {
        return appState.activeMonthIdx === findCurrentMonthIndex();
      }
      const polishMonths = ["STYCZEN", "LUTY", "MARZEC", "KWIECIEN", "MAJ", "CZERWIEC", "LIPIEC", "SIERPIEN", "WRZESIEN", "PAZDZIERNIK", "LISTOPAD", "GRUDZIEN"];
      const currentMonthName = polishMonths[new Date().getMonth()];
      const normalized = currentData.meta.month.toUpperCase().replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (c) => ({ Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z" }[c] || c));
      return normalized.includes(currentMonthName);
    })();
    const todayDateNum = new Date().getDate();

    days.forEach((d, i) => {
      const wd = weekdays[i] || "";
      const isWeekend = wd === "SO" || wd === "ND";
      const isToday = isCurrentMonthForSchedule && (parseInt(d, 10) === todayDateNum || String(d) === String(todayDateNum));
      let headerStyle = isWeekend ? "color:red;" : "";
      if (isToday) {
        headerStyle += "background: rgba(243, 108, 0, 0.15); box-shadow: inset 0 -2px 0 var(--highlight-color);";
      }
      html += `<th class="top-header bottom-header day-col-header ${isToday ? "today-header" : ""}" data-d="${i}" title="Kliknij, aby sprawdzić kto ma zmianę w dniu ${d}" style="cursor: pointer; ${headerStyle}">
                 ${d}<br><small class="extracted-style-10">${wd}</small>
               </th>`;
    });

    html += `<th class="sum-header">Suma</th></tr></thead><tbody>`;

    currentData.workers.forEach((w, wIdx) => {
      const grpCode = getWorkerGroupCode(w);
      const groupData = groupMetadata[grpCode];
      let rowStyle = "";
      if (groupData) {
        const themeColor = currentTheme === "light" ? groupData.colorLight : groupData.colorDark;
        rowStyle = `border-left: 3px solid ${themeColor}; color: ${themeColor};`;
      }

      html += `<tr>
                <td class="sticky-col">${w.id != null ? w.id : wIdx + 1}</td>
                <td class="sticky-col-2 worker-name-cell" data-w="${wIdx}" style="cursor: pointer; padding:0 10px; font-weight:600; font-size:12px; background:var(--card-bg); border-bottom:1px solid var(--border-color); ${rowStyle}">
                  <div class="extracted-style-11">
                    <span>${w.name || "Brak"}</span>
                    <i class="fas fa-calendar-alt extracted-style-12"></i>
                  </div>
                </td>`;

      let totalHours = 0;
      days.forEach((day, dIdx) => {
        const displayCode = getDisplayShiftCode(w.shifts[dIdx]);
        if (["1", "2"].includes(displayCode)) totalHours += 12;

        const isWeekend = weekdays[dIdx] === "SO" || weekdays[dIdx] === "ND";
        const bgStyle = isWeekend ? "background-color: rgba(243, 108, 0, 0.05);" : "";
        html += `<td class="shift-cell" style="${bgStyle}"><input type="text" class="shift-input grid-chassis-input" data-w="${wIdx}" data-s="${dIdx}" value="${displayCode}"></td>`;
      });

      html += `<td class="sum-cell">${totalHours}h</td></tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    container.querySelectorAll(".month-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        appState.activeMonthIdx = parseInt(e.target.dataset.idx, 10);
        renderSchedule();
        renderShiftsView();
      });
    });

    container.querySelectorAll(".day-col-header").forEach((th) => {
      th.addEventListener("click", (e) => {
        const dIdx = parseInt(e.currentTarget.dataset.d, 10);
        openShiftListModal(dIdx);
      });
    });

    container.querySelectorAll(".shift-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const w = parseInt(e.target.dataset.w, 10);
        const s = parseInt(e.target.dataset.s, 10);
        const workerObj = appState.allMonths[appState.activeMonthIdx]?.workers[w];
        const oldShift = workerObj?.shifts ? (workerObj.shifts[s] || "") : "";
        const oldCode = getDisplayShiftCode(oldShift);
        const newCode = getDisplayShiftCode(e.target.value);

        if (!appState.allMonths[appState.activeMonthIdx].workers[w].shifts) {
          appState.allMonths[appState.activeMonthIdx].workers[w].shifts = [];
        }
        appState.allMonths[appState.activeMonthIdx].workers[w].shifts[s] = e.target.value;

        // Rejestracja w historii zmian
        if (oldCode !== newCode) {
          const currentMeta = appState.allMonths[appState.activeMonthIdx]?.meta;
          const dayNum = currentMeta?.days ? currentMeta.days[s] : String(s + 1);
          const dayWd = currentMeta?.weekdays ? currentMeta.weekdays[s] : "";
          const monthName = currentMeta?.month || "Bieżący miesiąc";

          addScheduleHistoryEntry({
            source: "manual",
            title: `Ręczna zmiana w grafiku (${monthName})`,
            month: monthName,
            diffs: [
              {
                type: "shift_changed",
                month: monthName,
                worker: workerObj?.name || `Pracownik #${w + 1}`,
                day: `${dayNum} ${dayWd}`.trim(),
                dayIdx: s,
                oldVal: oldCode || "wolne",
                newVal: newCode || "wolne"
              }
            ]
          });
        }

        appState.content = JSON.stringify(appState.allMonths, null, 2);
        localStorage.setItem(STORAGE_KEY, appState.content);

        const ed = document.getElementById("json-editor");
        if (ed) ed.value = appState.content;

        renderSchedule();
        renderShiftsView();
      });
    });

    container.querySelectorAll(".worker-name-cell").forEach((cell) => {
      cell.addEventListener("click", (e) => {
        const wIdx = parseInt(e.currentTarget.dataset.w, 10);
        openWorkerCalendarModal(wIdx);
      });
    });

    syncDashboardCharts();
  }

  function createWorkerCalendarModal() {
    if (document.getElementById("worker-cal-overlay")) return;
    const modal = document.createElement("div");
    modal.id = "worker-cal-overlay";
    modal.className = "shift-modal-overlay";
    modal.innerHTML = `
      <div class="shift-modal-content extracted-style-13">
        <div class="shift-modal-header">
          <h3 class="shift-modal-title" id="worker-cal-title">Kalendarz Pracownika</h3>
          <div class="chassis-socket"><button id="worker-cal-close" class="shift-modal-close">&times;</button></div>
        </div>
        <div id="worker-cal-body" class="shift-modal-body extracted-style-14"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("worker-cal-close").addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("active"); });
  }

  function openWorkerCalendarModal(wIdx) {
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.workers) return;
    const w = currentData.workers[wIdx];
    if (!w) return;

    const daysArr = currentData.meta.days || [];
    const weekdaysArr = currentData.meta.weekdays || [];

    const title = document.getElementById("worker-cal-title");
    title.innerHTML = `<i class="fas fa-calendar-alt extracted-style-15"></i> ${w.name} <span class="extracted-style-16">| ${currentData.meta.month || ""}</span>`;

    let totalHours = 0;
    let dCount = 0;
    let nCount = 0;
    let otherCount = 0;
    let freeDays = 0;
    let weekendShifts = 0;

    const weekMap = { PN: 0, WT: 1, SR: 2, ŚR: 2, CZ: 3, PT: 4, SO: 5, ND: 6 };
    const firstDayOffset = weekdaysArr.length > 0 ? weekMap[weekdaysArr[0].toUpperCase()] || 0 : 0;

    let gridHtml = `<div class="cal-grid extracted-style-17">`;
    ["PN", "WT", "ŚR", "CZ", "PT", "SO", "ND"].forEach((day) => {
      const isWeekend = day === "SO" || day === "ND";
      gridHtml += `<div class="cal-header ${isWeekend ? "weekend" : ""}">${day}</div>`;
    });

    for (let i = 0; i < firstDayOffset; i++) gridHtml += `<div class="cal-cell empty"></div>`;

    const isCurrentMonth = (function () {
      if (!currentData || !currentData.meta || !currentData.meta.month) {
        return appState.activeMonthIdx === findCurrentMonthIndex();
      }
      const polishMonths = ["STYCZEN", "LUTY", "MARZEC", "KWIECIEN", "MAJ", "CZERWIEC", "LIPIEC", "SIERPIEN", "WRZESIEN", "PAZDZIERNIK", "LISTOPAD", "GRUDZIEN"];
      const currentMonthName = polishMonths[new Date().getMonth()];
      const normalized = currentData.meta.month.toUpperCase().replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (c) => ({ Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z" }[c] || c));
      return normalized.includes(currentMonthName);
    })();
    const todayNum = new Date().getDate();

    daysArr.forEach((dayNum, idx) => {
      const shift = getDisplayShiftCode(w.shifts[idx]);
      let shiftHtml = "";
      const isWeekend = weekdaysArr[idx] === "SO" || weekdaysArr[idx] === "ND";
      const isToday = isCurrentMonth && (parseInt(dayNum, 10) === todayNum || String(dayNum) === String(todayNum));
      let cellClass = `cal-cell ${isWeekend ? "weekend" : ""} ${isToday ? "today" : ""}`.trim();

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

      gridHtml += `<div class="${cellClass}"><div class="cal-day-num ${isWeekend ? "weekend" : ""} ${isToday ? "today" : ""}">${dayNum}</div>${shiftHtml}</div>`;
    });

    const totalCells = firstDayOffset + daysArr.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) gridHtml += `<div class="cal-cell empty"></div>`;
    gridHtml += `</div>`;

    const statsHtml = `
      <div class="cal-stats">
        <div class="cal-stat-box hours-stat"><span>Godziny</span><strong>${totalHours}h</strong></div>
        <div class="cal-stat-box shifts-stat"><span>S. Zmian</span><strong>${dCount + nCount + otherCount}</strong></div>
        <div class="cal-stat-box free-stat"><span>Wolne</span><strong class="cal-success">${freeDays}</strong></div>
        <div class="cal-stat-box day-stat"><span>Dniówki</span><strong class="cal-day">${dCount}</strong></div>
        <div class="cal-stat-box night-stat"><span>Nocki</span><strong class="cal-night">${nCount}</strong></div>
        <div class="cal-stat-box weekend-stat"><span>Weekendy</span><strong class="cal-warning">${weekendShifts}</strong></div>
      </div>
    `;

    document.getElementById("worker-cal-body").innerHTML = statsHtml + gridHtml;
    document.getElementById("worker-cal-overlay").classList.add("active");
  }

  let activeShiftDayIdx = 0;
  let activeShiftModalDayIdx = 0;
  let activeShiftFilter = "all";
  let activeShiftSearch = "";
  let shiftsViewInitialized = false;

  function setShiftFilter(filt) {
    activeShiftFilter = filt;
    const btnAll = document.getElementById("shift-view-filter-all");
    const btnDay = document.getElementById("shift-view-filter-day");
    const btnNight = document.getElementById("shift-view-filter-night");
    if (btnAll && btnDay && btnNight) {
      [btnAll, btnDay, btnNight].forEach(b => b.classList.remove("active"));
      if (filt === "all") btnAll.classList.add("active");
      if (filt === "day") btnDay.classList.add("active");
      if (filt === "night") btnNight.classList.add("active");
    }
  }

  function initShiftsView() {
    if (shiftsViewInitialized) return;
    shiftsViewInitialized = true;

    const prevBtn = document.getElementById("shift-view-prev-day");
    const nextBtn = document.getElementById("shift-view-next-day");
    const todayBtn = document.getElementById("shift-view-today");
    const daySelect = document.getElementById("shift-view-day-select");

    const btnAll = document.getElementById("shift-view-filter-all");
    const btnDay = document.getElementById("shift-view-filter-day");
    const btnNight = document.getElementById("shift-view-filter-night");
    const searchInp = document.getElementById("shift-view-search-input");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        audio.playClick("normal");
        activeShiftDayIdx--;
        renderShiftsView();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        audio.playClick("normal");
        activeShiftDayIdx++;
        renderShiftsView();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener("click", () => {
        audio.playClick("switch");
        const daysArr = appState.allMonths[appState.activeMonthIdx]?.meta?.days || [];
        const todayStr = String(new Date().getDate());
        const tIdx = daysArr.indexOf(todayStr);
        activeShiftDayIdx = tIdx !== -1 ? tIdx : 0;
        renderShiftsView();
      });
    }

    if (daySelect) {
      daySelect.addEventListener("change", (e) => {
        audio.playClick("switch");
        activeShiftDayIdx = parseInt(e.target.value, 10) || 0;
        renderShiftsView();
      });
    }

    const seWrap = document.getElementById("shift-view-day-se-wrap");
    const seBtn = document.getElementById("shift-view-day-se-btn");
    const seList = document.getElementById("shift-view-day-se-list");

    if (seBtn && seWrap && seList) {
      seBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        audio.playClick("switch");
        const isOpen = seWrap.classList.contains("se-select-open");
        document.querySelectorAll(".se-select-wrap.se-select-open").forEach((w) => {
          if (w !== seWrap) {
            w.classList.remove("se-select-open");
            w.querySelector(".se-select-btn")?.classList.remove("se-open");
            w.querySelector(".se-select-list")?.classList.remove("se-visible");
          }
        });
        seWrap.classList.toggle("se-select-open", !isOpen);
        seBtn.classList.toggle("se-open", !isOpen);
        seList.classList.toggle("se-visible", !isOpen);
      });
    }

    if (btnAll) {
      btnAll.addEventListener("click", () => {
        audio.playClick("switch");
        setShiftFilter("all");
        renderShiftsView();
      });
    }

    if (btnDay) {
      btnDay.addEventListener("click", () => {
        audio.playClick("switch");
        setShiftFilter("day");
        renderShiftsView();
      });
    }

    if (btnNight) {
      btnNight.addEventListener("click", () => {
        audio.playClick("switch");
        setShiftFilter("night");
        renderShiftsView();
      });
    }

    if (searchInp) {
      searchInp.addEventListener("input", (e) => {
        activeShiftSearch = (e.target.value || "").trim().toLowerCase();
        renderShiftsView();
      });
    }
  }

  function renderShiftsView() {
    initShiftsView();

    const titleEl = document.getElementById("shifts-view-title");
    const contentEl = document.getElementById("shifts-view-content");
    const cntAll = document.getElementById("shift-view-cnt-all");
    const cntDay = document.getElementById("shift-view-cnt-day");
    const cntNight = document.getElementById("shift-view-cnt-night");
    const daySelect = document.getElementById("shift-view-day-select");

    if (!contentEl || appState.allMonths.length === 0) return;
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.workers) return;

    const daysArr = currentData.meta.days || [];
    const weekdaysArr = currentData.meta.weekdays || [];

    if (activeShiftDayIdx < 0) activeShiftDayIdx = 0;
    if (activeShiftDayIdx >= daysArr.length) activeShiftDayIdx = Math.max(0, daysArr.length - 1);
    activeShiftModalDayIdx = activeShiftDayIdx;

    const dayNum = daysArr[activeShiftDayIdx] || (activeShiftDayIdx + 1);
    const dayWd = weekdaysArr[activeShiftDayIdx] || "";
    const isToday = String(new Date().getDate()) === String(dayNum);

    if (titleEl) {
      titleEl.innerHTML = `
        <i class="fas fa-users-viewfinder"></i>
        Obsada Zmianowa: ${dayNum} ${dayWd} <small class="extracted-style-34">${isToday ? "• DZIŚ" : ""}</small>
      `;
    }

    if (daySelect) {
      if (daySelect.options.length !== daysArr.length) {
        daySelect.innerHTML = daysArr.map((d, i) => {
          const wd = weekdaysArr[i] || "";
          const tFlag = String(new Date().getDate()) === String(d) ? " • Dziś" : "";
          return `<option value="${i}">${d} ${wd}${tFlag}</option>`;
        }).join("");
      }
      daySelect.value = String(activeShiftDayIdx);
    }

    const seWrap = document.getElementById("shift-view-day-se-wrap");
    const seBtn = document.getElementById("shift-view-day-se-btn");
    const seList = document.getElementById("shift-view-day-se-list");
    const seLabel = document.getElementById("shift-view-day-se-label");

    if (seList && seLabel) {
      const curWd = weekdaysArr[activeShiftDayIdx] || "";
      const curFlag = isToday ? " • Dziś" : "";
      const isCurWeekend = curWd === "SO" || curWd === "ND";
      seLabel.textContent = `${dayNum} ${curWd}${curFlag}`.trim();
      seBtn?.classList.toggle("weekend", isCurWeekend);

      seList.innerHTML = daysArr.map((d, i) => {
        const wd = weekdaysArr[i] || "";
        const tFlag = String(new Date().getDate()) === String(d) ? " • Dziś" : "";
        const isSel = i === activeShiftDayIdx;
        const isWeekend = wd === "SO" || wd === "ND";
        return `
          <div class="se-select-item ${isSel ? "se-selected" : ""} ${isWeekend ? "weekend" : ""}" data-val="${i}">
            <span class="se-select-prefix">›</span>${d} ${wd}${tFlag}
          </div>
        `;
      }).join("");

      seList.querySelectorAll(".se-select-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          audio.playClick("normal");
          activeShiftDayIdx = parseInt(item.dataset.val, 10) || 0;
          if (daySelect) daySelect.value = String(activeShiftDayIdx);
          seWrap?.classList.remove("se-select-open");
          seBtn?.classList.remove("se-open");
          seList?.classList.remove("se-visible");
          renderShiftsView();
        });
      });
    }

    const currentTheme = document.documentElement.getAttribute("theme") || "dark";
    const dayWorkers = [];
    const nightWorkers = [];

    currentData.workers.forEach((w, wIdx) => {
      const val = getDisplayShiftCode(w.shifts ? w.shifts[activeShiftDayIdx] : "");
      if (val === "1" || val === "2") {
        const grpCode = getWorkerGroupCode(w);
        const groupData = groupMetadata[grpCode];
        const color = groupData ? (currentTheme === "light" ? groupData.colorLight : groupData.colorDark) : "var(--text-muted)";
        const groupName = groupData ? groupData.name : "";

        if (activeShiftSearch) {
          const wName = (w.name || "").toLowerCase();
          const wId = String(w.id != null ? w.id : "");
          if (!wName.includes(activeShiftSearch) && !wId.includes(activeShiftSearch)) {
            return;
          }
        }

        const item = {
          wIdx,
          name: w.name || "Brak",
          id: w.id != null ? w.id : "-",
          color,
          groupName,
          shift: val
        };

        if (val === "1") dayWorkers.push(item);
        else if (val === "2") nightWorkers.push(item);
      }
    });

    if (cntAll) cntAll.textContent = dayWorkers.length + nightWorkers.length;
    if (cntDay) cntDay.textContent = dayWorkers.length;
    if (cntNight) cntNight.textContent = nightWorkers.length;

    const buildWorkerRow = (item) => `
      <div class="shift-worker-item" data-w="${item.wIdx}" style="border-left: 4px solid ${item.color}; cursor: pointer;" title="Kliknij, aby otworzyć kalendarz pracownika">
        <div class="extracted-style-20">
          <span class="shift-worker-name">${item.name}</span>
          ${item.groupName ? `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(255,255,255,0.08); color: ${item.color};">${item.groupName}</span>` : ""}
        </div>
        <span class="shift-worker-id">ID: ${item.id}</span>
      </div>
    `;

    const showDay = activeShiftFilter === "all" || activeShiftFilter === "day";
    const showNight = activeShiftFilter === "all" || activeShiftFilter === "night";

    if (activeShiftFilter !== "all") {
      contentEl.classList.add("single-col");
    } else {
      contentEl.classList.remove("single-col");
    }

    let html = "";
    if (showDay) {
      html += `
        <div class="card hud-bracket shift-column-card">
          <div class="shift-col-header day"><i class="fas fa-sun"></i> DNIÓWKA (${dayWorkers.length})</div>
          <div class="shift-col-list">
            ${dayWorkers.length ? dayWorkers.map(buildWorkerRow).join("") : "<div class='shift-empty-msg'>Brak obsady na dniówce</div>"}
          </div>
        </div>
      `;
    }

    if (showNight) {
      html += `
        <div class="card hud-bracket shift-column-card">
          <div class="shift-col-header night"><i class="fas fa-moon"></i> NOCKA (${nightWorkers.length})</div>
          <div class="shift-col-list">
            ${nightWorkers.length ? nightWorkers.map(buildWorkerRow).join("") : "<div class='shift-empty-msg'>Brak obsady na nocce</div>"}
          </div>
        </div>
      `;
    }

    if (!html) {
      html = `<div class="shift-modal-empty extracted-style-36">Brak pracowników spełniających kryteria.</div>`;
    }

    contentEl.innerHTML = html;

    contentEl.querySelectorAll(".shift-worker-item").forEach(item => {
      item.addEventListener("click", () => {
        audio.playClick("normal");
        const wIdx = parseInt(item.dataset.w, 10);
        if (!isNaN(wIdx)) {
          openWorkerCalendarModal(wIdx);
        }
      });
    });
  }

  function createShiftListModal() {
    initShiftsView();
  }

  function renderShiftModalList() {
    renderShiftsView();
  }

  function openShiftListModal(eOrIdx = null, filter = "all") {
    const daysArr = appState.allMonths[appState.activeMonthIdx]?.meta?.days || [];
    const todayStr = String(new Date().getDate());
    const todayIdx = daysArr.indexOf(todayStr);

    let targetDayIdx = activeShiftDayIdx;
    if (typeof eOrIdx === "number") {
      targetDayIdx = eOrIdx;
    } else if (eOrIdx === null) {
      targetDayIdx = todayIdx !== -1 ? todayIdx : 0;
    }

    switchView("shifts", targetDayIdx, filter || "all");
  }

  // ==========================================
  // WYKRESY CHART.JS & SPARKLINE
  // ==========================================
  let charts = {};

  function initCharts() {
    if (typeof Chart === "undefined") return;
    const isLight = document.documentElement.getAttribute("theme") === "light";
    const labelColor = isLight ? "#4b5563" : "#858585";
    const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";

    Chart.defaults.font.family = "var(--font-main)";
    Chart.defaults.color = labelColor;

    const mainEl = document.getElementById("mainStatsChart");
    if (mainEl) {
      charts.main = new Chart(mainEl.getContext("2d"), {
        type: "bar",
        data: {
          labels: [],
          datasets: [{
            label: "Godziny",
            data: [],
            backgroundColor: "rgba(243, 108, 0, 0.55)",
            borderColor: "#f36c00",
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { color: labelColor } }
          }
        }
      });
    }

    const walletEl = document.getElementById("walletSummaryChart");
    if (walletEl) {
      charts.wallet = new Chart(walletEl.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Brak"],
          datasets: [{
            data: [0],
            backgroundColor: ["#f36c00", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4", "#ef4444"]
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: labelColor } },
            y: { grid: { display: false }, ticks: { color: labelColor } }
          }
        }
      });
    }

    const waveEl = document.getElementById("waveChart");
    if (waveEl) {
      charts.wave = new Chart(waveEl.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Dzień",
              data: [],
              borderColor: "#00d2ff",
              backgroundColor: "rgba(0, 210, 255, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.3
            },
            {
              label: "Noc",
              data: [],
              borderColor: "#ff0055",
              backgroundColor: "rgba(255, 0, 85, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          onClick: (evt, elements) => {
            if (elements && elements.length > 0) {
              const clickedIdx = elements[0].index;
              openShiftListModal(clickedIdx);
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { color: labelColor } }
          }
        }
      });
    }

    const incEl = document.getElementById("incomeSparkline");
    if (incEl) {
      charts.income = new Chart(incEl.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
            tension: 0.35
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } }
        }
      });
    }

    const outEl = document.getElementById("outcomeSparkline");
    if (outEl) {
      charts.outcome = new Chart(outEl.getContext("2d"), {
        type: "line",
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
            tension: 0.35
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } }
        }
      });
    }
  }

  function updateChartTheme() {
    if (typeof Chart === "undefined") return;
    const isLight = document.documentElement.getAttribute("theme") === "light";
    const labelColor = isLight ? "#4b5563" : "#858585";
    const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";

    Chart.defaults.color = labelColor;
    [charts.main, charts.wallet, charts.wave].forEach((ch) => {
      if (ch && ch.options && ch.options.scales) {
        if (ch.options.scales.x) {
          if (ch.options.scales.x.grid) ch.options.scales.x.grid.color = gridColor;
          if (ch.options.scales.x.ticks) ch.options.scales.x.ticks.color = labelColor;
        }
        if (ch.options.scales.y) {
          if (ch.options.scales.y.grid) ch.options.scales.y.grid.color = gridColor;
          if (ch.options.scales.y.ticks) ch.options.scales.y.ticks.color = labelColor;
        }
        ch.update();
      }
    });
  }

  let cachedGitHubCommit = null;

  async function fetchGitHubCommitDate() {
    if (cachedGitHubCommit) return cachedGitHubCommit;
    try {
      const res = await fetch("https://api.github.com/repos/s-pro-v/json-lista/commits?path=mobile-grafik.json&page=1&per_page=1", {
        headers: { "Accept": "application/vnd.github.v3+json" }
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list[0] && list[0].commit) {
          cachedGitHubCommit = {
            date: list[0].commit.committer?.date || list[0].commit.author?.date,
            message: list[0].commit.message || ""
          };
          return cachedGitHubCommit;
        }
      }
    } catch (e) { }
    return null;
  }

  function formatRelativeTimeSpan(date) {
    if (!date || isNaN(date.getTime())) return "Brak danych";
    const now = Date.now();
    const diffMs = now - date.getTime();
    if (diffMs < 0) return "Przed chwilą";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Przed chwilą";
    if (mins < 60) return `${mins} min temu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} godz. temu`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Wczoraj";
    if (days < 30) return `${days} dni temu`;
    const months = Math.floor(days / 30);
    return `${months} mies. temu`;
  }

  // ==========================================
  // ZARZĄDZANIE STANEM AKTUALIZACJI PLIKU
  // ==========================================
  const STORAGE_SEEN_FILE_UPDATE = "oxy_seen_file_update";
  let isNewFileUpdateActive = false;

  function evaluateFileUpdateState(rawGenerated) {
    if (!rawGenerated) return false;

    // Jeśli w bieżącym uruchomieniu (przed odświeżeniem strony) oznaczono jako nową aktualizację
    if (isNewFileUpdateActive) return true;

    const lastSeen = localStorage.getItem(STORAGE_SEEN_FILE_UPDATE);

    if (!lastSeen) {
      localStorage.setItem(STORAGE_SEEN_FILE_UPDATE, rawGenerated);
      return false;
    }

    if (lastSeen !== rawGenerated) {
      // Wykryto nowy plik - tylko data i ikona na zielono do pierwszego odświeżenia strony
      isNewFileUpdateActive = true;
      localStorage.setItem(STORAGE_SEEN_FILE_UPDATE, rawGenerated);
      return true;
    }

    return false;
  }

  function applyFileUpdateUiState(isNew) {
    const cardEl = document.getElementById("file-update-card");
    if (cardEl) {
      if (isNew) {
        cardEl.classList.add("has-new-update");
      } else {
        cardEl.classList.remove("has-new-update");
      }
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
          if (val === "1") dailyDayCount[dIdx]++;
          else if (val === "2") dailyNightCount[dIdx]++;
        }
      });
    });

    const todayNum = new Date().getDate();
    const todayStr = String(todayNum);
    const todayIdx = daysArr.indexOf(todayStr);
    const resolvedIdx = todayIdx !== -1 ? todayIdx : (daysArr.length > 0 ? 0 : -1);

    const tcMonth = document.getElementById("tc-month");
    const tcTotalDays = document.getElementById("tc-total-days");
    const tcDay = document.getElementById("tc-day");
    if (tcMonth) tcMonth.textContent = currentData.meta.month || "Miesiąc";
    if (tcTotalDays) tcTotalDays.textContent = daysArr.length;
    if (tcDay && resolvedIdx !== -1) {
      const wd = weekdaysArr[resolvedIdx] || "";
      tcDay.textContent = `${daysArr[resolvedIdx]} ${wd}`.trim();
    }

    const todayDayStaff = resolvedIdx !== -1 ? (dailyDayCount[resolvedIdx] || 0) : 0;
    const todayNightStaff = resolvedIdx !== -1 ? (dailyNightCount[resolvedIdx] || 0) : 0;

    const dayCountEl = document.getElementById("widget-day-count");
    const nightCountEl = document.getElementById("widget-night-count");
    if (dayCountEl) dayCountEl.innerHTML = `${todayDayStaff} <span class="cents">osób</span>`;
    if (nightCountEl) nightCountEl.innerHTML = `${todayNightStaff} <span class="cents">osób</span>`;

    if (resolvedIdx > 0) {
      const prevDayStaff = dailyDayCount[resolvedIdx - 1] || 0;
      const prevNightStaff = dailyNightCount[resolvedIdx - 1] || 0;
      const dayDiff = todayDayStaff - prevDayStaff;
      const nightDiff = todayNightStaff - prevNightStaff;

      const dayTrendEl = document.getElementById("widget-day-trend");
      if (dayTrendEl) {
        if (dayDiff > 0) {
          dayTrendEl.className = "widget-trend text-green";
          dayTrendEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${dayDiff} vs wczoraj</span>`;
        } else if (dayDiff < 0) {
          dayTrendEl.className = "widget-trend text-red";
          dayTrendEl.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${dayDiff} vs wczoraj</span>`;
        } else {
          dayTrendEl.className = "widget-trend text-green";
          dayTrendEl.innerHTML = `<i class="fas fa-minus"></i> <span>Stabilna obsada</span>`;
        }
      }

      const nightTrendEl = document.getElementById("widget-night-trend");
      if (nightTrendEl) {
        if (nightDiff > 0) {
          nightTrendEl.className = "widget-trend text-green";
          nightTrendEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${nightDiff} vs wczoraj</span>`;
        } else if (nightDiff < 0) {
          nightTrendEl.className = "widget-trend text-red";
          nightTrendEl.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${nightDiff} vs wczoraj</span>`;
        } else {
          nightTrendEl.className = "widget-trend text-red";
          nightTrendEl.innerHTML = `<i class="fas fa-minus"></i> <span>Stabilna obsada</span>`;
        }
      }
    }

    if (charts.income) {
      charts.income.data.labels = daysArr;
      charts.income.data.datasets[0].data = dailyDayCount;
      charts.income.update();
    }
    if (charts.outcome) {
      charts.outcome.data.labels = daysArr;
      charts.outcome.data.datasets[0].data = dailyNightCount;
      charts.outcome.update();
    }

    if (charts.main) {
      charts.main.data.labels = currentData.workers.map((w) => (w.name ? w.name.split(" ")[0] : `ID:${w.id}`));
      charts.main.data.datasets[0].data = currentData.workers.map((w) => {
        let h = 0;
        daysArr.forEach((_, dIdx) => {
          if (["1", "2"].includes(getDisplayShiftCode(w.shifts[dIdx]))) h += 12;
        });
        return h;
      });
      charts.main.update();
    }

    if (charts.wallet) {
      const sorted = Object.entries(shiftCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
      while (sorted.length < 6) sorted.push(["-", 0]);
      charts.wallet.data.labels = sorted.map((s) => s[0]);
      charts.wallet.data.datasets[0].data = sorted.map((s) => s[1]);
      charts.wallet.update();
    }

    if (charts.wave) {
      charts.wave.data.labels = daysArr;
      charts.wave.data.datasets[0].data = dailyDayCount;
      charts.wave.data.datasets[1].data = dailyNightCount;
      charts.wave.update();
    }

    // ==========================================
    // STATUS I AKTUALIZACJA PLIKU GRAFIKU
    // ==========================================
    const rawGenerated = currentData.meta?.generated || localStorage.getItem("oxy_last_cloud_sync");
    let genDate = rawGenerated ? new Date(rawGenerated) : null;
    if (genDate && isNaN(genDate.getTime())) genDate = null;

    let fileDateStr = "--.--.----";
    let fileTimeStr = "--:--:--";
    let relativeStr = "Brak znacznika daty";

    if (genDate) {
      fileDateStr = genDate.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      fileTimeStr = genDate.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      relativeStr = formatRelativeTimeSpan(genDate);
    }

    const primaryDateEl = document.getElementById("file-primary-date");
    const primaryTimeEl = document.getElementById("file-primary-time");
    const relativeTextEl = document.getElementById("file-relative-text");
    const monthLabelEl = document.getElementById("file-month-label");
    const workersCountEl = document.getElementById("file-workers-count");
    const commitTimeEl = document.getElementById("file-commit-time");

    if (primaryDateEl) primaryDateEl.textContent = fileDateStr;
    if (primaryTimeEl) primaryTimeEl.textContent = genDate ? `godz. ${fileTimeStr}` : "--:--:--";
    if (relativeTextEl) {
      relativeTextEl.textContent = genDate ? `Wygenerowano ${relativeStr}` : "Brak danych o generowaniu";
    }
    if (monthLabelEl) monthLabelEl.textContent = currentData.meta?.month || "Bieżący";
    if (workersCountEl) workersCountEl.textContent = `${currentData.workers.length} osób`;

    // Ustawienie stanu wizualnego (tylko data i ikona na zielono do pierwszego odświeżenia)
    const isNew = evaluateFileUpdateState(rawGenerated);
    applyFileUpdateUiState(isNew);

    // Asynchroniczne sprawdzenie ostatniego commita pliku w repozytorium GitHub
    fetchGitHubCommitDate().then((commitInfo) => {
      if (commitInfo && commitInfo.date) {
        const cDate = new Date(commitInfo.date);
        const cRel = formatRelativeTimeSpan(cDate);
        if (commitTimeEl) {
          commitTimeEl.textContent = cRel;
          commitTimeEl.title = `Commit GitHub: ${cDate.toLocaleString("pl-PL")}\n${commitInfo.message || ""}`;
        }
      } else {
        if (commitTimeEl) commitTimeEl.textContent = "Zsynchronizowano";
      }
    });

    const lastUpdateEl = document.getElementById("last-update-time");
    if (lastUpdateEl) {
      lastUpdateEl.innerHTML = `
        <span class="led-indicator ${serverOnline ? "active" : ""}"></span>
        <i class="fas fa-clock-rotate-left last-update-icon ${isNew ? "text-green" : ""}"></i> <span class="${isNew ? "text-green" : ""}">Plik: ${fileDateStr}</span> (${relativeStr})
      `;
    }

    const sysInfoList = document.getElementById("system-info-list");
    if (sysInfoList) {
      sysInfoList.innerHTML = `
        <div class="transaction-item extracted-style-37">
          <div class="widget-icon ${serverOnline ? "icon-bg-green" : "icon-bg-red"} extracted-style-38">
            <i class="fas ${serverOnline ? "fa-shield-halved" : "fa-shield"}"></i>
          </div>
          <div class="extracted-style-39">
            <div class="extracted-style-40">Autoryzacja Serwera</div>
            <div class="extracted-style-41">${serverOnline ? "ONLINE (JWT + GitHub API)" : "OFFLINE (Brak połączenia)"}</div>
          </div>
        </div>
        <div class="transaction-item extracted-style-42">
          <div class="widget-icon ${isNew ? "icon-bg-green" : "icon-bg-blue"} extracted-style-38">
            <i class="fas fa-clock-rotate-left"></i>
          </div>
          <div class="extracted-style-39">
            <div class="extracted-style-40">Ostatni Update Pliku</div>
            <div class="extracted-style-41 ${isNew ? "text-green" : ""}">${fileDateStr}, ${fileTimeStr} (${relativeStr})</div>
          </div>
        </div>
        <div class="transaction-item extracted-style-37">
          <div class="widget-icon icon-bg-blue extracted-style-38">
            <i class="fas fa-users"></i>
          </div>
          <div class="extracted-style-39">
            <div class="extracted-style-40">Pracownicy w Bazie</div>
            <div class="extracted-style-41">${currentData.workers.length} osób w grafiku</div>
          </div>
        </div>
        <div class="transaction-item extracted-style-42">
          <div class="widget-icon icon-bg-green extracted-style-38">
            <i class="fas fa-business-time"></i>
          </div>
          <div class="extracted-style-39">
            <div class="extracted-style-40">Suma Godzin Miesiąca</div>
            <div class="extracted-style-41">${totalHours} roboczogodzin</div>
          </div>
        </div>
      `;
    }
  }

  // ==========================================
  // KOMUNIKACJA Z BACKENDEM EXPRESS Z TOKENEM
  // ==========================================
  function getApiBase() {
    const custom = localStorage.getItem("oxy_render_url");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    if (window.location.protocol.startsWith("http")) {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return window.location.port === "3000" ? "" : "http://localhost:3000";
      }
      if (!window.location.hostname.endsWith("github.io")) {
        return "";
      }
    }
    return "http://localhost:3000";
  }

  let serverOnline = false;
  let serverUsersCache = [];

  async function apiRequest(endpoint, method = "GET", body = null) {
    try {
      const headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("oxy_os_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const opts = { method, headers };
      if (body) opts.body = JSON.stringify(body);
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}${endpoint}`, opts);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: null, error: err.message };
    }
  }

  async function checkServerStatus() {
    let endpoint = "/api/status";
    try {
      const sessionStr = localStorage.getItem("oxy_os_user");
      if (sessionStr) {
        const sessionObj = JSON.parse(sessionStr);
        if (sessionObj.username) {
          endpoint += `?user=${encodeURIComponent(sessionObj.username)}`;
        }
      }
    } catch (e) { }

    const res = await apiRequest(endpoint);
    const badge = document.getElementById("server-status-badge");
    const textEl = document.getElementById("server-status-text");
    const modalStatus = document.getElementById("server-modal-status-text");
    const modalDetails = document.getElementById("server-modal-details");
    const loginStatus = document.getElementById("login-server-status");
    const loginStatusText = document.getElementById("login-server-text");

    const currentBase = getApiBase() || window.location.origin;

    if (res.ok && res.data && res.data.success) {
      serverOnline = true;
      if (badge) {
        badge.classList.remove("offline");
        badge.classList.add("online");
        badge.title = `Połączono z serwerem OXY_OS v${res.data.version} (${currentBase})`;
      }
      if (textEl) textEl.textContent = "ONLINE";
      if (modalStatus) {
        modalStatus.textContent = "ONLINE";
        modalStatus.style.color = "var(--success-color)";
      }
      if (modalDetails) {
        modalDetails.textContent = `Połączono z: ${currentBase} (v${res.data.version}, konta: ${res.data.usersCount})`;
      }
      if (loginStatus && loginStatusText) {
        loginStatus.classList.remove("offline");
        loginStatus.classList.add("online");
        loginStatusText.textContent = "SERWER ONLINE";
      }
      return true;
    } else {
      serverOnline = false;
      if (badge) {
        badge.classList.remove("online");
        badge.classList.add("offline");
        badge.title = `Brak połączenia z backendem (${currentBase}). Kliknij, aby skonfigurować URL.`;
      }
      if (textEl) textEl.textContent = "OFFLINE";
      if (modalStatus) {
        modalStatus.textContent = "OFFLINE";
        modalStatus.style.color = "var(--danger-color)";
      }
      if (modalDetails) {
        modalDetails.textContent = `Nie można nawiązać połączenia z: ${currentBase}. Kliknij ZAPISZ I POŁĄCZ po wpisaniu adresu Render.`;
      }
      if (loginStatus && loginStatusText) {
        loginStatus.classList.remove("online");
        loginStatus.classList.add("offline");
        loginStatusText.textContent = "SERWER OFFLINE";
      }
      return false;
    }
  }

  function initServerConfigModal() {
    const badge = document.getElementById("server-status-badge");
    const modal = document.getElementById("server-config-modal");
    const closeBtn = document.getElementById("server-config-close");
    const inputUrl = document.getElementById("input-api-url");
    const btnSave = document.getElementById("btn-save-api-url");
    const btnReset = document.getElementById("btn-reset-api-url");

    if (badge && modal) {
      badge.style.cursor = "pointer";
      badge.addEventListener("click", () => {
        const savedUrl = localStorage.getItem("oxy_render_url") || "";
        if (inputUrl) inputUrl.value = savedUrl;
        checkServerStatus();
        modal.classList.add("active");
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener("click", () => modal.classList.remove("active"));
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
      });
    }

    if (btnSave) {
      btnSave.addEventListener("click", async () => {
        const val = (inputUrl?.value || "").trim();
        if (val) {
          localStorage.setItem("oxy_render_url", val);
        } else {
          localStorage.removeItem("oxy_render_url");
        }
        oxyAlert("Zapisano adres backendu. Sprawdzam połączenie...", "info", "SERWER");
        const ok = await checkServerStatus();
        if (ok) {
          oxyAlert("Połączono pomyślnie z backendem!", "success", "POŁĄCZONO");
          if (modal) modal.classList.remove("active");
        } else {
          oxyAlert("Brak odpowiedzi z podanego adresu. Upewnij się, że instancja backendu jest wybudzona.", "warning", "STATUS SERWERA");
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener("click", async () => {
        localStorage.removeItem("oxy_render_url");
        if (inputUrl) inputUrl.value = "";
        oxyAlert("Przywrócono automatyczne wykrywanie adresu serwera.", "info", "SERWER");
        await checkServerStatus();
        if (modal) modal.classList.remove("active");
      });
    }
  }

  // ==========================================
  // ZARZĄDZANIE UŻYTKOWNIKAMI & TOKEN AUTH
  // ==========================================
  function initLoginSystem() {
    const SESSION_KEY = "oxy_os_user";
    const TOKEN_KEY = "oxy_os_token";
    const SAVED_PROFILES_KEY = "oxy_os_saved_profiles";

    const loginOverlay = document.getElementById("login-overlay");
    const dashboardWrapper = document.querySelector(".dashboard-wrapper");
    const btnLogin = document.getElementById("btn-login");
    const userInput = document.getElementById("login-username");
    const passInput = document.getElementById("login-password");
    const errorMsg = document.getElementById("login-error");
    const btnOpenUsers = document.getElementById("btn-users");
    const btnSyncUsers = document.getElementById("btn-sync-users");
    const quickListEl = document.getElementById("login-quick-list");
    const loggedUserLabel = document.getElementById("logged-user-name");
    const btnTogglePass = document.getElementById("btn-toggle-password");
    let showAllUsersToggle = false;

    function getSavedProfiles() {
      try {
        const raw = localStorage.getItem(SAVED_PROFILES_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    function saveProfileToRemembered(userObj) {
      if (!userObj) return;
      const username = userObj.username || userObj.user;
      if (!username) return;
      const role = userObj.role || "worker";
      const workerId = userObj.workerId ?? null;

      const profiles = [{
        username: username,
        role: role,
        workerId: workerId,
        lastLogin: Date.now()
      }];
      localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(profiles));
    }

    function removeSavedProfile(username) {
      localStorage.removeItem(SAVED_PROFILES_KEY);
      renderQuickLoginList();
      if (typeof oxyAlert === "function") {
        oxyAlert(`Usunięto zapamiętany profil: <strong>${username}</strong>`, "info", "PROFIL");
      }
    }

    function formatRelativeTime(ts) {
      if (!ts) return "";
      const diffMs = Date.now() - ts;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Przed chwilą";
      if (diffMins < 60) return `${diffMins} min temu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} godz. temu`;
      const date = new Date(ts);
      return `${date.toLocaleDateString("pl-PL")} ${date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
    }

    if (btnTogglePass && passInput) {
      btnTogglePass.addEventListener("click", () => {
        const isPass = passInput.type === "password";
        passInput.type = isPass ? "text" : "password";
        const icon = btnTogglePass.querySelector("i");
        if (icon) icon.className = isPass ? "fas fa-eye-slash" : "fas fa-eye";
      });
    }

    function applyUserPermissions(userVal) {
      const username = typeof userVal === "object" ? (userVal.username || "") : (userVal || "");
      const lowerUser = username.toLowerCase();
      const isAdmin = (lowerUser === "admin" || lowerUser === "robert_s");

      if (loggedUserLabel) loggedUserLabel.textContent = (username || "ADMIN").toUpperCase();

      const addForm = document.querySelector(".users-add-form");
      if (addForm) addForm.style.display = isAdmin ? "flex" : "none";

      if (btnSyncUsers) {
        const syncWrap = btnSyncUsers.closest(".btn-bg");
        if (syncWrap) syncWrap.style.display = isAdmin ? "inline-flex" : "none";
      }

      if (btnOpenUsers) {
        btnOpenUsers.style.display = isAdmin ? "flex" : "none";
      }
    }

    function unlockUi(userData) {
      if (loginOverlay) loginOverlay.classList.add("hidden");
      if (dashboardWrapper) dashboardWrapper.classList.remove("locked");
      if (errorMsg) errorMsg.style.display = "none";
      if (userInput) userInput.value = "";
      if (passInput) passInput.value = "";
      applyUserPermissions(userData);
      syncDashboardCharts();
    }

    const savedSession = localStorage.getItem(SESSION_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (savedSession && savedToken) {
      try {
        const sessionObj = JSON.parse(savedSession);
        unlockUi(sessionObj);
      } catch (e) {
        unlockUi({ username: savedSession, role: savedSession === "admin" ? "admin" : "worker" });
      }
    } else {
      if (dashboardWrapper) dashboardWrapper.classList.add("locked");
      if (loginOverlay) loginOverlay.classList.remove("hidden");
      renderQuickLoginList();
    }

    async function renderQuickLoginList() {
      if (!quickListEl) return;

      const savedProfiles = getSavedProfiles();

      let allUsers = [];
      const apiRes = await apiRequest("/api/users");
      if (apiRes.ok && apiRes.data && Array.isArray(apiRes.data.users)) {
        allUsers = apiRes.data.users;
        serverUsersCache = allUsers;
      } else {
        allUsers = serverUsersCache.length > 0 ? serverUsersCache : [{ user: "admin", role: "admin" }];
      }

      quickListEl.innerHTML = "";

      if (savedProfiles.length > 0 && !showAllUsersToggle) {
        const p = savedProfiles[0];

        if (userInput && !userInput.value) {
          userInput.value = p.username;
        }

        const container = document.createElement("div");
        container.className = "saved-profiles-list";

        const isAdmin = (p.role || "").toLowerCase() === "admin" || p.username.toLowerCase() === "admin";

        const card = document.createElement("div");
        card.className = "saved-profile-card last-used active";
        card.title = `Kliknij, aby wybrać profil ${p.username}`;

        card.innerHTML = `
          <div class="saved-profile-left">
            <div class="saved-profile-avatar ${isAdmin ? "admin" : ""}">
              <i class="fas ${isAdmin ? "fa-shield-halved" : "fa-user"}"></i>
            </div>
            <div class="saved-profile-info">
              <div class="saved-profile-name-row">
                <span class="saved-profile-name">${p.username}</span>
                <span class="saved-profile-badge last-used">Ostatnio zalogowany</span>
                ${isAdmin ? '<span class="saved-profile-badge admin">ADMIN</span>' : ''}
              </div>
              <div class="saved-profile-meta">
                <i class="fas fa-clock"></i> ${formatRelativeTime(p.lastLogin)}
              </div>
            </div>
          </div>
          <div class="saved-profile-right">
            <button type="button" class="saved-profile-select-btn" title="Wybierz profil">
              <i class="fas fa-arrow-right"></i>
            </button>
            <button type="button" class="saved-profile-remove" title="Usuń ten profil z szybkiego wyboru">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;

        const selectAction = () => {
          if (typeof audio !== "undefined" && audio.playClick) audio.playClick("normal");
          if (userInput) userInput.value = p.username;
          if (passInput) {
            passInput.value = "";
            passInput.focus();
          }
          if (typeof oxyAlert === "function") {
            oxyAlert(`Wybrano profil: <strong>${p.username}</strong>. Wprowadź hasło.`, "info", "PROFIL");
          }
        };

        card.addEventListener("click", selectAction);

        const removeBtn = card.querySelector(".saved-profile-remove");
        if (removeBtn) {
          removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (typeof audio !== "undefined" && audio.playClick) audio.playClick("switch");
            removeSavedProfile(p.username);
          });
        }

        container.appendChild(card);
        quickListEl.appendChild(container);

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "btn-toggle-all-users";
        toggleBtn.innerHTML = `<i class="fas fa-users"></i> Zaloguj na inne konto z serwera (${allUsers.length})`;
        toggleBtn.addEventListener("click", () => {
          showAllUsersToggle = true;
          renderQuickLoginList();
        });
        quickListEl.appendChild(toggleBtn);
        return;
      }

      const sortedUsers = [...allUsers].sort((a, b) => {
        if (a.user === "admin") return -1;
        if (b.user === "admin") return 1;
        return (a.user || "").localeCompare(b.user || "");
      });

      if (savedProfiles.length > 0) {
        const backBtn = document.createElement("button");
        backBtn.type = "button";
        backBtn.className = "btn-toggle-all-users back-to-saved";
        backBtn.innerHTML = `<i class="fas fa-arrow-left"></i> Powrót do zapamiętanego profilu`;
        backBtn.addEventListener("click", () => {
          showAllUsersToggle = false;
          renderQuickLoginList();
        });
        quickListEl.appendChild(backBtn);
      }

      const searchChassis = document.createElement("div");
      searchChassis.className = "input-chassis quick-search-chassis";
      searchChassis.innerHTML = `
        <input type="text" class="shift-input quick-search-input tactile-input" placeholder="Szukaj profilu na serwerze..." spellcheck="false">
      `;
      quickListEl.appendChild(searchChassis);

      const gridEl = document.createElement("div");
      gridEl.className = "all-users-grid";

      function renderFilteredUsers(filterText = "") {
        gridEl.innerHTML = "";
        const cleanFilter = filterText.toLowerCase().trim();
        const filtered = sortedUsers.filter((u) => (u.user || "").toLowerCase().includes(cleanFilter));

        if (filtered.length === 0) {
          gridEl.innerHTML = '<div class="quick-no-results">Brak wyników na serwerze</div>';
          return;
        }

        filtered.forEach((u) => {
          const isAdmin = u.user === "admin";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `quick-user-btn ${isAdmin ? "admin" : ""}`;
          btn.innerHTML = `<i class="fas ${isAdmin ? "fa-shield-halved" : "fa-user"}"></i><span>${u.user}</span>`;
          btn.title = isAdmin ? "Administrator systemu" : (u.workerId != null ? `Pracownik [ID: ${u.workerId}]` : "Konto użytkownika");

          btn.addEventListener("click", () => {
            if (typeof audio !== "undefined" && audio.playClick) audio.playClick("normal");
            if (userInput) {
              userInput.value = u.user;
              if (passInput) {
                passInput.value = "";
                passInput.focus();
              }
            }
            document.querySelectorAll(".quick-user-btn").forEach((b) => b.classList.remove("selected"));
            btn.classList.add("selected");
            if (typeof oxyAlert === "function") {
              oxyAlert(`Wybrano profil: <strong>${u.user}</strong>. Wprowadź hasło.`, "info", "PROFIL");
            }
          });

          gridEl.appendChild(btn);
        });
      }

      renderFilteredUsers();

      const searchInput = searchChassis.querySelector(".quick-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          renderFilteredUsers(e.target.value);
        });
      }

      quickListEl.appendChild(gridEl);
    }

    async function performLogin(username, password) {
      const userVal = String(username || "").trim();
      const passVal = String(password || "").trim();

      if (!userVal && !passVal) {
        oxyAlert("Wprowadź login i hasło.", "warning", "BRAK DANYCH");
        if (userInput) userInput.focus();
        return false;
      }

      const loginBtn = document.getElementById("btn-login");
      if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> WERYFIKACJA Z SERWEREM...';

      try {
        const apiRes = await apiRequest("/api/login", "POST", { login: userVal, password: passVal });

        if (apiRes.ok && apiRes.data && apiRes.data.success) {
          serverOnline = true;
          const userObj = apiRes.data.user;
          const token = apiRes.data.token;

          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));

          const rememberCheck = document.getElementById("login-remember-me");
          if (!rememberCheck || rememberCheck.checked) {
            saveProfileToRemembered(userObj);
          }

          unlockUi(userObj);
          audio.playClick("switch");
          oxyAlert(`Zalogowano jako: <strong>${userObj.username}</strong> (${userObj.role.toUpperCase()}) [Token aktywny]`, "success", "AUTORYZACJA SERWERA");
          return true;
        }

        const errText = apiRes.data?.message || (apiRes.status === 0
          ? "Brak połączenia z serwerem. Upewnij się, że backend jest wybudzony."
          : "Odmowa dostępu: nieprawidłowe hasło lub login.");

        if (errorMsg) {
          errorMsg.textContent = errText;
          errorMsg.style.display = "block";
        }
        if (passInput) {
          passInput.value = "";
          passInput.focus();
        }
        audio.playClick("heavy");
        oxyAlert(errText, "error", "BŁĄD AUTORYZACJI");
        return false;
      } finally {
        if (loginBtn) loginBtn.innerHTML = "ZALOGUJ";
      }
    }

    function attemptLogin() {
      performLogin(userInput ? userInput.value : "", passInput ? passInput.value : "");
    }

    if (btnLogin) btnLogin.addEventListener("click", attemptLogin);
    if (passInput) passInput.addEventListener("keypress", (e) => { if (e.key === "Enter") attemptLogin(); });
    if (userInput) userInput.addEventListener("keypress", (e) => { if (e.key === "Enter" && passInput) passInput.focus(); });

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        oxyConfirm("Czy na pewno chcesz zakończyć sesję OXY_OS?", () => {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(TOKEN_KEY);
          window.location.reload();
        });
      });
    }

    const modalUsers = document.getElementById("users-modal-overlay");
    const btnCloseUsers = document.getElementById("users-modal-close");
    const listEl = document.getElementById("users-list");
    const btnAdd = document.getElementById("btn-add-user");

    async function syncUsersFromSchedule(silent = false) {
      if (btnSyncUsers) {
        btnSyncUsers.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DOWNLOAD...';
      }

      try {
        const apiRes = await apiRequest("/api/sync-github", "POST");
        if (apiRes.ok && apiRes.data && apiRes.data.success) {
          const added = apiRes.data.addedCount || 0;
          const targetFile = apiRes.data.updatedFile || "users_db.json";
          await renderUsers();
          renderQuickLoginList();
          checkServerStatus();
          if (!silent) oxyAlert(`Zsynchronizowano konta na serwerze (dodano ${added} profili, zaktualizowano plik <code>${targetFile}</code>).`, "success", "SYNC");
          return;
        }
        throw new Error(apiRes.data?.message || "Błąd komunikacji z serwerem");
      } catch (err) {
        if (!silent) oxyAlert("Błąd synchronizacji serwera: " + err.message, "error", "BŁĄD");
      } finally {
        if (btnSyncUsers) {
          btnSyncUsers.innerHTML = '<i class="fas fa-rotate"></i> DOWNLOAD';
        }
      }
    }

    async function renderUsers() {
      if (!listEl) return;
      listEl.innerHTML = '<div class="extracted-style-44"><i class="fas fa-spinner fa-spin"></i> dowload...</div>';

      let users = [];
      const apiRes = await apiRequest("/api/users");
      if (apiRes.ok && apiRes.data && Array.isArray(apiRes.data.users)) {
        users = apiRes.data.users;
        serverUsersCache = users;
      } else {
        users = serverUsersCache;
      }

      let currentSessionUser = "";
      let currentSessionRole = "worker";
      try {
        const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
        currentSessionUser = sess.username || "";
        currentSessionRole = sess.role || "worker";
      } catch (e) {
        currentSessionUser = localStorage.getItem(SESSION_KEY) || "";
        currentSessionRole = currentSessionUser === "admin" ? "admin" : "worker";
      }

      const isCurrentAdmin = currentSessionRole === "admin";
      listEl.innerHTML = "";

      users.forEach((u, idx) => {
        const isAdmin = u.user === "admin";
        const isSelf = (u.user || "").toLowerCase() === currentSessionUser.toLowerCase();
        const row = document.createElement("div");
        row.className = "user-item-chassis";

        const roleBadge = isAdmin
          ? `<span class="user-role-badge admin-badge"><i class="fas fa-shield-halved"></i> GŁÓWNY ADMIN</span>`
          : (u.role === "worker"
            ? `<span class="user-role-badge worker-badge"><i class="fas fa-id-badge"></i> PRACOWNIK ${u.workerId != null ? `[ID: ${u.workerId}]` : ""}</span>`
            : `<span class="user-role-badge custom-badge"><i class="fas fa-user"></i> UŻYTKOWNIK</span>`);

        const isOnline = u.lastSeen && (Date.now() - u.lastSeen < 5 * 60 * 1000);
        const onlineTag = isOnline
          ? `<span class="extracted-style-45"><i class="fas fa-circle extracted-style-46"></i> ONLINE</span>`
          : `<span class="extracted-style-47"><i class="fas fa-circle extracted-style-46"></i> OFFLINE</span>`;

        row.innerHTML = `
          <div class="user-item-main">
            <div class="user-item-identity">
              <i class="fas ${isAdmin ? "fa-shield-halved text-highlight" : "fa-user text-muted"}"></i>
              <div class="user-item-details">
                <span class="user-item-name">${u.user} ${isSelf ? '<small class="extracted-style-48">(TY)</small>' : ""}</span>
                <span class="user-item-role">${roleBadge}</span>
              </div>
            </div>

            <div class="user-item-status-tag extracted-style-49">
              ${onlineTag}
              <i class="fas fa-lock extracted-style-50"></i> Serwer Bcrypt
            </div>
          </div>

          <div class="user-item-actions">
            ${(isCurrentAdmin || isSelf)
            ? `<div class="btn-bg">
                     <button type="button" class="btn btn-change-pass" data-username="${u.user}" title="Zmień hasło na serwerze dla ${u.user}">
                       <i class="fas fa-key"></i> <span class="btn-text">HASŁO</span>
                     </button>
                   </div>`
            : ""
          }

            <div class="btn-bg">
              <button type="button" class="btn btn-login-as ${isSelf ? "active" : ""}" data-username="${u.user}" title="Zaloguj jako ${u.user}">
                <i class="fas fa-right-to-bracket"></i>
                <span class="btn-text">${isSelf ? "AKTYWNY" : "WYBIERZ"}</span>
              </button>
            </div>

            ${isAdmin || !isCurrentAdmin
            ? (isAdmin ? `<div class="admin-locked-badge" title="Konto chronione"><i class="fas fa-lock"></i></div>` : "")
            : `<div class="btn-bg">
                     <button type="button" class="btn btn-icon delete-user-btn" data-username="${u.user}" data-idx="${idx}" title="Usuń konto z serwera">
                       <i class="fas fa-trash"></i>
                     </button>
                   </div>`
          }
          </div>
        `;
        listEl.appendChild(row);
      });
    }

    if (btnSyncUsers) {
      btnSyncUsers.addEventListener("click", () => syncUsersFromSchedule(false));
    }

    if (listEl) {
      listEl.addEventListener("click", async (e) => {
        const passBtn = e.target.closest(".btn-change-pass");
        if (passBtn) {
          const targetUser = passBtn.dataset.username;
          openChangePasswordDialog(targetUser);
          return;
        }

        const loginBtn = e.target.closest(".btn-login-as");
        if (loginBtn) {
          const targetUser = loginBtn.dataset.username;
          if (modalUsers) modalUsers.classList.remove("active");
          if (loginOverlay) loginOverlay.classList.remove("hidden");
          if (dashboardWrapper) dashboardWrapper.classList.add("locked");
          if (userInput) {
            userInput.value = targetUser;
            if (passInput) {
              passInput.value = "";
              passInput.focus();
            }
          }
          oxyAlert(`Wybrano konto <strong>${targetUser}</strong>. Wprowadź hasło z serwera.`, "info", "LOGOWANIE");
          return;
        }

        const deleteBtn = e.target.closest(".delete-user-btn");
        if (deleteBtn) {
          const targetUser = deleteBtn.dataset.username;
          if (targetUser === "admin") {
            oxyAlert("Nie można usunąć głównego konta administratora.", "error", "ODMOWA");
            return;
          }

          oxyConfirm(`Czy na pewno trwale usunąć profil "${targetUser}" z bazy serwera?`, async () => {
            const apiRes = await apiRequest(`/api/users/${encodeURIComponent(targetUser)}`, "DELETE");
            if (apiRes.ok) {
              oxyAlert(`Konto "${targetUser}" zostało usunięte z bazy serwera.`, "info", "USUNIĘTO");
              await renderUsers();
              renderQuickLoginList();
            } else {
              oxyAlert(apiRes.data?.message || "Błąd usuwania konta z serwera.", "error", "BŁĄD");
            }
          });
        }
      });
    }

    function openChangePasswordDialog(targetUser) {
      let overlay = document.getElementById("change-pass-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "change-pass-overlay";
        overlay.className = "shift-modal-overlay";
        overlay.innerHTML = `
          <div class="shift-modal-content shift-modal-change-pass">
            <div class="shift-modal-header">
              <h3 class="shift-modal-title"><i class="fas fa-key shift-icon-highlight"></i> Zmiana Hasła (Token Secure)</h3>
              <div class="chassis-socket"><button id="btn-close-change-pass" class="shift-modal-close">&times;</button></div>
            </div>
            <div class="shift-modal-body change-pass-body">
              <p class="change-pass-prompt">Zmień hasło dla konta: <strong id="change-pass-user-label" class="change-pass-username"></strong></p>
              <div class="input-chassis change-pass-input-wrapper">
                <input type="password" id="input-new-pass" class="shift-input tactile-input change-pass-input" placeholder="Wprowadź nowe hasło...">
              </div>
              <div class="input-chassis change-pass-input-wrapper">
                <input type="password" id="input-new-pass-confirm" class="shift-input tactile-input change-pass-input" placeholder="Powtórz nowe hasło...">
              </div>
              <div class="change-pass-actions">
                <div class="btn-bg"><button type="button" id="btn-cancel-pass" class="btn">ANULUJ</button></div>
                <div class="btn-bg"><button type="button" id="btn-submit-pass" class="btn active">ZAPISZ</button></div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("btn-close-change-pass").addEventListener("click", () => overlay.classList.remove("active"));
        document.getElementById("btn-cancel-pass").addEventListener("click", () => overlay.classList.remove("active"));
      }

      document.getElementById("change-pass-user-label").textContent = targetUser;
      const passInp = document.getElementById("input-new-pass");
      const passConf = document.getElementById("input-new-pass-confirm");
      passInp.value = "";
      passConf.value = "";
      overlay.classList.add("active");
      passInp.focus();

      const btnSubmit = document.getElementById("btn-submit-pass");
      btnSubmit.onclick = async () => {
        const p1 = passInp.value.trim();
        const p2 = passConf.value.trim();
        if (!p1 || p1.length < 3) {
          oxyAlert("Hasło musi mieć co najmniej 3 znaki.", "warning", "HASŁO");
          return;
        }
        if (p1 !== p2) {
          oxyAlert("Podane hasła nie są identyczne.", "error", "BŁĄD HASEŁ");
          return;
        }

        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ZAPISYWANIE...';
        btnSubmit.disabled = true;

        try {
          const apiRes = await apiRequest(`/api/users/${encodeURIComponent(targetUser)}/password`, "PUT", { newPassword: p1 });

          if (apiRes.ok && apiRes.data && apiRes.data.success) {
            const fileName = apiRes.data.updatedFile || "users_db.json";
            const ghNote = apiRes.data.githubSynced ? " i zacommitowane do GitHub" : "";
            oxyAlert(
              `POTWIERDZENIE: Nowe hasło dla <strong>${targetUser}</strong> zostało zapisane na serwerze w pliku <code>${fileName}</code>${ghNote}!`,
              "success",
              "SUKCES BAZY"
            );
            overlay.classList.remove("active");
            audio.playClick("switch");
          } else {
            const msg = apiRes.data?.message || (apiRes.status === 403 ? "Brak uprawnień tokena lub sesja wygasła." : "Błąd serwera.");
            oxyAlert(msg, "error", "BŁĄD SERWERA");
          }
        } finally {
          btnSubmit.innerHTML = "ZAPISZ POD TOKEN";
          btnSubmit.disabled = false;
        }
      };
    }

    if (btnAdd) {
      btnAdd.addEventListener("click", async () => {
        const uInp = document.getElementById("new-username");
        const pInp = document.getElementById("new-password");
        const uVal = uInp ? uInp.value.trim().replace(/\s+/g, "_") : "";
        const pVal = pInp ? pInp.value.trim() : "";

        if (!uVal || !pVal) {
          oxyAlert("Podaj login i hasło dla nowego użytkownika.", "warning", "BRAK DANYCH");
          return;
        }

        btnAdd.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
          const apiRes = await apiRequest("/api/users", "POST", { user: uVal, pass: pVal, role: "custom" });
          if (apiRes.ok && apiRes.data && apiRes.data.success) {
            const fileName = apiRes.data.updatedFile || "users_db.json";
            oxyAlert(`Konto (${uVal}) zostało utworzone i zapisane w pliku <code>${fileName}</code>!`, "success", "DODANO KONTO");
            if (uInp) uInp.value = "";
            if (pInp) pInp.value = "";
            await renderUsers();
            renderQuickLoginList();
          } else {
            oxyAlert(apiRes.data?.message || "Błąd zapisu na serwerze.", "error", "BŁĄD SERWERA");
          }
        } finally {
          btnAdd.innerHTML = '<i class="fas fa-plus"></i>';
        }
      });
    }

    if (btnOpenUsers) {
      btnOpenUsers.addEventListener("click", async () => {
        await checkServerStatus();
        await renderUsers();
        modalUsers.classList.add("active");
      });
    }

    if (btnCloseUsers) btnCloseUsers.addEventListener("click", () => modalUsers.classList.remove("active"));
    if (modalUsers) {
      modalUsers.addEventListener("click", (e) => {
        if (e.target === modalUsers) modalUsers.classList.remove("active");
      });
    }

    window.syncUsersFromSchedule = syncUsersFromSchedule;
  }

  // ==========================================
  // MODAL I WIDOK HISTORII ZMIAN (DIFF & LOG)
  // ==========================================
  let activeHistoryFilter = "all";

  function renderScheduleHistoryUi() {
    const listEl = document.getElementById("history-log-list");
    const statManual = document.getElementById("history-stat-manual");
    const statCloud = document.getElementById("history-stat-cloud");
    const statTotal = document.getElementById("history-stat-total");

    if (!listEl) return;

    let manualCount = 0;
    let cloudCount = 0;
    scheduleHistory.forEach(item => {
      if (item.source === "cloud") cloudCount++;
      else manualCount++;
    });

    if (statManual) statManual.textContent = String(manualCount);
    if (statCloud) statCloud.textContent = String(cloudCount);
    if (statTotal) statTotal.textContent = String(scheduleHistory.length);

    const filtered = scheduleHistory.filter(item => {
      if (activeHistoryFilter === "all") return true;
      if (activeHistoryFilter === "cloud") return item.source === "cloud";
      if (activeHistoryFilter === "manual") return item.source === "manual";
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="history-empty-state">
          <i class="fas fa-clock-rotate-left"></i>
          <div>Brak zarejestrowanych zmian w tej kategorii.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const isCloud = item.source === "cloud";
      const dateObj = new Date(item.timestamp);
      const timeStr = !isNaN(dateObj.getTime())
        ? `${dateObj.toLocaleDateString("pl-PL")} ${dateObj.toLocaleTimeString("pl-PL")}`
        : item.timestamp;

      let diffHtml = "";
      if (Array.isArray(item.diffs) && item.diffs.length > 0) {
        diffHtml = `
          <div class="history-diff-list">
            ${item.diffs.map(d => {
              if (d.type === "shift_changed") {
                return `
                  <div class="history-diff-row">
                    <span class="history-diff-worker">${d.worker}</span>
                    <span class="history-diff-day">[${d.day || ""}]</span>
                    <span class="history-diff-change">
                      <span class="diff-old-val">${d.oldVal}</span>
                      <span class="diff-arrow"><i class="fas fa-arrow-right"></i></span>
                      <span class="diff-new-val">${d.newVal}</span>
                    </span>
                  </div>
                `;
              }
              return `
                <div class="history-diff-row">
                  <span class="history-diff-worker">${d.text || d.type}</span>
                </div>
              `;
            }).join("")}
          </div>
        `;
      } else if (item.summary) {
        diffHtml = `<div class="history-diff-list"><div class="history-diff-row">${item.summary}</div></div>`;
      }

      return `
        <div class="history-item-card type-${item.source || "manual"}">
          <div class="history-item-top">
            <span class="history-badge ${isCloud ? "badge-cloud" : "badge-manual"}">
              <i class="fas ${isCloud ? "fa-cloud-arrow-down" : "fa-user-pen"}"></i>
              ${isCloud ? "Synchronizacja Chmury" : "Edycja Lokalna"}
            </span>
            <span class="history-item-time"><i class="fas fa-clock"></i> ${timeStr}</span>
          </div>
          <div class="history-item-title">
            <span>${item.title || "Zmiana w grafiku"}</span>
            <small style="color: var(--text-muted); font-size: 0.72rem; margin-left: auto;">${item.user || ""}</small>
          </div>
          ${diffHtml}
        </div>
      `;
    }).join("");
  }

  function initScheduleHistoryModal() {
    loadScheduleHistory();

    const modal = document.getElementById("history-modal-overlay");
    const btnOpen = document.getElementById("btn-history");
    const btnClose = document.getElementById("history-modal-close");
    const btnClear = document.getElementById("btn-clear-history");

    const tabAll = document.getElementById("history-filter-all");
    const tabCloud = document.getElementById("history-filter-cloud");
    const tabManual = document.getElementById("history-filter-manual");

    if (btnOpen && modal) {
      btnOpen.addEventListener("click", () => {
        audio.playClick("switch");
        renderScheduleHistoryUi();
        modal.classList.add("active");
      });
    }

    const fileUpdateCard = document.getElementById("file-update-card");
    if (fileUpdateCard && modal) {
      fileUpdateCard.style.cursor = "pointer";
      fileUpdateCard.title = "Kliknij, aby otworzyć historię zmian i diff grafiku";
      fileUpdateCard.addEventListener("click", (e) => {
        if (e.target.closest("button, a")) return;
        audio.playClick("switch");
        renderScheduleHistoryUi();
        modal.classList.add("active");
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener("click", () => {
        audio.playClick("normal");
        modal.classList.remove("active");
      });
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
      });
    }

    if (btnClear) {
      btnClear.addEventListener("click", () => {
        if (scheduleHistory.length === 0) {
          oxyAlert("Historia zmian jest już pusta.", "info", "HISTORIA");
          return;
        }
        oxyConfirm("Czy na pewno chcesz wyczyścić cały lokalny rejestr historii zmian grafiku?", () => {
          scheduleHistory = [];
          localStorage.removeItem(HISTORY_STORAGE_KEY);
          renderScheduleHistoryUi();
          oxyAlert("Historia zmian grafiku została wyczyszczona.", "info", "WYCZYSZCZONO");
        });
      });
    }

    const setTab = (filter, activeBtn) => {
      activeHistoryFilter = filter;
      [tabAll, tabCloud, tabManual].forEach(b => b?.classList.remove("active"));
      activeBtn?.classList.add("active");
      renderScheduleHistoryUi();
    };

    if (tabAll) tabAll.addEventListener("click", () => { audio.playClick("switch"); setTab("all", tabAll); });
    if (tabCloud) tabCloud.addEventListener("click", () => { audio.playClick("switch"); setTab("cloud", tabCloud); });
    if (tabManual) tabManual.addEventListener("click", () => { audio.playClick("switch"); setTab("manual", tabManual); });
  }

  // ==========================================
  // INICJALIZACJA STARTOWA (BOOT APPLICATION)
  // ==========================================
  function bootApplication() {
    const savedTheme = localStorage.getItem("oxy_os_theme") || "dark";
    document.documentElement.setAttribute("theme", savedTheme);

    checkServerStatus();
    setInterval(checkServerStatus, 25000);
    initLoginSystem();

    if (typeof AppIcons !== "undefined") {
      const injectIcon = (id, iconSvg, fallbackHtml = "") => {
        const dest = document.getElementById(id);
        if (dest) {
          if (iconSvg && typeof iconSvg === "string" && iconSvg.trim()) {
            dest.innerHTML = iconSvg;
          } else if (fallbackHtml) {
            dest.innerHTML = fallbackHtml;
          }
        }
      };
      injectIcon("icon-calendar-dest", AppIcons.calendarGlass);
      injectIcon("icon-cube-dest", AppIcons.cubeGlass);
      injectIcon("icon-cloud-download-dest", AppIcons.cloudDownload);
      injectIcon("icon-sun-dest", savedTheme === "light" ? AppIcons.sparkle2 : AppIcons.brightnessIncrease);
      injectIcon("icon-file-download-dest", AppIcons.filedownload);
      injectIcon("icon-storage-dest", AppIcons.storagedest, '<i class="fas fa-database"></i>');
      injectIcon("icon-user-dest", AppIcons.userdest || AppIcons.userGlass, '<i class="fas fa-user-cog"></i>');
      injectIcon("circle-power-off-dest", AppIcons.circlepoweroffdest || AppIcons.powerGlass, '<i class="fas fa-sign-out-alt logout-icon"></i>');
    }

    createShiftListModal();
    initShiftsView();
    createWorkerCalendarModal();
    initServerConfigModal();
    initScheduleHistoryModal();
    loadData();
    initTabsAndEditor();
    initCharts();
    startClock();
    renderSchedule();
    renderShiftsView();

    const btnKto = document.getElementById("btn-kto-na-zmianie") || document.getElementById("btn-view-shifts");
    if (btnKto) {
      btnKto.addEventListener("click", () => {
        audio.playClick("switch");
        switchView("shifts");
      });
    }

    const wDay = document.getElementById("widget-day-count")?.closest(".widget-card");
    if (wDay) {
      wDay.style.cursor = "pointer";
      wDay.title = "Kliknij, aby otworzyć listę pracowników na dniówce";
      wDay.addEventListener("click", () => {
        audio.playClick("switch");
        openShiftListModal(null, "day");
      });
    }

    const wNight = document.getElementById("widget-night-count")?.closest(".widget-card");
    if (wNight) {
      wNight.style.cursor = "pointer";
      wNight.title = "Kliknij, aby otworzyć listę pracowników na nocce";
      wNight.addEventListener("click", () => {
        audio.playClick("switch");
        openShiftListModal(null, "night");
      });
    }

    const btnCloud = document.getElementById("btn-cloud-fetch");
    if (btnCloud) {
      btnCloud.addEventListener("click", async () => {
        const iconDest = document.getElementById("icon-cloud-download-dest");
        if (iconDest) iconDest.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
          const res = await fetch(GITHUB_URL, { cache: "no-store" });
          if (!res.ok) throw new Error("Błąd pobierania");
          const data = await res.json();

          // Obliczenie różnic (diff) pomiędzy obecną wersją a wersją z chmury
          const prevMonths = appState.allMonths;
          const diffs = computeScheduleDiff(prevMonths, data);

          appState.allMonths = data;
          appState.content = JSON.stringify(data, null, 2);
          localStorage.setItem(STORAGE_KEY, appState.content);
          localStorage.setItem("oxy_last_cloud_sync", new Date().toISOString());

          appState.activeMonthIdx = findCurrentMonthIndex();
          const currentGen = (data[appState.activeMonthIdx]?.meta?.generated) || new Date().toISOString();
          isNewFileUpdateActive = true;
          localStorage.setItem(STORAGE_SEEN_FILE_UPDATE, currentGen);
          cachedGitHubCommit = null;

          // Zapis do historii zmian
          const monthName = data[appState.activeMonthIdx]?.meta?.month || "Bieżący miesiąc";
          if (diffs.length > 0) {
            addScheduleHistoryEntry({
              source: "cloud",
              title: `Pobrano aktualizację z GitHub (${diffs.length} zmian)`,
              month: monthName,
              diffs: diffs
            });
          } else {
            addScheduleHistoryEntry({
              source: "cloud",
              title: `Synchronizacja z GitHub (brak zmian grafiku)`,
              month: monthName,
              summary: "Plik grafiku został pobrany, wersja jest w 100% zgodna z chmurą."
            });
          }

          const editorEl = document.getElementById("json-editor");
          if (editorEl) editorEl.value = appState.content;

          renderSchedule();
          syncDashboardCharts();

          if (typeof window.syncUsersFromSchedule === "function") {
            window.syncUsersFromSchedule(true);
          }

          const changesNote = diffs.length > 0 ? ` (wykryto ${diffs.length} zmian w obsadzie)` : ` (brak zmian w stosunku do lokalnej wersji)`;
          oxyAlert(`Pobrano najnowsze dane z chmury${changesNote}. Grafik został zaktualizowany.`, "success", "Update");
        } catch (e) {
          oxyAlert("Błąd chmury: " + e.message, "error", "BŁĄD");
        } finally {
          if (iconDest && typeof AppIcons !== "undefined") {
            iconDest.innerHTML = AppIcons.cloudDownload || "";
          }
        }
      });
    }

    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        document.documentElement.classList.add("theme-switching");
        const current = document.documentElement.getAttribute("theme") || "dark";
        const newTheme = current === "dark" ? "light" : "dark";

        document.documentElement.setAttribute("theme", newTheme);
        localStorage.setItem("oxy_os_theme", newTheme);

        const iconDest = document.getElementById("icon-sun-dest");
        if (iconDest && typeof AppIcons !== "undefined") {
          iconDest.innerHTML = newTheme === "light" ? (AppIcons.sparkle2 || "") : (AppIcons.brightnessIncrease || "");
        }

        updateChartTheme();
        renderSchedule();
        setTimeout(() => document.documentElement.classList.remove("theme-switching"), 50);
        audio.playClick("switch");
      });
    }

    let deferredInstallPrompt = null;
    const pwaBtn = document.getElementById("btn-pwa-install");

    function isPwaInstalled() {
      return window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem("oxy_pwa_installed") === "true";
    }

    if (pwaBtn) {
      if (isPwaInstalled()) {
        pwaBtn.style.display = "none";
      }

      pwaBtn.addEventListener("click", async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === "accepted") {
            localStorage.setItem("oxy_pwa_installed", "true");
            pwaBtn.style.display = "none";
            oxyAlert("Aplikacja OXY_OS została pomyślnie zainstalowana.", "success", "PWA");
          }
          deferredInstallPrompt = null;
        } else {
          oxyAlert("Aplikacja OXY_OS jest gotowa w przeglądarce.", "info", "PWA");
        }
      });
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (pwaBtn && !isPwaInstalled()) {
        pwaBtn.style.display = "";
        pwaBtn.style.opacity = "1";
      }
    });

    window.addEventListener("appinstalled", () => {
      localStorage.setItem("oxy_pwa_installed", "true");
      deferredInstallPrompt = null;
      if (pwaBtn) pwaBtn.style.display = "none";
      oxyAlert("Aplikacja OXY_OS została zainstalowana.", "success", "PWA");
    });

    try {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
        if (evt.matches && pwaBtn) {
          pwaBtn.style.display = "none";
        }
      });
    } catch (e) { }
  }

  window._oxyAudio = audio;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApplication);
  } else {
    bootApplication();
  }
})();

document.addEventListener("click", (e) => {
  if (!e.target.closest(".se-select-wrap")) {
    document.querySelectorAll(".se-select-wrap.se-select-open").forEach((w) => {
      w.classList.remove("se-select-open");
      w.querySelector(".se-select-btn")?.classList.remove("se-open");
      w.querySelector(".se-select-list")?.classList.remove("se-visible");
    });
  }

  const btn = e.target.closest("button, .btn, .icon-btn, .month-tab-btn, .option");
  if (btn && !btn.classList.contains("select-trigger")) {
    if (window._oxyAudio && typeof window._oxyAudio.playClick === "function") {
      window._oxyAudio.playClick("normal");
    }
  }
});