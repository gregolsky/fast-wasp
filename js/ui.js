import {
  PROGRAMS, startFast, stopFast, getActiveFastState,
  remaining, formatHMS, elapsed,
  logMeal, getOmadState, getFastHistory, getOmadHistory
} from './fasting.js';
import {
  addWeightEntry, deleteWeightEntry, updateWeightEntry,
  getWeightDisplay, get3MonthStats, getChartData, unitLabel
} from './weight.js';
import { renderWeightChart, updateChartData, destroyChart } from './chart.js';
import { getSettings, saveSettings } from './storage.js';
import {
  logCraving, getCravingStats, getStreak, getLast30Days, deleteLastCraving, getCravings
} from './cravings.js';

// ─────────────────────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────────────────────
let _tickId = null;
let _currentView = null;

function settings() { return getSettings(); }
function unit() { return settings().unit; }

// ─────────────────────────────────────────────────────────────
// View: Fast
// ─────────────────────────────────────────────────────────────
let _selectedProgram = PROGRAMS.find(p => p.id === '16:8');
let _customHours = 16;

export function renderFast(container) {
  _currentView = 'fast';
  clearTick();

  const active = getActiveFastState();
  const omad   = getOmadState();

  if (active && !active.programId?.startsWith('omad')) {
    renderActiveTimer(container, active);
  } else if (omad || _selectedProgram?.omad) {
    renderOmadView(container, omad);
  } else {
    renderProgramSelector(container);
  }
}

// ── Greeting ──────────────────────────────────────────────────
function renderGreeting() {
  const name = getSettings().name?.trim();
  if (!name) return '';
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return `<p style="font-size:1rem;font-weight:600;color:var(--text);margin-bottom:12px">${tod}, ${name} 👋</p>`;
}

// ── Hero banner (first visit) ─────────────────────────────────
function renderHero() {
  const hist = getFastHistory();
  const omad = getOmadHistory();
  if (hist.length || omad.length) return ''; // returning user — skip hero
  return `
    <div class="hero-card">
      <div class="hero-header">
        <img src="./icons/icon.svg" width="52" height="52" alt="Fast Wasp icon" class="hero-icon" />
        <div>
          <div class="hero-title">FAST WASP</div>
          <div class="hero-sub">Fasting tracker. With a sting.</div>
        </div>
      </div>
      <ul class="hero-features">
        <li><span class="feat-icon">⏱</span><span><strong>Fast Tracking</strong> — live countdown, overtime &amp; history</span></li>
        <li><span class="feat-icon">⚖</span><span><strong>Weight Tracking</strong> — log, chart &amp; 3-month trends</span></li>
        <li><span class="feat-icon">🍬</span><span><strong>Sweets Panic Button</strong> — resist cravings, track the streak</span></li>
        <li><span class="feat-icon">🚫</span><span><strong>Zero ads</strong> — ever</span></li>
        <li><span class="feat-icon">🔒</span><span><strong>Your data is yours only</strong> — stored locally, never sent anywhere</span></li>
      </ul>
      <p class="hero-cta">Choose a program below and tap <strong>Start</strong> to begin.</p>
    </div>
  `;
}

