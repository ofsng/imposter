/**
 * Who Is Imposter? — Main Application
 *
 * Single-page party game.
 * All screens are managed in-app with no URL routing.
 */

import './style.css';
import {
  getSavedPlayers,
  savePlayers,
  createRound,
  getActiveRound,
  updateRound,
  clearActiveRound,
  resetImposterHistoryForPlayers,
  getHintMode,
  setHintMode,
} from './game/engine.js';

/* ═══════════════════════════════════════════
   State
   ═══════════════════════════════════════════ */

let players = [];
let round = null;
let hintMode = false;
let debouncing = false;

function debounce(fn) {
  if (debouncing) return;
  debouncing = true;
  fn();
  setTimeout(() => { debouncing = false; }, 400);
}

/* ═══════════════════════════════════════════
   DOM Helpers
   ═══════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  const target = $(`#${id}`);
  if (target) target.classList.add('active');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ═══════════════════════════════════════════
   Render: HTML Structure
   ═══════════════════════════════════════════ */

function renderApp() {
  $('#app').innerHTML = `
    <!-- ─── Home ─── -->
    <div id="screen-home" class="screen active">
      <div class="home-content">
        <div class="home-icon">?</div>
        <h1 class="home-title">Who Is Imposter?</h1>
        <p class="home-subtitle">Herkes kelimeyi biliyor. Bir kişi hariç.</p>
      </div>
      <div class="home-footer">
        <button id="btn-start" class="btn btn-primary">Oyuna Başla</button>
      </div>
    </div>

    <!-- ─── Player Setup ─── -->
    <div id="screen-setup" class="screen">
      <div class="setup-header">
        <h2>Oyuncular</h2>
        <p id="player-count-label">En az 3 oyuncu ekleyin</p>
      </div>
      <div class="input-row">
        <input id="input-player-name" type="text" placeholder="Oyuncu adı" maxlength="24" autocomplete="off" />
        <button id="btn-add-player" class="btn btn-primary btn-small">Ekle</button>
      </div>
      <ul id="player-list" class="player-list"></ul>
      <div class="hint-toggle">
        <label class="toggle-label" for="toggle-hint">
          <span class="toggle-text">İpucu Modu</span>
          <span class="toggle-desc">Imposter'a kelimeyle ilgili bir ipucu ver</span>
        </label>
        <button id="toggle-hint" class="toggle-switch" role="switch" aria-checked="false">
          <span class="toggle-knob"></span>
        </button>
      </div>
      <div class="setup-footer">
        <button id="btn-start-game" class="btn btn-primary" disabled>Oyunu Başlat</button>
        <div class="setup-bottom-row">
          <button id="btn-clear-players" class="btn btn-ghost btn-small">Oyuncuları Temizle</button>
          <button id="btn-back-home" class="btn btn-ghost btn-small">Ana Menü</button>
        </div>
      </div>
    </div>

    <!-- ─── Handoff (pass phone) ─── -->
    <div id="screen-handoff" class="screen">
      <div class="handoff-content">
        <h2 class="handoff-player-name"><span id="handoff-name"></span>, sıra sende</h2>
        <p class="handoff-privacy">Telefonu yalnızca <span id="handoff-name-repeat"></span> görsün.</p>
      </div>
      <button id="btn-show-role" class="btn btn-primary">Rolümü Gör</button>
    </div>

    <!-- ─── Role ─── -->
    <div id="screen-role" class="screen">
      <div class="role-content">
        <p id="role-player-label" class="role-player-label"></p>
        <div id="role-normal" style="display:none; width:100%;">
          <p class="role-word-label">Gizli kelimen</p>
          <div id="role-word" class="role-word"></div>
        </div>
        <div id="role-imposter" style="display:none; width:100%;">
          <div class="role-imposter-badge">SEN IMPOSTER'SIN</div>
          <p class="role-imposter-desc" style="margin-top:16px;">Kelimeyi bilmiyorsun. Diğer oyuncuların ipuçlarından kelimeyi anlamaya ve yakalanmamaya çalış.</p>
          <div id="hint-section" class="hint-section" style="display:none;">
            <button id="btn-show-hint" class="btn btn-secondary btn-small hint-btn">İpucunu Göster</button>
            <div id="hint-display" class="hint-display" style="display:none;"></div>
          </div>
        </div>
      </div>
      <div class="role-footer">
        <button id="btn-hide-role" class="btn btn-primary"></button>
      </div>
    </div>

    <!-- ─── Discussion ─── -->
    <div id="screen-discussion" class="screen">
      <div class="discussion-content">
        <p class="discussion-badge">Herkes rolünü gördü</p>
        <h2 class="discussion-title">Tartışma Zamanı</h2>
        <div class="discussion-starter">
          İlk ipucunu <strong id="discussion-starter-name"></strong> versin.
        </div>
        <ol class="discussion-rules">
          <li><span class="rule-num">1.</span> Kelimeyi doğrudan söyleme.</li>
          <li><span class="rule-num">2.</span> Çok açık veya tamamen alakasız ipucu verme.</li>
          <li><span class="rule-num">3.</span> Her oyuncu yalnızca bir ipucu versin.</li>
          <li><span class="rule-num">4.</span> Bir tur sonunda Imposter için karar verin.</li>
        </ol>
      </div>
      <div class="discussion-footer">
        <button id="btn-reveal-imposter" class="btn btn-danger">Imposter'ı Göster</button>
      </div>
    </div>

    <!-- ─── Result ─── -->
    <div id="screen-result" class="screen">
      <div class="result-content">
        <div class="result-reveal">
          <h2 class="result-imposter-name"><span id="result-imposter-name"></span> Imposter'dı!</h2>
        </div>
        <div class="result-word-box">
          <p class="result-word-label">Gizli kelime</p>
          <p id="result-word" class="result-word"></p>
        </div>
      </div>
      <div class="result-actions">
        <button id="btn-new-round" class="btn btn-primary">Aynı Oyuncularla Yeni Tur</button>
        <button id="btn-edit-players" class="btn btn-secondary">Oyuncuları Düzenle</button>
        <button id="btn-main-menu" class="btn btn-ghost">Ana Menü</button>
      </div>
    </div>

    <!-- ─── Confirm Modal ─── -->
    <div id="modal-overlay" class="modal-overlay hidden">
      <div class="modal-box">
        <h3 id="modal-title"></h3>
        <p id="modal-message"></p>
        <div class="modal-buttons">
          <button id="modal-cancel" class="btn btn-secondary btn-small">İptal</button>
          <button id="modal-confirm" class="btn btn-danger btn-small">Evet</button>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════
   Modal
   ═══════════════════════════════════════════ */

let modalResolve = null;

function showModal(title, message) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    $('#modal-title').textContent = title;
    $('#modal-message').textContent = message;
    $('#modal-overlay').classList.remove('hidden');
  });
}

function hideModal() {
  $('#modal-overlay').classList.add('hidden');
  modalResolve = null;
}

/* ═══════════════════════════════════════════
   Player Setup Logic
   ═══════════════════════════════════════════ */

function renderPlayerList() {
  const list = $('#player-list');
  list.innerHTML = '';

  players.forEach((name, i) => {
    const li = document.createElement('li');
    li.className = 'player-item';
    li.innerHTML = `
      <span class="player-number">${i + 1}</span>
      <span class="player-name">${escapeHtml(name)}</span>
      <div class="player-actions">
        ${i > 0 ? `<button class="player-action-btn move-up" data-index="${i}" aria-label="Yukarı taşı">↑</button>` : ''}
        ${i < players.length - 1 ? `<button class="player-action-btn move-down" data-index="${i}" aria-label="Aşağı taşı">↓</button>` : ''}
        <button class="player-action-btn delete" data-index="${i}" aria-label="Sil">✕</button>
      </div>
    `;
    list.appendChild(li);
  });

  updateStartButton();
  updatePlayerCountLabel();
}

function updateStartButton() {
  const btn = $('#btn-start-game');
  if (btn) btn.disabled = players.length < 3;
}

function updatePlayerCountLabel() {
  const label = $('#player-count-label');
  if (!label) return;
  if (players.length < 3) {
    label.textContent = `${players.length}/20 oyuncu — en az 3 gerekli`;
  } else {
    label.textContent = `${players.length}/20 oyuncu`;
  }
}

function addPlayer() {
  const input = $('#input-player-name');
  const name = input.value.trim();

  if (!name) return;
  if (players.length >= 20) return;

  // Case-insensitive duplicate check
  const nameLower = name.toLocaleLowerCase('tr-TR');
  if (players.some((p) => p.toLocaleLowerCase('tr-TR') === nameLower)) {
    input.value = '';
    input.focus();
    return;
  }

  players.push(name);
  savePlayers(players);
  input.value = '';
  input.focus();
  renderPlayerList();
}

function removePlayer(index) {
  players.splice(index, 1);
  savePlayers(players);
  renderPlayerList();
}

function movePlayer(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= players.length) return;
  [players[index], players[newIndex]] = [players[newIndex], players[index]];
  savePlayers(players);
  renderPlayerList();
}

function clearPlayers() {
  players = [];
  savePlayers(players);
  renderPlayerList();
}

/* ═══════════════════════════════════════════
   Game Flow
   ═══════════════════════════════════════════ */

function startGame() {
  if (players.length < 3) return;
  resetImposterHistoryForPlayers(players);
  startNewRound();
}

function startNewRound() {
  debounce(() => {
    round = createRound(players);
    showHandoff();
  });
}

function showHandoff() {
  // Clear any role content first for security
  const roleWord = $('#role-word');
  const roleNormal = $('#role-normal');
  const roleImposter = $('#role-imposter');
  if (roleWord) roleWord.textContent = '';
  if (roleNormal) roleNormal.style.display = 'none';
  if (roleImposter) roleImposter.style.display = 'none';

  // Clear hint content
  const hintDisplay = $('#hint-display');
  const hintSection = $('#hint-section');
  const btnShowHint = $('#btn-show-hint');
  if (hintDisplay) { hintDisplay.textContent = ''; hintDisplay.style.display = 'none'; }
  if (hintSection) hintSection.style.display = 'none';
  if (btnShowHint) btnShowHint.style.display = '';

  const currentPlayer = round.players[round.currentIndex];
  $('#handoff-name').textContent = currentPlayer;
  $('#handoff-name-repeat').textContent = currentPlayer;
  showScreen('screen-handoff');
}

function showRole() {
  debounce(() => {
    const currentPlayer = round.players[round.currentIndex];
    const isImposter = currentPlayer === round.imposter;

    $('#role-player-label').textContent = currentPlayer;

    if (isImposter) {
      $('#role-normal').style.display = 'none';
      $('#role-imposter').style.display = 'block';
      $('#btn-hide-role').textContent = 'Anladım ve Gizledim';

      // Hint mode
      const hintSection = $('#hint-section');
      const hintDisplay = $('#hint-display');
      const btnShowHint = $('#btn-show-hint');
      if (hintMode && round.hint) {
        hintSection.style.display = 'block';
        btnShowHint.style.display = '';
        hintDisplay.style.display = 'none';
        hintDisplay.textContent = '';
      } else {
        hintSection.style.display = 'none';
      }
    } else {
      $('#role-imposter').style.display = 'none';
      $('#role-normal').style.display = 'block';
      $('#role-word').textContent = round.word;
      $('#btn-hide-role').textContent = 'Ezberledim ve Gizledim';
    }

    showScreen('screen-role');
  });
}

function hideRole() {
  debounce(() => {
    // Immediately clear sensitive content
    $('#role-word').textContent = '';
    $('#role-normal').style.display = 'none';
    $('#role-imposter').style.display = 'none';

    // Clear hint
    const hintDisplay = $('#hint-display');
    if (hintDisplay) { hintDisplay.textContent = ''; hintDisplay.style.display = 'none'; }
    const hintSection = $('#hint-section');
    if (hintSection) hintSection.style.display = 'none';

    round.currentIndex++;
    updateRound(round);

    if (round.currentIndex >= round.players.length) {
      showDiscussion();
    } else {
      showHandoff();
    }
  });
}

function showDiscussion() {
  round.phase = 'discussion';
  updateRound(round);
  $('#discussion-starter-name').textContent = round.starter;
  showScreen('screen-discussion');
}

function revealImposter() {
  round.phase = 'result';
  round.revealed = true;
  updateRound(round);

  $('#result-imposter-name').textContent = round.imposter;
  $('#result-word').textContent = round.word;

  // Clear active round now that it's revealed
  clearActiveRound();

  showScreen('screen-result');
}

/* ═══════════════════════════════════════════
   Restore active round on page reload
   ═══════════════════════════════════════════ */

function tryRestoreRound() {
  const saved = getActiveRound();
  if (!saved) return false;

  round = saved;
  players = [...round.players];

  if (round.revealed || round.phase === 'result') {
    // Already revealed, show result
    $('#result-imposter-name').textContent = round.imposter;
    $('#result-word').textContent = round.word;
    clearActiveRound();
    showScreen('screen-result');
    return true;
  }

  if (round.phase === 'discussion') {
    $('#discussion-starter-name').textContent = round.starter;
    showScreen('screen-discussion');
    return true;
  }

  // Still in handoff/role phase
  if (round.currentIndex >= round.players.length) {
    showDiscussion();
  } else {
    showHandoff();
  }
  return true;
}

/* ═══════════════════════════════════════════
   Navigation
   ═══════════════════════════════════════════ */

function goToSetup() {
  players = getSavedPlayers();
  hintMode = getHintMode();
  renderPlayerList();
  syncHintToggle();
  showScreen('screen-setup');
  setTimeout(() => {
    const input = $('#input-player-name');
    if (input) input.focus();
  }, 300);
}

function syncHintToggle() {
  const toggle = $('#toggle-hint');
  if (!toggle) return;
  toggle.setAttribute('aria-checked', String(hintMode));
  toggle.classList.toggle('active', hintMode);
}

async function goHome() {
  // If there's an active round, confirm
  const active = getActiveRound();
  if (active && !active.revealed) {
    const confirmed = await showModal(
      'Oyundan Çık',
      'Aktif oyun sırasında ana menüye dönmek istediğine emin misin? Tur bilgileri kaybolacak.'
    );
    if (!confirmed) return;
    clearActiveRound();
  }
  round = null;
  showScreen('screen-home');
}

/* ═══════════════════════════════════════════
   Event Binding
   ═══════════════════════════════════════════ */

function bindEvents() {
  // Home
  $('#btn-start').addEventListener('click', goToSetup);

  // Setup
  $('#btn-add-player').addEventListener('click', addPlayer);
  $('#input-player-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPlayer();
    }
  });
  $('#btn-start-game').addEventListener('click', startGame);
  $('#btn-clear-players').addEventListener('click', async () => {
    if (players.length === 0) return;
    const confirmed = await showModal('Oyuncuları Temizle', 'Tüm oyuncular silinsin mi?');
    if (confirmed) clearPlayers();
  });
  $('#btn-back-home').addEventListener('click', () => showScreen('screen-home'));

  // Player list delegation
  $('#player-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.player-action-btn');
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    if (btn.classList.contains('delete')) removePlayer(index);
    else if (btn.classList.contains('move-up')) movePlayer(index, -1);
    else if (btn.classList.contains('move-down')) movePlayer(index, 1);
  });

  // Hint toggle
  $('#toggle-hint').addEventListener('click', () => {
    hintMode = !hintMode;
    setHintMode(hintMode);
    syncHintToggle();
  });

  // Handoff
  $('#btn-show-role').addEventListener('click', showRole);

  // Role
  $('#btn-hide-role').addEventListener('click', hideRole);

  // Hint reveal button
  $('#btn-show-hint').addEventListener('click', () => {
    if (!round || !round.hint) return;
    const hintDisplay = $('#hint-display');
    const btnShowHint = $('#btn-show-hint');
    hintDisplay.textContent = round.hint;
    hintDisplay.style.display = 'block';
    btnShowHint.style.display = 'none';
  });

  // Discussion
  $('#btn-reveal-imposter').addEventListener('click', async () => {
    const confirmed = await showModal(
      'Imposter Açıklansın mı?',
      'Imposter açıklandığında tur sona erecek.'
    );
    if (confirmed) revealImposter();
  });

  // Result
  $('#btn-new-round').addEventListener('click', startNewRound);
  $('#btn-edit-players').addEventListener('click', goToSetup);
  $('#btn-main-menu').addEventListener('click', () => {
    round = null;
    showScreen('screen-home');
  });

  // Modal
  $('#modal-cancel').addEventListener('click', () => {
    if (modalResolve) modalResolve(false);
    hideModal();
  });
  $('#modal-confirm').addEventListener('click', () => {
    if (modalResolve) modalResolve(true);
    hideModal();
  });
  $('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      if (modalResolve) modalResolve(false);
      hideModal();
    }
  });

  // Prevent browser back from showing previous role
  window.addEventListener('popstate', (e) => {
    e.preventDefault();
    // Push state again to trap back button
    history.pushState(null, '', '');
  });

  // Push initial state for back button trap
  history.pushState(null, '', '');
}

/* ═══════════════════════════════════════════
   Init
   ═══════════════════════════════════════════ */

function init() {
  renderApp();
  bindEvents();

  // Try to restore an active round (page reload scenario)
  if (!tryRestoreRound()) {
    showScreen('screen-home');
  }
}

// Run
init();
