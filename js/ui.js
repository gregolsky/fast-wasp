import {
  PROGRAMS, getProgramById,
  startFast, stopFast, stopConsumption,
  getActiveFastState, getActiveConsumption,
  remaining, formatHMS, elapsed,
  logMeal, getOmadState, getFastHistory, getOmadHistory,
} from './fasting.js';
import {
  addWeightEntry, deleteWeightEntry, updateWeightEntry,
  getWeightDisplay, get3MonthStats, getChartData, unitLabel,
} from './weight.js';
import { renderWeightChart, updateChartData, destroyChart } from './chart.js';
import { getSettings, saveSettings } from './storage.js';
import {
  logCraving, getCravingStats, getStreak, getLast30Days, deleteLastCraving, getCravings,
} from './cravings.js';
import {
  canNotify, notifyOnce, clearNotifyKey, requestPermission,
  notificationsSupported, notificationPermission,
} from './notify.js';

// ─────────────────────────────────────────────────────────────
// Tick — setInterval every 500 ms, try-catch so errors never
// kill the loop, wall-clock derived so reload stays accurate.
// ─────────────────────────────────────────────────────────────
let _tickId = null;

function startTick(fn) {
  stopTick();
  const safe = () => { try { fn(); } catch (e) { console.error('tick', e); } };
  safe();                              // immediate first paint
  _tickId = setInterval(safe, 500);   // 500ms → never miss a second
}

function stopTick() {
  if (_tickId != null) { clearInterval(_tickId); _tickId = null; }
}

export function clearTick() { stopTick(); }

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function s()     { return getSettings(); }
function unit()  { return s().unit; }
const CIRCUM = 2 * Math.PI * 100; // 628.3

// ─────────────────────────────────────────────────────────────
// View: Fast  (router)
// ─────────────────────────────────────────────────────────────
export function renderFast(container) {
  clearTick();
  const settings = s();

  // No name yet → onboarding
  if (!settings.name?.trim()) {
    renderOnboarding(container);
    return;
  }

  const activeFast = getActiveFastState();
  const activeEat  = getActiveConsumption();
  const progId     = settings.selectedProgramId;
  const prog       = progId ? getProgramById(progId) : null;

  if (activeFast) {
    if (activeFast.programId === 'omad') {
      renderOmadView(container, getOmadState());
    } else {
      renderFastTimer(container, activeFast, prog);
    }
  } else if (activeEat) {
    renderEatTimer(container, activeEat, prog);
  } else if (prog) {
    renderReadyState(container, prog, settings);
  } else {
    renderProgramSelector(container, settings);
  }
}

// ─────────────────────────────────────────────────────────────
// Onboarding (no name set)
// ─────────────────────────────────────────────────────────────
function renderOnboarding(container) {
  container.innerHTML = `
    <div class="onboard-hero">
      <img src="./favicon.png" class="onboard-logo" alt="Fast Wasp" />
      <h2 class="onboard-title">FAST WASP</h2>
      <p class="onboard-tagline">Intermittent fasting tracker. With a sting.</p>
    </div>

    <ul class="feature-list">
      <li><span class="feat-ic">⏱</span><div><strong>Fast Tracking</strong><span>Live countdown, overtime &amp; history</span></div></li>
      <li><span class="feat-ic">🍽</span><div><strong>Eating Window</strong><span>Tracks your consumption window too</span></div></li>
      <li><span class="feat-ic">⚖</span><div><strong>Weight Tracking</strong><span>Log, chart &amp; 3-month trends</span></div></li>
      <li><span class="feat-ic">🍬</span><div><strong>Sweets Panic Button</strong><span>Resist cravings &amp; track your streak</span></div></li>
      <li><span class="feat-ic">🚫</span><div><strong>Zero ads, ever</strong><span>No tracking, no account needed</span></div></li>
      <li><span class="feat-ic">🔒</span><div><strong>Your data is yours only</strong><span>Stored locally, never sent anywhere</span></div></li>
    </ul>

    <div class="onboard-form card">
      <label class="onboard-label" for="onboard-name">What's your first name?</label>
      <input id="onboard-name" type="text" class="onboard-input" maxlength="32"
        placeholder="e.g. Alex" autocomplete="given-name" autofocus />
      <button class="btn btn-primary mt-12" id="onboard-start">Let's Start ›</button>
    </div>
  `;

  const input = container.querySelector('#onboard-name');
  const go = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    saveSettings({ ...s(), name });
    renderFast(container);
  };
  container.querySelector('#onboard-start').addEventListener('click', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  input.focus();
}