// ── Program selector ──────────────────────────────────────────
function renderProgramSelector(container) {
  const prog = _selectedProgram;
  const isCustom = prog?.custom;
  const isOmad   = prog?.omad;
  const hoursToStart = isCustom ? _customHours : prog?.hours;

  container.innerHTML = `
    ${renderGreeting()}
    ${renderHero()}
    <div class="card">
      <div class="card-title">Choose Program</div>
      <div class="program-grid" id="program-grid">
        ${PROGRAMS.map(p => `
          <button class="program-btn${p.id === prog?.id ? ' selected' : ''}" data-id="${p.id}">
            ${p.label}
            ${p.sub ? `<small>${p.sub}</small>` : ''}
          </button>
        `).join('')}
      </div>

      ${isCustom ? `
        <div class="custom-input-wrap">
          <span class="text-muted" style="font-size:.8rem">Hours:</span>
          <input type="range" id="custom-range" min="1" max="48" step="0.5" value="${_customHours}" />
          <span class="custom-val" id="custom-val">${_customHours}h</span>
        </div>
      ` : ''}

      ${!isOmad ? `
        <button class="btn btn-primary" id="start-btn">
          Start ${hoursToStart}h Fast
        </button>
      ` : `
        <button class="btn btn-primary" id="start-omad-btn">
          I Ate My Meal
        </button>
        <p style="text-align:center;font-size:.78rem;color:var(--muted);margin-top:8px">
          Tap after each meal — tracks time since last meal
        </p>
      `}
    </div>

    ${renderHistoryCard()}
  `;

  // Program grid clicks
  container.querySelector('#program-grid').addEventListener('click', e => {
    const btn = e.target.closest('.program-btn');
    if (!btn) return;
    _selectedProgram = PROGRAMS.find(p => p.id === btn.dataset.id);
    renderFast(container);
  });

  // Custom range
  if (isCustom) {
    const range = container.querySelector('#custom-range');
    const val   = container.querySelector('#custom-val');
    range.addEventListener('input', () => {
      _customHours = parseFloat(range.value);
      val.textContent = `${_customHours}h`;
      container.querySelector('#start-btn').textContent = `Start ${_customHours}h Fast`;
    });
  }

  // Start buttons
  container.querySelector('#start-btn')?.addEventListener('click', () => {
    const hrs = isCustom ? _customHours : prog.hours;
    startFast(prog.id, hrs);
    renderFast(container);
  });

  container.querySelector('#start-omad-btn')?.addEventListener('click', () => {
    logMeal(23);
    renderFast(container);
  });
}

// ── Active countdown timer ────────────────────────────────────
function renderActiveTimer(container, active) {
  const targetHours = active.targetHours;
  const prog = PROGRAMS.find(p => p.id === active.programId) || { label: `${targetHours}h Fast` };

  container.innerHTML = `
    <div class="card">
      <div class="timer-ring-wrap">
        <div class="timer-ring" id="timer-ring">
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle class="ring-bg"   cx="110" cy="110" r="100"/>
            <circle class="ring-prog" id="ring-prog" cx="110" cy="110" r="100"
              stroke-dasharray="628.3" stroke-dashoffset="0"/>
          </svg>
          <div class="timer-center">
            <span class="timer-label" id="timer-label">remaining</span>
            <span class="timer-digits" id="timer-digits">00:00:00</span>
          </div>
        </div>
        <div class="timer-program">${prog.label} · ${targetHours}h target</div>
        <div id="overtime-badge-wrap"></div>
      </div>
      <button class="btn btn-danger mt-12" id="stop-btn">Stop Fast</button>
    </div>
    ${renderHistoryCard()}
  `;

  container.querySelector('#stop-btn').addEventListener('click', () => {
    stopFast();
    renderFast(container);
  });

  startTick(() => tickTimer(active, container));
}

const CIRCUMFERENCE = 2 * Math.PI * 100; // 628.3

function tickTimer(active, container) {
  const rem = remaining(active.startedAt, active.targetHours);
  const isOvertime = rem <= 0;
  const digits = container.querySelector('#timer-digits');
  const label  = container.querySelector('#timer-label');
  const ring   = container.querySelector('#ring-prog');
  const badge  = container.querySelector('#overtime-badge-wrap');
  if (!digits) return;

  digits.textContent = formatHMS(Math.abs(rem));
  digits.className = `timer-digits${isOvertime ? ' overtime' : ''}`;
  label.textContent = isOvertime ? 'overtime' : 'remaining';
  ring.className = `ring-prog${isOvertime ? ' overtime' : ''}`;

  if (!isOvertime) {
    const pct = 1 - Math.max(0, rem) / (active.targetHours * 3600);
    ring.setAttribute('stroke-dashoffset', CIRCUMFERENCE * (1 - pct));
    badge.innerHTML = '';
  } else {
    ring.setAttribute('stroke-dashoffset', 0);
    const ot = formatHMS(Math.abs(rem));
    badge.innerHTML = `<span class="overtime-badge">+${ot} overtime</span>`;
  }
}

