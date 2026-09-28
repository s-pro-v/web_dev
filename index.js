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
      } catch (e) {
        // Ignoruj błędy autoodtwarzania
      }
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
  const GITHUB_URL = "https://raw.githubusercontent.com/s-pro-v/json-lista/refs/heads/main/mobile-grafik.json";

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

  // ==========================================
  // ZAKŁADKI, EDYTOR I CZAS
  // ==========================================
  function initTabsAndEditor() {
    ["dashboard", "schedule", "code"].forEach((tab) => {
      const btn = document.getElementById(`btn-view-${tab}`);
      if (btn) {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".view-container").forEach((el) => el.classList.remove("active"));
          document.querySelectorAll(".btn-group .btn").forEach((el) => el.classList.remove("active"));

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

    days.forEach((d, i) => {
      const wd = weekdays[i] || "";
      const isWeekend = wd === "SO" || wd === "ND";
      html += `<th class="top-header bottom-header day-col-header" data-d="${i}" title="Kliknij, aby sprawdzić kto ma zmianę w dniu ${d}" style="cursor: pointer; ${isWeekend ? "color:red;" : ""}">
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

        if (!appState.allMonths[appState.activeMonthIdx].workers[w].shifts) {
          appState.allMonths[appState.activeMonthIdx].workers[w].shifts = [];
        }
        appState.allMonths[appState.activeMonthIdx].workers[w].shifts[s] = e.target.value;

        appState.content = JSON.stringify(appState.allMonths, null, 2);
        localStorage.setItem(STORAGE_KEY, appState.content);

        const ed = document.getElementById("json-editor");
        if (ed) ed.value = appState.content;

        renderSchedule();
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

  // ==========================================
  // KALENDARZ PRACOWNIKA & OBSADA ZMIAN
  // ==========================================
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
      gridHtml += `<div class="cal-header">${day}</div>`;
    });

    for (let i = 0; i < firstDayOffset; i++) gridHtml += `<div class="cal-cell empty"></div>`;

    daysArr.forEach((dayNum, idx) => {
      const shift = getDisplayShiftCode(w.shifts[idx]);
      let shiftHtml = "";
      const isWeekend = weekdaysArr[idx] === "SO" || weekdaysArr[idx] === "ND";
      let cellClass = `cal-cell ${isWeekend ? "weekend" : ""}`;

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

      gridHtml += `<div class="${cellClass}"><div class="cal-day-num">${dayNum}</div>${shiftHtml}</div>`;
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

  let activeShiftModalDayIdx = 0;
  let activeShiftFilter = "all";
  let activeShiftSearch = "";

  function createShiftListModal() {
    if (document.getElementById("shift-modal-overlay")) return;
    const modal = document.createElement("div");
    modal.id = "shift-modal-overlay";
    modal.className = "shift-modal-overlay";
    modal.innerHTML = `
      <div class="shift-modal-content extracted-style-18">
        <div class="shift-modal-header extracted-style-19">
          <div class="extracted-style-20">
            <h3 class="shift-modal-title" id="shift-modal-title" class="extracted-style-21">
              <i class="fas fa-users-viewfinder extracted-style-22"></i> Obsada
            </h3>
          </div>
          <div class="modal-day-controls extracted-style-23">
            <button id="shift-modal-prev-day" class="btn modal-nav-btn" title="Poprzedni dzień"><i class="fas fa-chevron-left"></i></button>
            <button id="shift-modal-today" class="btn extracted-style-24" title="Przejdź do dzisiaj">Dziś</button>
            <button id="shift-modal-next-day" class="btn modal-nav-btn" title="Następny dzień"><i class="fas fa-chevron-right"></i></button>
          </div>
           <div class="chassis-socket extracted-style-25">
              <button id="shift-modal-close" class="shift-modal-close">&times;</button>
            </div>
        </div>

        <div class="extracted-style-26">
          <div class="extracted-style-27">
            <button id="shift-filter-all" class="btn active extracted-style-28">Wszyscy (<span id="shift-cnt-all">0</span>)</button>
            <button id="shift-filter-day" class="btn extracted-style-29"><i class="fas fa-sun"></i> Dzień (<span id="shift-cnt-day">0</span>)</button>
            <button id="shift-filter-night" class="btn extracted-style-30"><i class="fas fa-moon"></i> Noc (<span id="shift-cnt-night">0</span>)</button>
          </div>
          <div class="input-chassis extracted-style-31">
            <input type="text" id="shift-search-input" class="shift-input tactile-input" placeholder="Szukaj osoby lub ID..." class="extracted-style-32">
          </div>
        </div>

        <div id="shift-modal-body" class="shift-modal-body extracted-style-33"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("shift-modal-close").addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("active"); });

    document.getElementById("shift-modal-prev-day").addEventListener("click", () => {
      openShiftListModal(activeShiftModalDayIdx - 1, activeShiftFilter);
    });

    document.getElementById("shift-modal-next-day").addEventListener("click", () => {
      openShiftListModal(activeShiftModalDayIdx + 1, activeShiftFilter);
    });

    document.getElementById("shift-modal-today").addEventListener("click", () => {
      openShiftListModal(null, activeShiftFilter);
    });

    const btnAll = document.getElementById("shift-filter-all");
    const btnDay = document.getElementById("shift-filter-day");
    const btnNight = document.getElementById("shift-filter-night");
    const searchInp = document.getElementById("shift-search-input");

    const setFilter = (filt) => {
      activeShiftFilter = filt;
      [btnAll, btnDay, btnNight].forEach(b => b.classList.remove("active"));
      if (filt === "all") btnAll.classList.add("active");
      if (filt === "day") btnDay.classList.add("active");
      if (filt === "night") btnNight.classList.add("active");
      renderShiftModalList();
    };

    btnAll.addEventListener("click", () => setFilter("all"));
    btnDay.addEventListener("click", () => setFilter("day"));
    btnNight.addEventListener("click", () => setFilter("night"));

    if (searchInp) {
      searchInp.addEventListener("input", (e) => {
        activeShiftSearch = (e.target.value || "").trim().toLowerCase();
        renderShiftModalList();
      });
    }
  }

  function renderShiftModalList() {
    const body = document.getElementById("shift-modal-body");
    const title = document.getElementById("shift-modal-title");
    const cntAll = document.getElementById("shift-cnt-all");
    const cntDay = document.getElementById("shift-cnt-day");
    const cntNight = document.getElementById("shift-cnt-night");

    if (appState.allMonths.length === 0) return;
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.workers) return;

    const daysArr = currentData.meta.days || [];
    const weekdaysArr = currentData.meta.weekdays || [];

    if (activeShiftModalDayIdx < 0) activeShiftModalDayIdx = 0;
    if (activeShiftModalDayIdx >= daysArr.length) activeShiftModalDayIdx = daysArr.length - 1;

    const dayNum = daysArr[activeShiftModalDayIdx] || (activeShiftModalDayIdx + 1);
    const dayWd = weekdaysArr[activeShiftModalDayIdx] || "";
    const isToday = String(new Date().getDate()) === String(dayNum);

    if (title) {
      title.innerHTML = `
        <i class="fas fa-users-viewfinder extracted-style-22"></i>
        Dzień ${dayNum} <small class="extracted-style-34">(${dayWd}${isToday ? " • DZIŚ" : ""})</small>
      `;
    }

    const currentTheme = document.documentElement.getAttribute("theme") || "dark";
    const dayWorkers = [];
    const nightWorkers = [];

    currentData.workers.forEach((w, wIdx) => {
      const val = getDisplayShiftCode(w.shifts ? w.shifts[activeShiftModalDayIdx] : "");
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

    let html = "";
    if (showDay) {
      html += `
        <div class="shift-column extracted-style-35">
          <div class="shift-col-header day"><i class="fas fa-sun"></i> DNIÓWKA (${dayWorkers.length})</div>
          <div class="shift-col-list">
            ${dayWorkers.length ? dayWorkers.map(buildWorkerRow).join("") : "<div class='shift-empty-msg'>Brak obsady</div>"}
          </div>
        </div>
      `;
    }

    if (showNight) {
      html += `
        <div class="shift-column extracted-style-35">
          <div class="shift-col-header night"><i class="fas fa-moon"></i> NOCKA (${nightWorkers.length})</div>
          <div class="shift-col-list">
            ${nightWorkers.length ? nightWorkers.map(buildWorkerRow).join("") : "<div class='shift-empty-msg'>Brak obsady</div>"}
          </div>
        </div>
      `;
    }

    if (!html) {
      html = `<div class="shift-modal-empty extracted-style-36">Brak pracowników spełniających kryteria.</div>`;
    }

    body.innerHTML = html;

    body.querySelectorAll(".shift-worker-item").forEach(item => {
      item.addEventListener("click", () => {
        const wIdx = parseInt(item.dataset.w, 10);
        if (!isNaN(wIdx)) {
          openWorkerCalendarModal(wIdx);
        }
      });
    });
  }

  function openShiftListModal(eOrIdx = null, filter = "all") {
    createShiftListModal();
    const modal = document.getElementById("shift-modal-overlay");
    if (!modal) return;

    if (appState.allMonths.length === 0) return;
    const currentData = appState.allMonths[appState.activeMonthIdx];
    if (!currentData || !currentData.workers) return;

    const daysArr = currentData.meta.days || [];
    const todayStr = String(new Date().getDate());
    const todayIdx = daysArr.indexOf(todayStr);

    if (typeof eOrIdx === "number") {
      activeShiftModalDayIdx = eOrIdx;
    } else if (eOrIdx == null) {
      activeShiftModalDayIdx = todayIdx !== -1 ? todayIdx : 0;
    }

    if (filter) {
      activeShiftFilter = filter;
      const btnAll = document.getElementById("shift-filter-all");
      const btnDay = document.getElementById("shift-filter-day");
      const btnNight = document.getElementById("shift-filter-night");
      if (btnAll && btnDay && btnNight) {
        [btnAll, btnDay, btnNight].forEach(b => b.classList.remove("active"));
        if (filter === "all") btnAll.classList.add("active");
        if (filter === "day") btnDay.classList.add("active");
        if (filter === "night") btnNight.classList.add("active");
      }
    }

    renderShiftModalList();
    modal.classList.add("active");
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

    const lastUpdateEl = document.getElementById("last-update-time");
    if (lastUpdateEl) {
      const nowStr = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
      lastUpdateEl.innerHTML = `
        <span class="led-indicator ${serverOnline ? "active" : ""}"></span>
        <i class="fas fa-clock last-update-icon"></i> Dziś, ${nowStr}
      `;
    }

    const sysInfoList = document.getElementById("system-info-list");
    if (sysInfoList) {
      sysInfoList.innerHTML = `
        <div class="transaction-item extracted-style-37">
          <div class="widget-icon ${serverOnline ? "icon-bg-green" : "icon-bg-red"}" class="extracted-style-38">
            <i class="fas ${serverOnline ? "fa-shield-halved" : "fa-shield"}"></i>
          </div>
          <div class="extracted-style-39">
            <div class="extracted-style-40">Autoryzacja Serwera</div>
            <div class="extracted-style-41">${serverOnline ? "ONLINE (Bcrypt Express :3000)" : "OFFLINE (Brak połączenia)"}</div>
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
  // KOMUNIKACJA Z BACKENDEM EXPRESS & RENDER.COM
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
      const opts = {
        method,
        headers: { "Content-Type": "application/json" }
      };
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
  // ZARZĄDZANIE UŻYTKOWNIKAMI & LOGOWANIE (SERVER-ONLY)
  // ==========================================
  function initLoginSystem() {
    const SESSION_KEY = "oxy_os_user";
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
    if (savedSession) {
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

    // Pobieranie listy kont z serwera
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

    // GŁÓWNA WERYFIKACJA LOGOWANIA WYSYŁANA DO SERWERA
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
          const rememberCheck = document.getElementById("login-remember-me");
          if (!rememberCheck || rememberCheck.checked) {
            saveProfileToRemembered(userObj);
          }
          localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));

          unlockUi(userObj);
          audio.playClick("switch");
          oxyAlert(`Zalogowano jako: <strong>${userObj.username}</strong> (${userObj.role.toUpperCase()})`, "success", "AUTORYZACJA SERWERA");
          return true;
        }

        const errText = apiRes.data?.message || (apiRes.status === 0
          ? "Brak połączenia z serwerem. Upewnij się, że backend jest uruchomiony."
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
        btnSyncUsers.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCHRONIZACJA Z SERWEREM...';
      }

      try {
        const apiRes = await apiRequest("/api/sync-github", "POST");
        if (apiRes.ok && apiRes.data && apiRes.data.success) {
          const added = apiRes.data.addedCount || 0;
          const targetFile = apiRes.data.updatedFile || "users_db.json";
          await renderUsers();
          renderQuickLoginList();
          checkServerStatus();
          if (!silent) oxyAlert(`Zsynchronizowano konta na serwerze (dodano ${added} profili, zaktualizowano plik <code>${targetFile}</code>).`, "success", "SYNCHRONIZACJA SERWERA");
          return;
        }
        throw new Error(apiRes.data?.message || "Błąd komunikacji z serwerem");
      } catch (err) {
        if (!silent) oxyAlert("Błąd synchronizacji serwera: " + err.message, "error", "BŁĄD");
      } finally {
        if (btnSyncUsers) {
          btnSyncUsers.innerHTML = '<i class="fas fa-rotate"></i> SYNCHRONIZUJ';
        }
      }
    }

    async function renderUsers() {
      if (!listEl) return;
      listEl.innerHTML = '<div class="extracted-style-44"><i class="fas fa-spinner fa-spin"></i> Pobieranie kont z serwera...</div>';

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

          oxyConfirm(`Czy na pewno trwale usunąć profil "${targetUser}" z serwera?`, async () => {
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

    // ZMIANA HASŁA BEZPOŚREDNIO NA SERWERZE Z POTWIERDZENIEM
    function openChangePasswordDialog(targetUser) {
      let overlay = document.getElementById("change-pass-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "change-pass-overlay";
        overlay.className = "shift-modal-overlay";
        overlay.innerHTML = `
          <div class="shift-modal-content shift-modal-change-pass">
            <div class="shift-modal-header">
              <h3 class="shift-modal-title"><i class="fas fa-key shift-icon-highlight"></i> Zmiana Hasła na Serwerze</h3>
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
                <div class="btn-bg"><button type="button" id="btn-submit-pass" class="btn active">ZAPISZ NA SERWERZE</button></div>
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
        try {
          const apiRes = await apiRequest(`/api/users/${encodeURIComponent(targetUser)}/password`, "PUT", { newPassword: p1 });
          if (apiRes.ok && apiRes.data && apiRes.data.success) {
            const fileName = apiRes.data.updatedFile || "users_db.json";
            oxyAlert(
              `POTWIERDZENIE: Nowe hasło dla <strong>${targetUser}</strong> zostało zapisane, a plik <code>${fileName}</code> zaktualizowany na serwerze!`,
              "success",
              "ZAPIS ZAKOŃCZONY"
            );
            overlay.classList.remove("active");
            audio.playClick("switch");
          } else {
            oxyAlert(apiRes.data?.message || "Nie udało się zapisać hasła na serwerze.", "error", "BŁĄD SERWERA");
          }
        } finally {
          btnSubmit.innerHTML = "ZAPISZ NA SERWERZE";
        }
      };
    }

    // DODAWANIE NOWEGO PROFILU DO SERWERA Z POTWIERDZENIEM
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
  // INICJALIZACJA STARTOWA (BOOT APPLICATION)
  // ==========================================
  function bootApplication() {
    const savedTheme = localStorage.getItem("oxy_os_theme") || "dark";
    document.documentElement.setAttribute("theme", savedTheme);

    checkServerStatus();
    setInterval(checkServerStatus, 25000);
    initLoginSystem();

    if (typeof AppIcons !== "undefined") {
      const injectIcon = (id, iconSvg) => {
        const dest = document.getElementById(id);
        if (dest && iconSvg) dest.innerHTML = iconSvg;
      };
      injectIcon("icon-calendar-dest", AppIcons.calendarGlass);
      injectIcon("icon-cube-dest", AppIcons.cubeGlass);
      injectIcon("icon-cloud-download-dest", AppIcons.cloudDownload);
      injectIcon("icon-sun-dest", savedTheme === "light" ? AppIcons.sparkle2 : AppIcons.brightnessIncrease);
      injectIcon("icon-file-download-dest", AppIcons.filedownload);
    }

    createShiftListModal();
    createWorkerCalendarModal();
    initServerConfigModal();
    loadData();
    initTabsAndEditor();
    initCharts();
    startClock();
    renderSchedule();

    const btnKto = document.getElementById("btn-kto-na-zmianie");
    if (btnKto) {
      btnKto.addEventListener("click", () => {
        openShiftListModal();
      });
    }

    const wDay = document.getElementById("widget-day-count")?.closest(".widget-card");
    if (wDay) {
      wDay.style.cursor = "pointer";
      wDay.title = "Kliknij, aby otworzyć listę pracowników na dniówce";
      wDay.addEventListener("click", () => openShiftListModal(null, "day"));
    }

    const wNight = document.getElementById("widget-night-count")?.closest(".widget-card");
    if (wNight) {
      wNight.style.cursor = "pointer";
      wNight.title = "Kliknij, aby otworzyć listę pracowników na nocce";
      wNight.addEventListener("click", () => openShiftListModal(null, "night"));
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
          appState.allMonths = data;
          appState.content = JSON.stringify(data, null, 2);
          localStorage.setItem(STORAGE_KEY, appState.content);

          const editorEl = document.getElementById("json-editor");
          if (editorEl) editorEl.value = appState.content;

          appState.activeMonthIdx = findCurrentMonthIndex();
          renderSchedule();

          if (typeof window.syncUsersFromSchedule === "function") {
            window.syncUsersFromSchedule(true);
          }

          oxyAlert("Pobrano najnowsze dane z chmury.", "success", "SYNCHRONIZACJA");
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
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const pwaBtn = document.getElementById("btn-pwa-install");
      if (pwaBtn) pwaBtn.style.opacity = "1";
    });

    const pwaBtn = document.getElementById("btn-pwa-install");
    if (pwaBtn) {
      pwaBtn.addEventListener("click", async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === "accepted") {
            oxyAlert("Aplikacja OXY_OS została pomyślnie zainstalowana.", "success", "PWA");
          }
          deferredInstallPrompt = null;
        } else {
          oxyAlert("Aplikacja OXY_OS jest gotowa w przeglądarce.", "info", "PWA");
        }
      });
    }
  }

  window._oxyAudio = audio;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApplication);
  } else {
    bootApplication();
  }
})();

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button, .btn, .icon-btn, .month-tab-btn, .option");
  if (btn && !btn.classList.contains("select-trigger")) {
    if (window._oxyAudio && typeof window._oxyAudio.playClick === "function") {
      window._oxyAudio.playClick("normal");
    }
  }
});