(function () {
  "use strict";

  // ==========================================
  // SYSTEM ALERTÓW OXY_OS
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

  // ==========================================
  // SYSTEM POTWIERDZEŃ (MODAL OXY_OS)
  // ==========================================
  function oxyConfirm(message, onConfirm) {
    let overlay = document.getElementById("oxy-confirm-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "oxy-confirm-overlay";
      // Wykorzystujemy klasy z ekranu logowania dla pełnoekranowego zaciemnienia
      overlay.className = "login-overlay hidden";
      overlay.style.zIndex = "9999999";
      overlay.innerHTML = `
          <div class="login-box card" style="max-width: 380px; text-align: center; border-top: 4px solid var(--warning-color);">
              <div style="font-size: 40px; color: var(--warning-color); margin-bottom: 1rem;"><i class="fas fa-exclamation-triangle"></i></div>
              <h2 class="card-title" style="margin-bottom: 1rem;">WYMAGANE POTWIERDZENIE</h2>
              <p id="oxy-confirm-msg" style="margin-bottom: 1.5rem; color: var(--text-muted); font-size: 14px; line-height: 1.4;"></p>
              <div style="display: flex; gap: 10px;">
                  <button id="oxy-confirm-no" class="btn" style="flex: 1; justify-content: center; height: 40px;">ANULUJ</button>
                  <button id="oxy-confirm-yes" class="btn active" style="flex: 1; justify-content: center; height: 40px; background: var(--danger-color) !important; border-color: var(--danger-color) !important; color: #fff;">TAK, WYKONAJ</button>
              </div>
          </div>
      `;
      document.body.appendChild(overlay);
    }

    document.getElementById("oxy-confirm-msg").textContent = message;

    // Wymuszenie reflow i pokazanie okna
    setTimeout(() => overlay.classList.remove("hidden"), 10);

    const btnYes = document.getElementById("oxy-confirm-yes");
    const btnNo = document.getElementById("oxy-confirm-no");

    // Klonowanie zapobiega kumulowaniu się eventów przy wielokrotnym wywołaniu
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
  // 1. ZARZĄDZANIE STANEM, DANYMI I GRUPAMI
  // ==========================================
  const STORAGE_KEY = "harmonogram_data";
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
      "STYCZEN",
      "LUTY",
      "MARZEC",
      "KWIECIEN",
      "MAJ",
      "CZERWIEC",
      "LIPIEC",
      "SIERPIEN",
      "WRZESIEN",
      "PAZDZIERNIK",
      "LISTOPAD",
      "GRUDZIEN",
    ];
    const currentMonthName = polishMonths[new Date().getMonth()];

    const idx = appState.allMonths.findIndex((m) => {
      if (!m.meta || !m.meta.month) return false;
      const normalizedMetaMonth = m.meta.month
        .toUpperCase()
        .replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (match) => {
          const map = {
            Ą: "A",
            Ć: "C",
            Ę: "E",
            Ł: "L",
            Ń: "N",
            Ó: "O",
            Ś: "S",
            Ź: "Z",
            Ż: "Z",
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
          throw new Error("Zła struktura");
        }
      } else {
        appState.allMonths = DEFAULT_JSON;
      }
    } catch (e) {
      console.warn("Wyrzucono uszkodzony cache.");
      appState.allMonths = DEFAULT_JSON;
      localStorage.removeItem(STORAGE_KEY);
    }
    appState.content = JSON.stringify(appState.allMonths, null, 2);
    appState.activeMonthIdx = findCurrentMonthIndex();
  }

  // ==========================================
  // 2. LOGIKA ZAKŁADEK I EDYTORA
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
  // 3. RENDEROWANIE TABELI
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

    let html = `<div class="month-controls">`;
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

      html += `<tr>
                <td class="sticky-col">${w.id != null ? w.id : wIdx + 1}</td>
                <td class="sticky-col-2 worker-name-cell" data-w="${wIdx}" style="cursor: pointer; padding:0 10px; font-weight:600; font-size:12px; background:var(--card-bg); border-bottom:1px solid var(--border-color); ${rowStyle}" title="Kliknij, aby zobaczyć kalendarz pracownika">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>${w.name || "Brak"}</span>
                    <i class="fas fa-calendar-alt" style="opacity: 0.3;"></i>
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

        html += `<td class="shift-cell" style="${bgStyle}">
                  <input type="text" class="shift-input" data-w="${wIdx}" data-s="${dIdx}" value="${displayCode}">
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
      cell.addEventListener("mouseenter", (e) => {
        e.currentTarget.style.filter = "brightness(1.5)";
      });
      cell.addEventListener("mouseleave", (e) => {
        e.currentTarget.style.filter = "none";
      });
    });

    const monthSelect = document.querySelector(".year-selector");
    if (monthSelect) {
      monthSelect.innerHTML = "";
      appState.allMonths.forEach((monthObj, idx) => {
        const monthName = monthObj.meta.month || `Miesiąc ${idx + 1}`;
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = monthName;
        if (idx === appState.activeMonthIdx) option.selected = true;
        monthSelect.appendChild(option);
      });

      const newSelect = monthSelect.cloneNode(true);
      monthSelect.parentNode.replaceChild(newSelect, monthSelect);
      newSelect.addEventListener("change", (e) => {
        appState.activeMonthIdx = parseInt(e.target.value);
        renderSchedule();
      });
    }

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
          <button id="worker-cal-close" class="shift-modal-close">&times;</button>
        </div>
        <div id="worker-cal-body" class="shift-modal-body" style="flex-direction: column;">
          <!-- Zawartość kalendarza -->
        </div>
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
          <button id="shift-modal-close" class="shift-modal-close">&times;</button>
        </div>
        <div id="shift-modal-body" class="shift-modal-body">
          <!-- Zawartość -->
        </div>
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

  function openShiftListModal() {
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

    if (todayIdx === -1) {
      body.innerHTML = `<div class="shift-modal-empty">Dzisiejszy dzień (${todayStr}) nie znajduje się w grafiku dla ${currentData.meta.month || "wybranego miesiąca"}.</div>`;
      modal.classList.add("active");
      return;
    }

    title.innerHTML = `<i class="fas fa-users"></i> Osoby w pracy: Dziś, ${daysArr[todayIdx]} ${weekdaysArr[todayIdx] || ""}`;

    const dayWorkers = [];
    const nightWorkers = [];
    const currentTheme =
      document.documentElement.getAttribute("theme") || "dark";

    currentData.workers.forEach((w) => {
      const val = getDisplayShiftCode(w.shifts[todayIdx]);

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
  // 4. WYKRESY I WIDŻETY
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
      const cardTitle = mainStatsEl
        .closest(".card")
        ?.querySelector(".card-title");
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
                "#f36c00",
                "#3b82f6",
                "#af5308",
                "#ffc107",
                "#17a2b8",
                "#28a745",
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

      if (wAmt)
        wAmt.innerHTML = `${nightToday} <span class="cents">osób</span>`;
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
  // 5. OBSŁUGA GITHUB I THEME
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

        if (iconDest && typeof AppIcons !== "undefined") {
          iconDest.innerHTML = AppIcons.circleCheck || "";
          setTimeout(() => {
            iconDest.innerHTML = AppIcons.cloudDownload || "";
          }, 2000);
        }

        oxyAlert(
          "Pobrano najnowsze dane z chmury.",
          "success",
          "SYNCHRONIZACJA",
        );
      } catch (e) {
        oxyAlert(
          "Błąd chmury: " + (e && e.message ? e.message : e),
          "error",
          "BŁĄD POBIERANIA",
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

    window.getComputedStyle(document.documentElement).cssText;

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
  // ZARZĄDZANIE UŻYTKOWNIKAMI I LOGOWANIE
  // ==========================================
  function initLoginSystem() {
    const USERS_KEY = "oxy_os_users";

    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(
        USERS_KEY,
        JSON.stringify([{ user: "admin", pass: "admin123" }]),
      );
    }

    const loginOverlay = document.getElementById("login-overlay");
    const dashboardWrapper = document.querySelector(".dashboard-wrapper");
    const btnLogin = document.getElementById("btn-login");
    const userInput = document.getElementById("login-username");
    const passInput = document.getElementById("login-password");
    const errorMsg = document.getElementById("login-error");
    const btnOpenUsers = document.getElementById("btn-users");

    function applyUserPermissions(loggedUser) {
      if (btnOpenUsers) {
        btnOpenUsers.style.display = loggedUser === "admin" ? "flex" : "none";
      }
    }

    const currentUser = sessionStorage.getItem("oxy_os_user");
    if (currentUser) {
      if (loginOverlay) loginOverlay.classList.add("hidden");
      if (dashboardWrapper) dashboardWrapper.classList.remove("locked");
      applyUserPermissions(currentUser);
    } else {
      if (dashboardWrapper) dashboardWrapper.classList.add("locked");
      if (btnOpenUsers) btnOpenUsers.style.display = "none";
    }

    function attemptLogin() {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      const userVal = userInput.value.trim();
      const passVal = passInput.value;

      const validUser = users.find(
        (u) => u.user === userVal && u.pass === passVal,
      );

      if (validUser) {
        sessionStorage.setItem("oxy_os_user", validUser.user);

        loginOverlay.classList.add("hidden");
        dashboardWrapper.classList.remove("locked");
        errorMsg.style.display = "none";

        applyUserPermissions(validUser.user);
        oxyAlert(
          `Witaj, ${validUser.user}! Pomyślnie zalogowano.`,
          "success",
          "AUTORYZACJA",
        );
      } else {
        errorMsg.style.display = "block";
        passInput.value = "";
        passInput.focus();
        oxyAlert(
          "Odmowa dostępu. Nieprawidłowy login lub hasło.",
          "error",
          "AUTORYZACJA",
        );
      }
    }

    if (btnLogin) btnLogin.addEventListener("click", attemptLogin);
    if (passInput)
      passInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") attemptLogin();
      });
    if (userInput)
      userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") passInput.focus();
      });

    // NOWE: Potwierdzenie przy wylogowywaniu
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        oxyConfirm("Czy na pewno chcesz się wylogować z sesji OXY_OS?", () => {
          sessionStorage.removeItem("oxy_os_user");
          window.location.reload();
        });
      });
    }

    const modalUsers = document.getElementById("users-modal-overlay");
    const btnCloseUsers = document.getElementById("users-modal-close");
    const listEl = document.getElementById("users-list");
    const btnAdd = document.getElementById("btn-add-user");

    function renderUsers() {
      if (!listEl) return;
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      listEl.innerHTML = "";
      users.forEach((u, idx) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--card-bg); border: 1px solid var(--border-color);";

        const deleteBtnHtml =
          u.user === "admin"
            ? `<span style="font-size: 10px; color: var(--text-muted);">Główny Admin</span>`
            : `<button class="icon-btn delete-user-btn" data-idx="${idx}" style="width: 30px; height: 30px; border-color: transparent;"><i class="fas fa-trash" style="color: var(--danger-color); pointer-events: none;"></i></button>`;

        row.innerHTML = `
                <span style="font-weight: 600;"><i class="fas fa-user" style="color: var(--text-muted); margin-right: 8px;"></i> ${u.user}</span>
                ${deleteBtnHtml}
            `;
        listEl.appendChild(row);
      });
    }

    // NOWE: Potwierdzenie przy usuwaniu konta
    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".delete-user-btn");
        if (btn) {
          const idx = parseInt(btn.dataset.idx);
          const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

          if (users[idx].user === "admin") {
            oxyAlert(
              "Konta 'admin' nie można usunąć.",
              "error",
              "ODMOWA DOSTĘPU",
            );
            return;
          }

          oxyConfirm(
            `Czy na pewno chcesz bezpowrotnie usunąć konto użytkownika "${users[idx].user}"?`,
            () => {
              users.splice(idx, 1);
              localStorage.setItem(USERS_KEY, JSON.stringify(users));
              renderUsers();
              oxyAlert(
                "Konto użytkownika zostało pomyślnie usunięte.",
                "info",
                "USUNIĘTO",
              );
            },
          );
        }
      });
    }

    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        const uInp = document.getElementById("new-username");
        const pInp = document.getElementById("new-password");
        const uVal = uInp.value.trim();
        const pVal = pInp.value.trim();

        if (!uVal || !pVal) {
          oxyAlert(
            "Wprowadź prawidłową nazwę użytkownika oraz hasło.",
            "warning",
            "BRAK DANYCH",
          );
          return;
        }

        const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
        if (users.find((u) => u.user.toLowerCase() === uVal.toLowerCase())) {
          oxyAlert(
            "Użytkownik o takiej nazwie już istnieje w bazie danych.",
            "error",
            "DUPLIKAT",
          );
          return;
        }

        users.push({ user: uVal, pass: pVal });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        uInp.value = "";
        pInp.value = "";
        renderUsers();
        oxyAlert(
          `Konto dla "${uVal}" zostało utworzone.`,
          "success",
          "NOWY UŻYTKOWNIK",
        );
      });
    }

    if (btnOpenUsers) {
      btnOpenUsers.addEventListener("click", () => {
        if (sessionStorage.getItem("oxy_os_user") !== "admin") return;
        renderUsers();
        modalUsers.classList.add("active");
      });
    }

    if (btnCloseUsers)
      btnCloseUsers.addEventListener("click", () =>
        modalUsers.classList.remove("active"),
      );
    if (modalUsers)
      modalUsers.addEventListener("click", (e) => {
        if (e.target === modalUsers) modalUsers.classList.remove("active");
      });
  }

  // ==========================================
  // INICJALIZACJA STARTOWA
  // ==========================================
  function bootApplication() {
    initLoginSystem();

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
      injectIcon("icon-file-download-dest", AppIcons.filedownload); // <-- DODANE
    }

    createShiftListModal();
    createWorkerCalendarModal();
    loadData();
    initTabsAndEditor();
    initCharts();
    startClock();
    renderSchedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApplication);
  } else {
    bootApplication();
  }
})();



// Wklej wewnątrz IIFE (przed zamykającym "})();" w index.js):

// Wklej wewnątrz IIFE (przed zamykającym "})();" w index.js):

// ==========================================
// 6. PWA SERVICE WORKER, OFFLINE & INSTALL
// ==========================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker zarejestrowany. Zakres:", reg.scope);
      })
      .catch((err) => {
        console.error("[PWA] Błąd rejestracji Service Workera:", err);
      });
  });
}

// Detekcja i alerty online / offline
window.addEventListener("online", () => {
  oxyAlert("Przywrócono połączenie sieciowe.", "info", "TRYB ONLINE");
});

window.addEventListener("offline", () => {
  oxyAlert("Praca w trybie lokalnym. Zmiany są zapisywane w pamięci urządzenia.", "warning", "TRYB OFFLINE");
});

// Obsługa promptu instalacji PWA
let deferredPrompt = null;
const pwaInstallBtn = document.getElementById("btn-pwa-install");

// Ukryj domyślnie przycisk do momentu gotowości przeglądarki
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
  oxyAlert("Aplikacja OXY_OS została pomyślnie zainstalowana.", "success", "GOTOWE");
  if (pwaInstallBtn) pwaInstallBtn.style.display = "none";
});