// ── OMAD view ─────────────────────────────────────────────────
function renderOmadView(container, omad) {
  const targetHours = omad?.targetHours || 23;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">OMAD — One Meal a Day</div>
      ${omad ? `
        <p style="text-align:center;font-size:.8rem;color:var(--muted)">Time since last meal</p>
        <div class="omad-since" id="omad-since">00:00:00</div>
        <div class="omad-target-bar-wrap">
          <div class="omad-bar-bg"><div class="omad-bar-fill" id="omad-bar" style="width:0%"></div></div>
          <div class="omad-bar-label"><span>0h</span><span id="omad-target-lbl">${targetHours}h target</span></div>
        </div>
        <div id="omad-reached-msg"></div>
      ` : `
        <p style="text-align:center;color:var(--muted);padding:20px 0">No meal logged yet.</p>
      `}
      <button class="btn btn-primary mt-12" id="log-meal-btn">I Ate My Meal</button>
      <button class="btn btn-ghost btn-sm mt-8" id="omad-back-btn" style="width:100%;margin-top:8px">
        ← Switch Program
      </button>
    </div>
    ${renderOmadHistoryCard()}
  `;

  container.querySelector('#log-meal-btn').addEventListener('click', () => {
    logMeal(targetHours);
    renderFast(container);
  });
  container.querySelector('#omad-back-btn').addEventListener('click', () => {
    _selectedProgram = PROGRAMS.find(p => p.id === '16:8');
    renderProgramSelector(container);
  });

  if (omad) startTick(() => tickOmad(omad, container));
}

function tickOmad(omad, container) {
  const el = container.querySelector('#omad-since');
  const bar = container.querySelector('#omad-bar');
  const msg = container.querySelector('#omad-reached-msg');
  if (!el) return;

  const sec = elapsed(omad.lastMealAt);
  el.textContent = formatHMS(sec);
  const pct = Math.min(100, (sec / (omad.targetHours * 3600)) * 100);
  bar.style.width = pct + '%';
  const reached = sec >= omad.targetHours * 3600;
  bar.className = `omad-bar-fill${reached ? ' reached' : ''}`;
  msg.innerHTML = reached
    ? `<p style="text-align:center;font-size:.8rem;color:var(--success);margin-top:8px">✓ Target reached!</p>`
    : '';
}

// ── History cards ─────────────────────────────────────────────
function renderHistoryCard() {
  const hist = getFastHistory().slice(0, 8);
  if (!hist.length) return '';
  const rows = hist.map(h => {
    const date = new Date(h.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const dur  = formatHMS(h.actualHours * 3600);
    const ot   = h.overtimeHours > 0 ? `<span class="hist-ot">+${formatHMS(h.overtimeHours*3600)} OT</span>` : '';
    return `<li class="history-item">
      <span class="hist-date">${date}</span>
      <span>${h.programId?.toUpperCase() ?? '?'}</span>
      <span class="hist-dur">${dur} ${ot}</span>
    </li>`;
  }).join('');
  return `<div class="card"><div class="card-title">Recent Fasts</div>
    <ul class="history-list">${rows}</ul></div>`;
}

function renderOmadHistoryCard() {
  const hist = getOmadHistory().slice(0, 8);
  if (!hist.length) return '';
  const rows = hist.map((h, i, arr) => {
    const date = new Date(h.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    let gap = '';
    if (i < arr.length - 1) {
      const secGap = (new Date(h.at) - new Date(arr[i + 1].at)) / 1000;
      gap = `<span class="hist-ot">${formatHMS(secGap)} since prev</span>`;
    }
    return `<li class="history-item"><span class="hist-date">${date}</span>${gap}</li>`;
  }).join('');
  return `<div class="card"><div class="card-title">Meal Log</div>
    <ul class="history-list">${rows}</ul></div>`;
}

// ─────────────────────────────────────────────────────────────
// View: Weight
// ─────────────────────────────────────────────────────────────
let _weightRange = 90;
let _editingId = null;

export function renderWeight(container) {
  _currentView = 'weight';
  clearTick();
  destroyChart();

  const u = unit();
  const uLabel = unitLabel(u);
  const entries = getWeightDisplay(u).slice().reverse(); // newest first for list

  const today = new Date().toISOString().slice(0, 10);

  const editEntry = _editingId ? entries.find(e => e.id === _editingId) : null;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">${editEntry ? 'Edit Entry' : 'Log Weight'}</div>
      <div class="form-row">
        <div class="form-group">
          <label for="w-date">Date</label>
          <input type="date" id="w-date" value="${editEntry ? editEntry.at : today}" max="${today}" />
        </div>
        <div class="form-group">
          <label for="w-val">Weight (${uLabel})</label>
          <input type="number" id="w-val" step="0.1" min="1" max="500"
            placeholder="e.g. ${u === 'kg' ? '75.0' : '165.0'}"
            value="${editEntry ? editEntry.display : ''}" />
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" id="save-weight-btn">${editEntry ? 'Update' : 'Save'}</button>
        ${editEntry ? `<button class="btn btn-ghost" id="cancel-edit-btn" style="flex:0 0 auto">Cancel</button>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Chart</div>
      <div class="range-tabs">
        ${[30, 90, 180, Infinity].map(r => {
          const lbl = r === Infinity ? 'All' : r === 30 ? '1M' : r === 90 ? '3M' : '6M';
          return `<button class="range-tab${r === _weightRange ? ' active' : ''}" data-range="${r}">${lbl}</button>`;
        }).join('')}
      </div>
      <div class="chart-wrap"><canvas id="weight-chart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">Entries</div>
      ${entries.length === 0
        ? '<p class="empty-msg">No weight entries yet.</p>'
        : `<ul class="entry-list">${entries.map((e, i, arr) => {
            const prev = arr[i + 1];
            let delta = '';
            if (prev) {
              const d = e.display - prev.display;
              const sign = d >= 0 ? '+' : '';
              delta = `<span class="entry-delta ${d > 0 ? 'delta-up' : 'delta-down'}">${sign}${d.toFixed(1)}</span>`;
            }
            return `<li class="entry-item">
              <span class="entry-date">${new Date(e.at + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span class="entry-val">${e.display} ${uLabel}${delta}</span>
              <span class="entry-actions">
                <button class="btn btn-ghost btn-sm" data-edit="${e.id}">Edit</button>
                <button class="btn btn-ghost btn-sm text-danger" data-del="${e.id}">Del</button>
              </span>
            </li>`;
          }).join('')}</ul>`
      }
    </div>
  `;

  // Save/update
  container.querySelector('#save-weight-btn').addEventListener('click', () => {
    const date = container.querySelector('#w-date').value;
    const val  = container.querySelector('#w-val').value;
    if (!date || !val) return;
    if (_editingId) {
      updateWeightEntry(_editingId, date, val, u);
      _editingId = null;
    } else {
      addWeightEntry(date, val, u);
    }
    renderWeight(container);
  });

  container.querySelector('#cancel-edit-btn')?.addEventListener('click', () => {
    _editingId = null;
    renderWeight(container);
  });

  // Entry actions (edit/delete)
  container.querySelector('.entry-list')?.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-del]');
    if (editBtn) { _editingId = editBtn.dataset.edit; renderWeight(container); }
    if (delBtn)  { deleteWeightEntry(delBtn.dataset.del); renderWeight(container); }
  });

  // Range tabs
  container.querySelectorAll('.range-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _weightRange = btn.dataset.range === 'Infinity' ? Infinity : parseInt(btn.dataset.range);
      btn.parentElement.querySelectorAll('.range-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const data = getChartData(u, _weightRange);
      updateChartData(data, uLabel);
    });
  });

  // Chart
  const canvas = container.querySelector('#weight-chart');
  if (canvas && entries.length > 0) {
    const data = getChartData(u, _weightRange);
    // Chart.js loaded async; wait briefly then render
    const tryRender = () => {
      if (window.Chart) {
        renderWeightChart(canvas, data, uLabel);
      } else {
        setTimeout(tryRender, 100);
      }
    };
    tryRender();
  }
}

// ─────────────────────────────────────────────────────────────
// View: Stats
// ─────────────────────────────────────────────────────────────
export function renderStats(container) {
  _currentView = 'stats';
  clearTick();

  const u = unit();
  const uLabel = unitLabel(u);
  const stats = get3MonthStats(u);
  const hist  = getFastHistory();

  // Fasting stats
  let fastStats = { total: 0, avgHours: 0, longestHours: 0, overtimeTotal: 0 };
  if (hist.length) {
    const totalActual = hist.reduce((s, h) => s + h.actualHours, 0);
    const totalOT     = hist.reduce((s, h) => s + h.overtimeHours, 0);
    fastStats = {
      total: hist.length,
      avgHours: +(totalActual / hist.length).toFixed(1),
      longestHours: +Math.max(...hist.map(h => h.actualHours)).toFixed(1),
      overtimeTotal: +totalOT.toFixed(1),
    };
  }

  const dirIcon = stats?.trend === 'down' ? '▼' : stats?.trend === 'up' ? '▲' : '→';
  const dirClass = stats?.trend ?? 'neutral';

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Weight — Last 3 Months</div>
      ${!stats
        ? '<p class="empty-msg">Log at least 2 weight entries to see stats.</p>'
        : `
          <div class="stat-grid">
            <div class="stat-box">
              <span class="stat-label">Change</span>
              <span class="stat-val ${dirClass}">${dirIcon} ${stats.delta > 0 ? '+' : ''}${stats.delta} ${uLabel}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">% Change</span>
              <span class="stat-val ${dirClass}">${stats.pct > 0 ? '+' : ''}${stats.pct}%</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Min</span>
              <span class="stat-val">${stats.min} ${uLabel}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Max</span>
              <span class="stat-val">${stats.max} ${uLabel}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Average</span>
              <span class="stat-val">${stats.avg.toFixed(1)} ${uLabel}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Entries</span>
              <span class="stat-val">${stats.entries}</span>
            </div>
          </div>
          <p style="font-size:.75rem;color:var(--muted);margin-top:12px">
            ${stats.from} → ${stats.to} ${uLabel} over period
          </p>
        `}
    </div>

    <div class="card">
      <div class="card-title">Fasting — All Time</div>
      ${!fastStats.total
        ? '<p class="empty-msg">No completed fasts yet.</p>'
        : `
          <div class="stat-grid">
            <div class="stat-box">
              <span class="stat-label">Total Fasts</span>
              <span class="stat-val">${fastStats.total}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Avg Duration</span>
              <span class="stat-val">${fastStats.avgHours}h</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Longest</span>
              <span class="stat-val">${fastStats.longestHours}h</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Total Overtime</span>
              <span class="stat-val text-warning">${fastStats.overtimeTotal}h</span>
            </div>
          </div>
        `}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// View: Settings
// ─────────────────────────────────────────────────────────────
export function renderSettings(container) {
  _currentView = 'settings';
  clearTick();

  const s = getSettings();

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Profile</div>
      <div class="settings-row">
        <label for="s-name">Your first name</label>
        <input id="s-name" type="text" maxlength="32" placeholder="e.g. Alex"
          value="${s.name ?? ''}"
          style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);
                 color:var(--text);padding:8px 12px;font-size:.9rem;width:140px;text-align:right" />
      </div>
    </div>

    <div class="card">
      <div class="card-title">Preferences</div>
      <div class="settings-row">
        <label>Weight Unit</label>
        <div class="pill-toggle">
          <button class="pill-btn${s.unit === 'kg' ? ' active' : ''}" data-unit="kg">kg</button>
          <button class="pill-btn${s.unit === 'lb' ? ' active' : ''}" data-unit="lb">lb</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">About</div>
      <p style="font-size:.85rem;color:var(--muted);line-height:1.6">
        Fast Wasp — a local-first intermittent fasting tracker.<br>
        All data is stored in your browser's localStorage.<br>
        No account required. Works offline.
      </p>
      <div style="margin-top:12px;font-size:.75rem;color:var(--muted)">v1.0.0</div>
    </div>
  `;

  // Save name on blur / enter
  const nameInput = container.querySelector('#s-name');
  const saveName = () => saveSettings({ ...getSettings(), name: nameInput.value.trim() });
  nameInput.addEventListener('blur', saveName);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { saveName(); nameInput.blur(); } });

  container.querySelectorAll('[data-unit]').forEach(btn => {
    btn.addEventListener('click', () => {
      saveSettings({ ...getSettings(), unit: btn.dataset.unit });
      renderSettings(container);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// View: Cravings (Sweets Panic Button)
// ─────────────────────────────────────────────────────────────
export function renderCravings(container) {
  _currentView = 'cravings';
  clearTick();

  const stats  = getCravingStats();
  const streak = getStreak();
  const days   = getLast30Days();
  const recent = getCravings().slice(0, 5);

  const maxDay = Math.max(1, ...days.map(d => d.count));

  container.innerHTML = `
    <div class="card panic-card">
      <p class="panic-eyebrow">Craving something sweet?</p>
      <button class="panic-btn" id="panic-btn" aria-label="Log craving resistance">
        <span class="panic-icon">🍬</span>
        <span class="panic-label">I RESISTED!</span>
      </button>
      <p class="panic-sub">Tap instead of reaching for snacks</p>
      <div id="panic-feedback" class="panic-feedback" aria-live="polite"></div>
    </div>

    <div class="card">
      <div class="card-title">Resistance Stats</div>
      <div class="stat-grid">
        <div class="stat-box">
          <span class="stat-label">Today</span>
          <span class="stat-val">${stats.daily}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">This Week</span>
          <span class="stat-val">${stats.weekly}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">This Month</span>
          <span class="stat-val">${stats.monthly}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">All Time</span>
          <span class="stat-val">${stats.total}</span>
        </div>
      </div>
      ${streak > 0 ? `
        <div class="streak-banner">
          🔥 ${streak}-day resistance streak
        </div>` : ''}
    </div>

    <div class="card">
      <div class="card-title">Last 30 Days</div>
      <div class="craving-calendar">
        ${days.map(d => {
          const intensity = d.count === 0 ? 0 : Math.ceil((d.count / maxDay) * 4);
          const label = new Date(d.key + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return `<div class="cal-dot cal-dot-${intensity}" title="${label}: ${d.count} resistance${d.count !== 1 ? 's' : ''}"></div>`;
        }).join('')}
      </div>
      <div class="cal-legend">
        <span style="color:var(--muted);font-size:.7rem">Less</span>
        ${[0,1,2,3,4].map(i => `<div class="cal-dot cal-dot-${i}" style="pointer-events:none"></div>`).join('')}
        <span style="color:var(--muted);font-size:.7rem">More</span>
      </div>
    </div>

    ${recent.length ? `
    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        Recent
        <button class="btn btn-ghost btn-sm" id="undo-btn">Undo last</button>
      </div>
      <ul class="history-list">
        ${recent.map(c => {
          const dt = new Date(c.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          return `<li class="history-item"><span class="hist-date">${dt}</span><span>💪 Resisted</span></li>`;
        }).join('')}
      </ul>
    </div>` : ''}
  `;

  // Panic button
  container.querySelector('#panic-btn').addEventListener('click', () => {
    logCraving();
    // Feedback animation
    const fb = container.querySelector('#panic-feedback');
    const msgs = ['💪 Strong!', '🎉 You did it!', '✨ Keep going!', '🏆 Willpower!', '⚡ Unstoppable!'];
    fb.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    fb.classList.add('show');
    // Bump today counter immediately
    const todayStat = container.querySelector('.stat-box .stat-val');
    if (todayStat) todayStat.textContent = String(parseInt(todayStat.textContent || '0') + 1);
    setTimeout(() => { fb.classList.remove('show'); renderCravings(container); }, 1200);
  });

  // Undo
  container.querySelector('#undo-btn')?.addEventListener('click', () => {
    deleteLastCraving();
    renderCravings(container);
  });
}

// ─────────────────────────────────────────────────────────────
// Tick helpers
// ─────────────────────────────────────────────────────────────
function startTick(fn) {
  clearTick();
  fn();
  _tickId = setInterval(fn, 1000);
}

function clearTick() {
  if (_tickId) { clearInterval(_tickId); _tickId = null; }
}

// Re-sync timer when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _tickId) {
    // Already ticking — the next interval will fire shortly
  }
});

export { clearTick };