// ─────────────────────────────────────────────────────────────
// Program selector (first time, or "Change Program")
// ─────────────────────────────────────────────────────────────
function renderProgramSelector(container, settings) {
  const savedId    = settings.selectedProgramId;
  const savedHours = settings.customHours ?? 16;
  const selProg    = getProgramById(savedId) ?? PROGRAMS[2]; // default 16:8

  container.innerHTML = `
    ${renderGreeting(settings)}
    <div class="card">
      <div class="card-title">Choose Your Program</div>
      <div class="program-grid" id="program-grid">
        ${PROGRAMS.map(p => `
          <button class="program-btn${p.id === selProg.id ? ' selected' : ''}" data-id="${p.id}">
            ${p.label}
            ${p.sub ? `<small>${p.sub}</small>` : ''}
          </button>
        `).join('')}
      </div>
      <div id="custom-wrap" style="display:${selProg.custom ? 'block' : 'none'}">
        <div class="custom-input-wrap">
          <span class="text-muted" style="font-size:.8rem">Hours:</span>
          <input type="range" id="custom-range" min="1" max="48" step="0.5" value="${savedHours}" />
          <span class="custom-val" id="custom-val">${savedHours}h</span>
        </div>
      </div>
      <button class="btn btn-primary mt-12" id="confirm-prog-btn">
        ${selProg.omad ? 'Use OMAD' : `Use ${selProg.custom ? savedHours + 'h' : selProg.label}`}
      </button>
    </div>
  `;

  let currentProg  = selProg;
  let currentHours = savedHours;

  const confirmBtn  = container.querySelector('#confirm-prog-btn');
  const customWrap  = container.querySelector('#custom-wrap');
  const customRange = container.querySelector('#custom-range');
  const customVal   = container.querySelector('#custom-val');

  function updateConfirmLabel() {
    if (currentProg.omad)   confirmBtn.textContent = 'Use OMAD';
    else if (currentProg.custom) confirmBtn.textContent = `Use ${currentHours}h Fast`;
    else confirmBtn.textContent = `Use ${currentProg.label}`;
  }

  container.querySelector('#program-grid').addEventListener('click', e => {
    const btn = e.target.closest('.program-btn');
    if (!btn) return;
    currentProg = getProgramById(btn.dataset.id);
    container.querySelectorAll('.program-btn').forEach(b =>
      b.classList.toggle('selected', b.dataset.id === currentProg.id));
    customWrap.style.display = currentProg.custom ? 'block' : 'none';
    updateConfirmLabel();
  });

  customRange.addEventListener('input', () => {
    currentHours = parseFloat(customRange.value);
    customVal.textContent = `${currentHours}h`;
    updateConfirmLabel();
  });

  confirmBtn.addEventListener('click', () => {
    const eatH = currentProg.custom
      ? Math.max(0.5, 24 - currentHours)
      : (currentProg.eatHours ?? 8);
    saveSettings({
      ...s(),
      selectedProgramId: currentProg.id,
      customHours: currentProg.custom ? currentHours : undefined,
    });
    if (currentProg.omad) {
      logMeal(23);
    } else {
      startFast(currentProg.id, currentProg.custom ? currentHours : currentProg.hours, eatH);
    }
    renderFast(container);
  });
}

