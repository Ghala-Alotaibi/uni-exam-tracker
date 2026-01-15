const EXAMS_KEY = "uni_exams_v1";
const THEME_KEY = "uni_theme_v1";

function loadExams() {
  try { return JSON.parse(localStorage.getItem(EXAMS_KEY)) || []; }
  catch { return []; }
}
function saveExams(exams) {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function pad2(n){ return String(n).padStart(2,"0"); }

function formatDayAndDate(dt) {
  const d = new Date(dt);
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return `${days[d.getDay()]} • ${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} • ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function diffToParts(ms) {
  const total = Math.max(0, ms);
  const sec = Math.floor(total / 1000);
  const s = sec % 60;
  const min = Math.floor(sec / 60);
  const m = min % 60;
  const hr = Math.floor(min / 60);
  const h = hr % 24;
  const d = Math.floor(hr / 24);
  return { d, h, m, s };
}

function countdownText(targetISO) {
  const now = Date.now();
  const target = new Date(targetISO).getTime();
  const ms = target - now;

  if (isNaN(target)) return "Invalid date/time";
  if (ms <= 0) return "✅ Started / Passed";

  const { d, h, m, s } = diffToParts(ms);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function urgencyClass(targetISO) {
  const ms = new Date(targetISO).getTime() - Date.now();
  if (ms <= 0) return "";
  const hours = ms / (1000 * 60 * 60);
  if (hours <= 2) return "dangerSoon";
  if (hours <= 24) return "warn";
  return "";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// DOM
const form = document.getElementById("examForm");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const filterTypeEl = document.getElementById("filterType");
const searchEl = document.getElementById("search");
const clearAllBtn = document.getElementById("clearAllBtn");
const themeBtn = document.getElementById("themeBtn");

// Inputs
const courseEl = document.getElementById("course");
const typeEl = document.getElementById("type");
const datetimeEl = document.getElementById("datetime");
const seatEl = document.getElementById("seat");
const buildingEl = document.getElementById("building");
const roomEl = document.getElementById("room");
const notesEl = document.getElementById("notes");

// Theme
function applyTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  document.body.classList.toggle("light", saved === "light");
  themeBtn.textContent = saved === "light" ? "☀️ Light" : "🌙 Dark";
}
applyTheme();

themeBtn.addEventListener("click", () => {
  const isLight = document.body.classList.contains("light");
  localStorage.setItem(THEME_KEY, isLight ? "dark" : "light");
  applyTheme();
});

function getFilteredSortedExams() {
  const typeFilter = filterTypeEl.value;
  const q = (searchEl.value || "").trim().toLowerCase();

  let exams = loadExams();
  exams.sort((a,b) => new Date(a.datetime) - new Date(b.datetime));

  if (typeFilter !== "all") exams = exams.filter(e => e.type === typeFilter);
  if (q) exams = exams.filter(e =>
    (e.course||"").toLowerCase().includes(q) ||
    (e.notes||"").toLowerCase().includes(q)
  );
  return exams;
}

function render() {
  const exams = getFilteredSortedExams();
  listEl.innerHTML = "";
  emptyEl.style.display = exams.length ? "none" : "block";

  for (const e of exams) {
    const wrap = document.createElement("div");
    wrap.className = `item ${urgencyClass(e.datetime)}`;

    wrap.innerHTML = `
      <div class="itemTop">
        <div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <strong style="font-size:16px;">${escapeHtml(e.course)}</strong>
            <span class="badge">${escapeHtml(e.type)}</span>
          </div>

          <div class="meta">
            <span>📅 ${formatDayAndDate(e.datetime)}</span>
            ${e.seat ? `<span>💺 Seat: ${escapeHtml(e.seat)}</span>` : ""}
            ${(e.building || e.room) ? `<span>🏫 ${escapeHtml([e.building,e.room].filter(Boolean).join(" • "))}</span>` : ""}
          </div>

          ${e.notes ? `<div class="meta">📝 ${escapeHtml(e.notes)}</div>` : ""}

          <div class="countdown" data-id="${e.id}">⏳ ${countdownText(e.datetime)}</div>
        </div>

        <div class="itemBtns">
          <button class="small" data-action="edit" data-id="${e.id}">Edit</button>
          <button class="small" data-action="del" data-id="${e.id}">Delete</button>
        </div>
      </div>
    `;

    listEl.appendChild(wrap);
  }
}

// Live countdown refresh
setInterval(() => {
  const exams = loadExams();
  const map = new Map(exams.map(e => [e.id, e]));
  document.querySelectorAll(".countdown[data-id]").forEach(el => {
    const e = map.get(el.getAttribute("data-id"));
    if (e) el.textContent = `⏳ ${countdownText(e.datetime)}`;
  });
}, 1000);

form.addEventListener("submit", (ev) => {
  ev.preventDefault();

  const exam = {
    id: uid(),
    course: courseEl.value.trim(),
    type: typeEl.value,
    datetime: datetimeEl.value,
    seat: seatEl.value.trim(),
    building: buildingEl.value.trim(),
    room: roomEl.value.trim(),
    notes: notesEl.value.trim(),
    createdAt: new Date().toISOString()
  };

  if (!exam.course || !exam.datetime) return;

  const exams = loadExams();
  exams.push(exam);
  saveExams(exams);
  form.reset();
  render();
});

listEl.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");

  const exams = loadExams();
  const idx = exams.findIndex(e => e.id === id);
  if (idx === -1) return;

  if (action === "del") {
    exams.splice(idx, 1);
    saveExams(exams);
    render();
    return;
  }

  if (action === "edit") {
    const e = exams[idx];

    courseEl.value = e.course || "";
    typeEl.value = e.type || "Final";
    datetimeEl.value = e.datetime || "";
    seatEl.value = e.seat || "";
    buildingEl.value = e.building || "";
    roomEl.value = e.room || "";
    notesEl.value = e.notes || "";

    exams.splice(idx, 1);
    saveExams(exams);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

filterTypeEl.addEventListener("change", render);
searchEl.addEventListener("input", render);

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Delete all saved exams on this device?")) return;
  localStorage.removeItem(EXAMS_KEY);
  render();
});

render();