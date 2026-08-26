/**
 * Game Engine — Who Is Imposter?
 *
 * Pure game logic, no DOM interaction.
 * Manages rounds, word selection, imposter assignment, and state persistence.
 */

import allWords from '../data/words.js';

const STORAGE_KEYS = {
  usedWords: 'wii_usedWords',
  imposterHistory: 'wii_imposterHistory',
  savedPlayers: 'wii_savedPlayers',
  hintMode: 'wii_hintMode',
  activeRound: 'wii_activeRound', // sessionStorage
};

/* ── Helpers ── */

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Used‑word tracking (localStorage) ── */

function getUsedWords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.usedWords)) || [];
  } catch {
    return [];
  }
}

function markWordUsed(word) {
  const used = getUsedWords();
  used.push(word);
  localStorage.setItem(STORAGE_KEYS.usedWords, JSON.stringify(used));
}

function resetUsedWordsIfNeeded() {
  const used = getUsedWords();
  const remaining = allWords.filter((entry) => !used.includes(entry.word));
  if (remaining.length === 0) {
    localStorage.removeItem(STORAGE_KEYS.usedWords);
  }
}

/* ── Imposter fairness (localStorage) ── */

function getImposterHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.imposterHistory)) || [];
  } catch {
    return [];
  }
}

function recordImposter(name) {
  const history = getImposterHistory();
  history.push(name);
  localStorage.setItem(STORAGE_KEYS.imposterHistory, JSON.stringify(history));
}

/**
 * Pick the fairest imposter:
 * - Prefer players who haven't been imposter yet (among current players)
 * - Among those, prefer someone who wasn't imposter last round
 * - Avoid picking the same player consecutively
 */
function pickImposter(players, lastImposter) {
  const history = getImposterHistory();
  const counts = {};
  players.forEach((p) => (counts[p] = 0));
  history.forEach((name) => {
    if (counts[name] !== undefined) counts[name]++;
  });

  const minCount = Math.min(...Object.values(counts));
  let candidates = players.filter((p) => counts[p] === minCount);

  // Avoid consecutive same imposter if possible
  if (lastImposter && candidates.length > 1) {
    candidates = candidates.filter((p) => p !== lastImposter);
  }

  if (candidates.length === 0) candidates = players;
  return pickRandom(candidates);
}

/* ── Word selection ── */

function pickWordEntry() {
  resetUsedWordsIfNeeded();
  const used = getUsedWords();
  let remaining = allWords.filter((entry) => !used.includes(entry.word));
  if (remaining.length === 0) {
    remaining = allWords;
  }
  return pickRandom(remaining);
}

/* ── Player persistence ── */

export function getSavedPlayers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.savedPlayers)) || [];
  } catch {
    return [];
  }
}

export function savePlayers(players) {
  localStorage.setItem(STORAGE_KEYS.savedPlayers, JSON.stringify(players));
}

/* ── Active round (sessionStorage for crash safety) ── */

export function getActiveRound() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.activeRound));
  } catch {
    return null;
  }
}

function saveActiveRound(round) {
  sessionStorage.setItem(STORAGE_KEYS.activeRound, JSON.stringify(round));
}

export function clearActiveRound() {
  sessionStorage.removeItem(STORAGE_KEYS.activeRound);
}

/* ── Create a new round ── */

export function createRound(players) {
  const entry = pickWordEntry();
  const lastHistory = getImposterHistory();
  const lastImposter = lastHistory.length > 0 ? lastHistory[lastHistory.length - 1] : null;
  const imposter = pickImposter(players, lastImposter);
  const starter = pickRandom(players);

  const round = {
    players: [...players],
    word: entry.word,
    hint: entry.hint,
    imposter,
    starter,
    currentIndex: 0,
    phase: 'handoff', // handoff → role → (repeat) → discussion → result
    revealed: false,
  };

  markWordUsed(entry.word);
  recordImposter(imposter);
  saveActiveRound(round);
  return round;
}

/* ── Update round state ── */

export function updateRound(round) {
  saveActiveRound(round);
}

/* ── Reset imposter history when players change ── */

export function resetImposterHistoryForPlayers(players) {
  const history = getImposterHistory();
  // Keep only entries for current players
  const filtered = history.filter((name) => players.includes(name));
  localStorage.setItem(STORAGE_KEYS.imposterHistory, JSON.stringify(filtered));
}

/* ── Hint mode persistence ── */

export function getHintMode() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.hintMode)) || false;
  } catch {
    return false;
  }
}

export function setHintMode(enabled) {
  localStorage.setItem(STORAGE_KEYS.hintMode, JSON.stringify(enabled));
}

/* ── Total word count (for info) ── */
export const totalWordCount = allWords.length;