// ─────────────────────────────────────────────────────────────
// Ready state (program chosen, not currently fasting/eating)
// ─────────────────────────────────────────────────────────────
function renderReadyState(container, prog, settings) {
  const customHours = settings.customHours ?? 16;
  const fastH = prog.custom ? customHours : prog.hours;
  const eatH  = prog.custom ? Math.max(0.5, 24 - customHours) : (prog.eatHours ?? 8);
  const hist  = getFastHistory().slice(0, 3);

  container.innerHTML = `
    ${renderGreeting(settings)}
    <div class="card ready-card">
      <div class="ready-prog-badge">${prog.label}</div>
      <div class="ready-windows">
        <div class="ready-win"><span class="ready-win-h">${fastH}h</span><span>fasting</span></div>
        <div class="ready-sep">›</div>
        <div class="ready-win"><span class="ready-win-h">${eatH}h</span><span>eating</span></div>
      </div>
      ${prog.sub ? `<p class="ready-sub">${prog.sub}</p>` : ''}
      <button class="btn btn-primary mt-16" id="start-fast-btn">
        Start ${fastH}h Fast
      </button>
      <button class="btn btn-ghost mt-8" id="change-prog-btn" style="width:100%">Change Program</button>
    </div>
    ${renderHistoryCard()}
  `;

  container.querySelector('#start-fast-btn').addEventListener('click', () => {
    startFast(prog.id, fastH, eatH);
    renderFast(container);
  });
  container.querySelector('#change-prog-btn').addEventListener('click', () => {
    renderProgramSelector(container, settings);
  });
}

// ─────────────────────────────────────────────────────────────
// Fast countdown timer
// ─────────────────────────────────────────────────────────────
function renderFastTimer(container, activeFast, prog) {
  const fastH = activeFast.targetHours;
  const label = prog?.label ?? `${fastH}h`;

  container.innerHTML = `
    <div class="card timer-card">
      <div class="timer-mode-label">FASTING</div>
      ${ringHTML()}
      <div class="timer-prog-name">${label} · ${fastH}h fast</div>
      <div id="overtime-badge-wrap" class="mt-8"></div>
      <button class="btn btn-danger mt-16" id="stop-fast-btn">Stop Fast</button>
    </div>
    ${renderHistoryCard()}
  `;

  // Ask for notification permission the first time a fast is active
  requestPermission();
  clearNotifyKey(`fast-${activeFast.startedAt}`);

  container.querySelector('#stop-fast-btn').addEventListener('click', () => {
    stopFast();
    renderFast(container);
  });

  startTick(() => tickRing('fast', activeFast.startedAt, fastH));
}

// ─────────────────────────────────────────────────────────────
// Eating window countdown
// ─────────────────────────────────────────────────────────────
function renderEatTimer(container, activeEat, prog) {
  const eatH  = activeEat.targetHours;
  const label = prog?.label ?? '';

  container.innerHTML = `
    <div class="card timer-card timer-card-eat">
      <div class="timer-mode-label eating">EATING WINDOW</div>
      ${ringHTML('eat')}
      <div class="timer-prog-name">${label} · ${eatH}h window</div>
      <div id="overtime-badge-wrap" class="mt-8"></div>
      <button class="btn btn-primary mt-16" id="start-next-fast-btn">Start Fasting Now</button>
      <button class="btn btn-ghost mt-8" id="end-eat-btn" style="width:100%;font-size:.8rem">
        End Eating Window
      </button>
    </div>
    ${renderHistoryCard()}
  `;

  clearNotifyKey(`eat-${activeEat.startedAt}`);

  container.querySelector('#start-next-fast-btn').addEventListener('click', () => {
    // stopConsumption is called inside startFast
    const settings = s();
    const p = prog ?? getProgramById(settings.selectedProgramId);
    const customH = settings.customHours ?? 16;
    const fastH   = p?.custom ? customH : (p?.hours ?? 16);
    const nextEatH = p?.custom ? Math.max(0.5, 24 - customH) : (p?.eatHours ?? 8);
    startFast(p?.id ?? '16:8', fastH, nextEatH);
    renderFast(container);
  });

  container.querySelector('#end-eat-btn').addEventListener('click', () => {
    stopConsumption();
    renderFast(container);
  });

  startTick(() => tickRing('eat', activeEat.startedAt, eatH));
}

// ─────────────────────────────────────────────────────────────
// Shared ring HTML + tick
// ─────────────────────────────────────────────────────────────
function ringHTML(mode = 'fast') {
  return `
    <div class="timer-ring-wrap">
      <div class="timer-ring">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle class="ring-bg" cx="110" cy="110" r="100"/>
          <circle class="ring-prog" id="ring-prog" cx="110" cy="110" r="100"
            stroke-dasharray="${CIRCUM.toFixed(1)}" stroke-dashoffset="${CIRCUM.toFixed(1)}"/>
        </svg>
        <div class="timer-center">
          <span class="timer-label" id="timer-label">remaining</span>
          <span class="timer-digits" id="timer-digits">--:--:--</span>
        </div>
      </div>
    </div>
  `;
}

