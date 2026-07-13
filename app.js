// English Challenge Hub — game engine

const MAX_CHANCE_DRAWS = 3;

const state = {
  groups: [],
  difficulty: 'A1',
  currentIndex: 0,
  direction: 1,
  skipAdvanceOnce: false,
  currentCategory: null,
  usedIndices: {}
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(`screen-${name}`).classList.remove('hidden');
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.classList.add('hidden'), 300);
  }, 2200);
}

/* ---------- SETUP SCREEN ---------- */
let groupCount = 4;
let selectedDifficulty = 'A1';

function renderGroupNameInputs() {
  const container = document.getElementById('group-name-inputs');
  const existing = [...container.querySelectorAll('input')].map(i => i.value);
  container.innerHTML = '';
  for (let i = 0; i < groupCount; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Group ${i + 1}`;
    input.value = existing[i] || '';
    input.maxLength = 20;
    container.appendChild(input);
  }
}

document.getElementById('group-count-minus').onclick = () => {
  groupCount = Math.max(2, groupCount - 1);
  document.getElementById('group-count-value').textContent = groupCount;
  renderGroupNameInputs();
};
document.getElementById('group-count-plus').onclick = () => {
  groupCount = Math.min(8, groupCount + 1);
  document.getElementById('group-count-value').textContent = groupCount;
  renderGroupNameInputs();
};

document.querySelectorAll('.difficulty-btn').forEach(btn => {
  btn.onclick = () => {
    selectedDifficulty = btn.dataset.level;
    document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
});
document.querySelector('.difficulty-btn[data-level="A1"]').classList.add('active');

document.getElementById('start-game-btn').onclick = () => {
  const inputs = [...document.getElementById('group-name-inputs').querySelectorAll('input')];
  state.groups = inputs.map((inp, i) => ({
    name: inp.value.trim() || `Group ${i + 1}`,
    score: 0,
    frozen: false,
    chanceCount: 0
  }));
  state.difficulty = selectedDifficulty;
  state.currentIndex = 0;
  state.direction = 1;
  state.skipAdvanceOnce = false;
  state.usedIndices = {};

  document.getElementById('play-level-badge').textContent = state.difficulty;
  renderTurnIndicator();
  renderScoreboard();
  renderChanceButton();
  showScreen('play');
  BackgroundMusic.start();
};

document.getElementById('settings-btn').onclick = () => {
  BackgroundMusic.stop();
  showScreen('setup');
};

document.getElementById('music-toggle-btn').onclick = () => {
  const muted = BackgroundMusic.toggleMute();
  document.getElementById('music-toggle-btn').textContent = muted ? '🔇' : '🎵';
};

/* ---------- SCOREBOARD (shared across screens) ---------- */
function scoreboardHTML() {
  return state.groups.map((g, i) => `
    <div class="score-chip ${i === state.currentIndex ? 'current-turn' : ''} ${g.frozen ? 'frozen' : ''}">
      <button type="button" class="score-btn" data-idx="${i}" data-delta="-1">−</button>
      <div class="score-name">${escapeHtml(g.name)}</div>
      <div class="score-value ${g.score < 0 ? 'negative' : ''}">${g.score}</div>
      <button type="button" class="score-btn" data-idx="${i}" data-delta="1">+</button>
    </div>
  `).join('');
}

function renderScoreboard() {
  const html = scoreboardHTML();
  document.getElementById('scoreboard').innerHTML = html;
  document.getElementById('scoreboard-q').innerHTML = html;
  document.getElementById('scoreboard-c').innerHTML = html;
}

document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('.score-btn');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  const delta = parseInt(btn.dataset.delta, 10);
  state.groups[idx].score = clampScore(state.groups[idx].score + delta);
  delta > 0 ? AudioFX.scoreUp() : AudioFX.scoreDown();
  renderScoreboard();
});

function renderTurnIndicator() {
  const g = state.groups[state.currentIndex];
  document.getElementById('turn-indicator').textContent = g ? `${g.name}'s Turn` : '';
}

/* ---------- CATEGORY GRID ---------- */
function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';
  Object.keys(CATEGORY_META).forEach(key => {
    const meta = CATEGORY_META[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-tile ${meta.cls}`;
    btn.innerHTML = `<span class="cat-icon">${meta.icon}</span><span>${meta.label}</span>`;
    btn.onclick = () => { AudioFX.select(); showQuestion(key); };
    grid.appendChild(btn);
  });

  const chanceRow = document.getElementById('chance-row');
  chanceRow.innerHTML = '';
  const chanceBtn = document.createElement('button');
  chanceBtn.type = 'button';
  chanceBtn.id = 'chance-btn';
  chanceBtn.className = 'category-tile cat-chance';
  chanceBtn.onclick = runChanceSpin;
  chanceRow.appendChild(chanceBtn);
  renderChanceButton();
}

function renderChanceButton() {
  const chanceBtn = document.getElementById('chance-btn');
  if (!chanceBtn) return;
  const g = state.groups[state.currentIndex];
  const used = g ? (g.chanceCount || 0) : 0;
  const remaining = Math.max(0, MAX_CHANCE_DRAWS - used);
  chanceBtn.innerHTML = `<span class="cat-icon">🎲</span><span>Chance Card (${remaining} left)</span>`;
  chanceBtn.disabled = remaining <= 0;
}
renderCategoryGrid();
renderGroupNameInputs();

/* ---------- QUESTION SCREEN ---------- */
function pickQuestion(category) {
  const pool = (QUESTIONS[category] && QUESTIONS[category][state.difficulty]) || [];
  if (pool.length === 0) return null;
  const key = category + '_' + state.difficulty;
  if (!state.usedIndices[key]) state.usedIndices[key] = new Set();
  const used = state.usedIndices[key];
  if (used.size >= pool.length) used.clear();
  let idx;
  do {
    idx = Math.floor(Math.random() * pool.length);
  } while (used.has(idx) && used.size < pool.length);
  used.add(idx);
  return pool[idx];
}

function showQuestion(category) {
  state.currentCategory = category;
  const meta = CATEGORY_META[category];

  document.getElementById('question-cat').textContent = meta.label;
  document.getElementById('question-cat').style.background = CATEGORY_COLOR[category];
  document.getElementById('question-level').textContent = state.difficulty;
  document.getElementById('question-spinner').textContent = meta.icon;

  const textEl = document.getElementById('question-text');
  const subEl = document.getElementById('question-sub');
  const answerLink = document.getElementById('answer-link');
  const answerText = document.getElementById('answer-text');
  textEl.classList.remove('reveal-pop');
  subEl.textContent = '';
  textEl.textContent = '';
  answerLink.classList.add('hidden');
  answerText.classList.add('hidden');
  answerText.textContent = '';

  const screen = document.getElementById('screen-question');
  screen.classList.add('revealing');
  showScreen('question');

  setTimeout(() => {
    const q = pickQuestion(category);
    screen.classList.remove('revealing');
    if (!q) {
      textEl.textContent = 'No questions available yet for this level. Please choose another category.';
    } else {
      subEl.textContent = q.sub || '';
      textEl.textContent = q.text;
      if (q.answer) {
        answerLink.classList.remove('hidden');
        answerLink.onclick = () => {
          answerText.textContent = q.answer;
          answerText.classList.remove('hidden');
          answerLink.classList.add('hidden');
        };
      }
    }
    textEl.classList.add('reveal-pop');
    AudioFX.reveal();
  }, 850);
}

document.getElementById('new-question-btn').onclick = () => showQuestion(state.currentCategory);
document.getElementById('back-to-categories-btn').onclick = () => showScreen('play');
document.getElementById('question-next-turn-btn').onclick = () => nextTurn();

/* ---------- TURN MANAGEMENT ---------- */
function nextTurn() {
  AudioFX.swoosh();
  if (state.skipAdvanceOnce) {
    state.skipAdvanceOnce = false;
    renderTurnIndicator();
    renderScoreboard();
    renderChanceButton();
    showScreen('play');
    return;
  }
  const n = state.groups.length;
  for (let i = 0; i < n; i++) {
    state.currentIndex = (state.currentIndex + state.direction + n) % n;
    const g = state.groups[state.currentIndex];
    if (g.frozen) {
      g.frozen = false;
      showToast(`${g.name} is frozen and skips this turn ❄️`);
      continue;
    }
    break;
  }
  renderTurnIndicator();
  renderScoreboard();
  renderChanceButton();
  showScreen('play');
}
document.getElementById('next-turn-btn').onclick = () => nextTurn();

/* ---------- CHANCE CARD ---------- */
function runChanceSpin() {
  const g = state.groups[state.currentIndex];
  const used = g ? (g.chanceCount || 0) : 0;
  if (used >= MAX_CHANCE_DRAWS) {
    showToast(`${g.name} has already used all ${MAX_CHANCE_DRAWS} Chance Card draws!`);
    return;
  }
  g.chanceCount = used + 1;
  renderChanceButton();

  AudioFX.select();
  showScreen('chance-spin');
  const reel = document.getElementById('chance-reel');
  reel.style.transition = 'none';
  reel.style.transform = 'translateY(0)';
  reel.innerHTML = '';

  const totalItems = 24;
  const chosenIdx = Math.floor(Math.random() * CHANCE_CARDS.length);
  const sequence = [];
  for (let i = 0; i < totalItems - 1; i++) {
    sequence.push(CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)]);
  }
  sequence.push(CHANCE_CARDS[chosenIdx]);

  sequence.forEach(card => {
    const div = document.createElement('div');
    div.className = 'chance-reel-item';
    div.textContent = `${card.icon} ${card.label}`;
    reel.appendChild(div);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      reel.style.transition = 'transform 2.6s cubic-bezier(0.1, 0.7, 0.25, 1)';
      reel.style.transform = `translateY(-${(sequence.length - 1) * 140}px)`;
    });
  });

  let tickDelay = 60;
  let elapsed = 0;
  const spinDuration = 2600;
  (function scheduleTick() {
    if (elapsed >= spinDuration) return;
    AudioFX.tick();
    tickDelay = Math.min(tickDelay * 1.15, 400);
    elapsed += tickDelay;
    setTimeout(scheduleTick, tickDelay);
  })();

  setTimeout(() => {
    AudioFX.fanfare();
    resolveChanceCard(CHANCE_CARDS[chosenIdx]);
  }, 2700);
}

function resolveChanceCard(card) {
  card.apply(state);
  const text = card.result(state);
  document.getElementById('chance-result-icon').textContent = card.icon;
  document.getElementById('chance-result-text').textContent = text;
  renderScoreboard();
  renderTurnIndicator();
  showScreen('chance-result');
}

document.getElementById('chance-back-btn').onclick = () => showScreen('play');
document.getElementById('chance-next-turn-btn').onclick = () => nextTurn();