function tickRing(mode, startedAt, targetHours) {
  const digitsEl = document.getElementById('timer-digits');
  if (!digitsEl) return;   // view changed — interval will be cleared by clearTick() on next navigate

  const ringEl   = document.getElementById('ring-prog');
  const labelEl  = document.getElementById('timer-label');
  const badgeEl  = document.getElementById('overtime-badge-wrap');

  const rem        = remaining(startedAt, targetHours);
  const isOvertime = rem < 0;

  digitsEl.textContent = formatHMS(Math.abs(rem));
  digitsEl.className   = `timer-digits${isOvertime ? ' overtime' : ''}`;
  if (labelEl) labelEl.textContent = isOvertime ? 'overtime' : 'remaining';

  if (ringEl) {
    const pct    = isOvertime ? 1 : (elapsed(startedAt) / (targetHours * 3600));
    const offset = CIRCUM * (1 - Math.min(1, pct));
    ringEl.setAttribute('stroke-dashoffset', offset.toFixed(1));
    ringEl.className = `ring-prog${isOvertime ? ' overtime' : ''}${mode === 'eat' ? ' ring-eat' : ''}`;
  }

  if (badgeEl) {
    badgeEl.innerHTML = isOvertime
      ? `<span class="overtime-badge">+${formatHMS(Math.abs(rem))} overtime</span>`
      : '';
  }

  // Fire notification once when the window ends
  if (isOvertime) {
    const key = `${mode}-${startedAt}`;
    if (mode === 'fast') {
      notifyOnce(key, '🐝 Fast complete!',
        `Your ${targetHours}h fast is done. Time to eat — don't overdo it!`,
        { tag: 'fast-end', renotify: true });
    } else {
      notifyOnce(key, '⏱ Eating window closed',
        `Your ${targetHours}h eating window is up. Start your next fast when ready.`,
        { tag: 'eat-end', renotify: true });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// OMAD view
// ─────────────────────────────────────────────────────────────
function renderOmadView(container, omad) {
  const targetHours = omad?.targetHours ?? 23;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">OMAD — One Meal a Day</div>
      ${omad ? `
        <p style="text-align:center;font-size:.8rem;color:var(--muted)">Time since last meal</p>
        <div class="omad-since" id="omad-since">--:--:--</div>
        <div class="omad-target-bar-wrap">
          <div class="omad-bar-bg"><div class="omad-bar-fill" id="omad-bar" style="width:0%"></div></div>
          <div class="omad-bar-label"><span>0h</span><span>${targetHours}h target</span></div>
        </div>
        <div id="omad-reached-msg"></div>
      ` : `<p style="text-align:center;color:var(--muted);padding:20px 0">No meal logged yet.</p>`}
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
    saveSettings({ ...s(), selectedProgramId: '16:8' });
    renderFast(container);
  });

  if (omad) {
    startTick(() => {
      const el  = document.getElementById('omad-since');
      const bar = document.getElementById('omad-bar');
      const msg = document.getElementById('omad-reached-msg');
      if (!el) { stopTick(); return; }
      const sec     = elapsed(omad.lastMealAt);
      const reached = sec >= targetHours * 3600;
      el.textContent  = formatHMS(sec);
      if (bar) {
        bar.style.width  = Math.min(100, (sec / (targetHours * 3600)) * 100) + '%';
        bar.className    = `omad-bar-fill${reached ? ' reached' : ''}`;
      }
      if (msg) {
        msg.innerHTML = reached
          ? `<p style="text-align:center;font-size:.8rem;color:var(--success);margin-top:8px">✓ Target reached!</p>`
          : '';
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────
// History helpers
// ─────────────────────────────────────────────────────────────
function renderHistoryCard() {
  const hist = getFastHistory().slice(0, 6);
  if (!hist.length) return '';
  const rows = hist.map(h => {
    const date = new Date(h.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const dur  = formatHMS(h.actualHours * 3600);
    const ot   = h.overtimeHours > 0
      ? `<span class="hist-ot">+${formatHMS(h.overtimeHours * 3600)}</span>` : '';
    return `<li class="history-item">
      <span class="hist-date">${date}</span>
      <span class="hist-prog">${(h.programId ?? '').toUpperCase()}</span>
      <span class="hist-dur">${dur}${ot}</span>
    </li>`;
  }).join('');
  return `<div class="card"><div class="card-title">Recent Fasts</div>
    <ul class="history-list">${rows}</ul></div>`;
}

function renderOmadHistoryCard() {
  const hist = getOmadHistory().slice(0, 6);
  if (!hist.length) return '';
  const rows = hist.map((h, i, arr) => {
    const date = new Date(h.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const gap = i < arr.length - 1
      ? `<span class="hist-ot">${formatHMS((new Date(h.at) - new Date(arr[i+1].at)) / 1000)} since prev</span>`
      : '';
    return `<li class="history-item"><span class="hist-date">${date}</span>${gap}</li>`;
  }).join('');
  return `<div class="card"><div class="card-title">Meal Log</div>
    <ul class="history-list">${rows}</ul></div>`;
}

function renderGreeting(settings) {
  const name = settings?.name?.trim();
  if (!name) return '';
  const h   = new Date().getHours();
  const tod = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  return `<p class="greeting">Good ${tod}, <strong>${name}</strong></p>`;
}

// ─────────────────────────────────────────────────────────────
// View: Weight
// ─────────────────────────────────────────────────────────────
let _weightRange = 90;
let _editingId   = null;

export function renderWeight(container) {
  clearTick();
  destroyChart();

  const u      = unit();
  const uLabel = unitLabel(u);
  const entries = getWeightDisplay(u).slice().reverse();
  const today   = new Date().toISOString().slice(0, 10);
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
            placeholder="${u === 'kg' ? '75.0' : '165.0'}"
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
        ${[[30,'1M'],[90,'3M'],[180,'6M'],[Infinity,'All']].map(([r,lbl]) =>
          `<button class="range-tab${r === _weightRange ? ' active' : ''}" data-range="${r}">${lbl}</button>`
        ).join('')}
      </div>
      <div class="chart-wrap"><canvas id="weight-chart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">Entries</div>
      ${entries.length === 0
        ? '<p class="empty-msg">No entries yet.</p>'
        : `<ul class="entry-list">${entries.map((e, i, arr) => {
            const prev = arr[i + 1];
            let delta = '';
            if (prev) {
              const d = e.display - prev.display;
              delta = `<span class="entry-delta ${d > 0 ? 'delta-up' : 'delta-down'}">${d > 0 ? '+' : ''}${d.toFixed(1)}</span>`;
            }
            return `<li class="entry-item">
              <span class="entry-date">${new Date(e.at+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span>
              <span class="entry-val">${e.display} ${uLabel}${delta}</span>
              <span class="entry-actions">
                <button class="btn btn-ghost btn-sm" data-edit="${e.id}">Edit</button>
                <button class="btn btn-ghost btn-sm text-danger" data-del="${e.id}">Del</button>
              </span>
            </li>`;
          }).join('')}</ul>`}
    </div>
  `;

  container.querySelector('#save-weight-btn').addEventListener('click', () => {
    const date = container.querySelector('#w-date').value;
    const val  = container.querySelector('#w-val').value;
    if (!date || !val) return;
    if (_editingId) { updateWeightEntry(_editingId, date, val, u); _editingId = null; }
    else             { addWeightEntry(date, val, u); }
    renderWeight(container);
  });
  container.querySelector('#cancel-edit-btn')?.addEventListener('click', () => {
    _editingId = null; renderWeight(container);
  });
  container.querySelector('.entry-list')?.addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]');
    const dl = e.target.closest('[data-del]');
    if (ed) { _editingId = ed.dataset.edit; renderWeight(container); }
    if (dl) { deleteWeightEntry(dl.dataset.del); renderWeight(container); }
  });
  container.querySelectorAll('.range-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _weightRange = btn.dataset.range === 'Infinity' ? Infinity : parseInt(btn.dataset.range);
      btn.parentElement.querySelectorAll('.range-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateChartData(getChartData(u, _weightRange), uLabel);
    });
  });
  const canvas = container.querySelector('#weight-chart');
  if (canvas && entries.length > 0) {
    const tryRender = () => window.Chart
      ? renderWeightChart(canvas, getChartData(u, _weightRange), uLabel)
      : setTimeout(tryRender, 100);
    tryRender();
  }
}

// ─────────────────────────────────────────────────────────────
// View: Stats
// ─────────────────────────────────────────────────────────────
export function renderStats(container) {
  clearTick();
  const u     = unit();
  const uLabel = unitLabel(u);
  const wStats = get3MonthStats(u);
  const hist   = getFastHistory();

  let fStats = { total: 0, avg: 0, longest: 0, ot: 0 };
  if (hist.length) {
    fStats = {
      total:   hist.length,
      avg:     +(hist.reduce((s,h) => s + h.actualHours, 0) / hist.length).toFixed(1),
      longest: +Math.max(...hist.map(h => h.actualHours)).toFixed(1),
      ot:      +hist.reduce((s,h) => s + h.overtimeHours, 0).toFixed(1),
    };
  }

  const dir  = wStats?.trend === 'down' ? '▼' : wStats?.trend === 'up' ? '▲' : '→';
  const cls  = wStats?.trend ?? 'neutral';

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Weight — Last 3 Months</div>
      ${!wStats ? '<p class="empty-msg">Log at least 2 weight entries.</p>' : `
        <div class="stat-grid">
          <div class="stat-box">
            <span class="stat-label">Change</span>
            <span class="stat-val ${cls}">${dir} ${wStats.delta > 0 ? '+' : ''}${wStats.delta} ${uLabel}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">% Change</span>
            <span class="stat-val ${cls}">${wStats.pct > 0 ? '+' : ''}${wStats.pct}%</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Min</span>
            <span class="stat-val">${wStats.min} ${uLabel}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Max</span>
            <span class="stat-val">${wStats.max} ${uLabel}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Average</span>
            <span class="stat-val">${wStats.avg.toFixed(1)} ${uLabel}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Entries</span>
            <span class="stat-val">${wStats.entries}</span>
          </div>
        </div>
        <p style="font-size:.72rem;color:var(--muted);margin-top:10px">${wStats.from} → ${wStats.to} ${uLabel}</p>
      `}
    </div>
    <div class="card">
      <div class="card-title">Fasting — All Time</div>
      ${!fStats.total ? '<p class="empty-msg">No completed fasts yet.</p>' : `
        <div class="stat-grid">
          <div class="stat-box"><span class="stat-label">Total Fasts</span><span class="stat-val">${fStats.total}</span></div>
          <div class="stat-box"><span class="stat-label">Avg Duration</span><span class="stat-val">${fStats.avg}h</span></div>
          <div class="stat-box"><span class="stat-label">Longest</span><span class="stat-val">${fStats.longest}h</span></div>
          <div class="stat-box"><span class="stat-label">Total Overtime</span><span class="stat-val text-warning">${fStats.ot}h</span></div>
        </div>
      `}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// View: Cravings
// ─────────────────────────────────────────────────────────────
export function renderCravings(container) {
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
        <div class="stat-box"><span class="stat-label">Today</span><span class="stat-val" id="daily-count">${stats.daily}</span></div>
        <div class="stat-box"><span class="stat-label">This Week</span><span class="stat-val">${stats.weekly}</span></div>
        <div class="stat-box"><span class="stat-label">This Month</span><span class="stat-val">${stats.monthly}</span></div>
        <div class="stat-box"><span class="stat-label">All Time</span><span class="stat-val">${stats.total}</span></div>
      </div>
      ${streak > 0 ? `<div class="streak-banner">🔥 ${streak}-day resistance streak</div>` : ''}
    </div>

    <div class="card">
      <div class="card-title">Last 30 Days</div>
      <div class="craving-calendar">
        ${days.map(d => {
          const intensity = d.count === 0 ? 0 : Math.ceil((d.count / maxDay) * 4);
          const lbl = new Date(d.key+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
          return `<div class="cal-dot cal-dot-${intensity}" title="${lbl}: ${d.count}"></div>`;
        }).join('')}
      </div>
      <div class="cal-legend">
        <span style="color:var(--muted);font-size:.7rem">Less</span>
        ${[0,1,2,3,4].map(i=>`<div class="cal-dot cal-dot-${i}" style="pointer-events:none"></div>`).join('')}
        <span style="color:var(--muted);font-size:.7rem">More</span>
      </div>
    </div>

    ${recent.length ? `
    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        Recent <button class="btn btn-ghost btn-sm" id="undo-btn">Undo last</button>
      </div>
      <ul class="history-list">
        ${recent.map(c => {
          const dt = new Date(c.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
          return `<li class="history-item"><span class="hist-date">${dt}</span><span>💪 Resisted</span></li>`;
        }).join('')}
      </ul>
    </div>` : ''}
  `;

  const MSGS = ['💪 Strong!', '🎉 You did it!', '✨ Keep going!', '🏆 Willpower!', '⚡ Unstoppable!'];
  container.querySelector('#panic-btn').addEventListener('click', () => {
    logCraving();
    const fb = document.getElementById('panic-feedback');
    if (fb) { fb.textContent = MSGS[Math.floor(Math.random()*MSGS.length)]; fb.classList.add('show'); }
    const dc = document.getElementById('daily-count');
    if (dc) dc.textContent = String(parseInt(dc.textContent||'0') + 1);
    setTimeout(() => { fb?.classList.remove('show'); renderCravings(container); }, 1200);
  });
  container.querySelector('#undo-btn')?.addEventListener('click', () => {
    deleteLastCraving(); renderCravings(container);
  });
}

// ─────────────────────────────────────────────────────────────
// View: Settings
// ─────────────────────────────────────────────────────────────
export function renderSettings(container) {
  clearTick();
  const settings = s();

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Profile</div>
      <div class="settings-row">
        <label for="s-name">First name</label>
        <input id="s-name" type="text" maxlength="32" placeholder="e.g. Alex"
          value="${settings.name ?? ''}"
          style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);
                 color:var(--text);padding:8px 12px;font-size:.9rem;width:140px;text-align:right" />
      </div>
    </div>
    <div class="card">
      <div class="card-title">Preferences</div>
      <div class="settings-row">
        <label>Weight Unit</label>
        <div class="pill-toggle">
          <button class="pill-btn${settings.unit==='kg'?' active':''}" data-unit="kg">kg</button>
          <button class="pill-btn${settings.unit==='lb'?' active':''}" data-unit="lb">lb</button>
        </div>
      </div>
      ${notificationsSupported() ? (() => {
        const perm = notificationPermission();
        const granted = perm === 'granted';
        const denied  = perm === 'denied';
        return `
        <div class="settings-row">
          <label>Timer Notifications</label>
          ${denied
            ? `<span style="font-size:.78rem;color:var(--muted)">Blocked in browser</span>`
            : granted
              ? `<span style="font-size:.78rem;color:var(--success)">✓ Enabled</span>`
              : `<button class="btn btn-ghost btn-sm" id="req-notif-btn">Enable</button>`
          }
        </div>`;
      })() : ''}
    </div>
    <div class="card">
      <div class="card-title">About</div>
      <p style="font-size:.85rem;color:var(--muted);line-height:1.7">
        Fast Wasp — local-first intermittent fasting tracker.<br>
        All data stored in your browser's localStorage.<br>
        No account required. Works offline.
      </p>
      <p style="margin-top:10px;font-size:.72rem;color:var(--muted)">v1.0.0</p>
    </div>
  `;

  const ni = container.querySelector('#s-name');
  const saveName = () => saveSettings({ ...s(), name: ni.value.trim() });
  ni.addEventListener('blur', saveName);
  ni.addEventListener('keydown', e => { if (e.key==='Enter') { saveName(); ni.blur(); } });

  container.querySelectorAll('[data-unit]').forEach(btn =>
    btn.addEventListener('click', () => {
      saveSettings({ ...s(), unit: btn.dataset.unit });
      renderSettings(container);
    })
  );

  container.querySelector('#req-notif-btn')?.addEventListener('click', async () => {
    await requestPermission();
    renderSettings(container);
  });
}
