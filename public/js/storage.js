// storage.js — localStorage persistence: projects, files, chat, version history.
// Nothing in this file touches the DOM; it's pure data access so it can be tested/reasoned
// about independently of rendering.

const $ = (id) => document.getElementById(id);

// ---------- STATE ----------
let currentProjectId = localStorage.getItem("codeagent:lastProject") || null;
let currentFiles = {};      // {path: content}
let currentChat = [];       // [{role, content}]
let chatSummary = "";       // rolling summary of older turns

// ---------- LOCALSTORAGE HELPERS ----------
// safeParse: never let one corrupted localStorage entry (partial write, old buggy version,
// browser storage quota hiccup, etc.) permanently break a whole panel. This was the actual
// cause of the Projects drawer refusing to open — listProjects() called JSON.parse directly
// on unvalidated storage data with no fallback, so a single bad entry threw uncaught right
// at the top of renderProjectList().
function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Corrupted localStorage JSON, falling back:", e);
    return fallback;
  }
}

function listProjects() {
  const raw = localStorage.getItem("codeagent:projects");
  const parsed = safeParse(raw, null);
  if (parsed && typeof parsed === "object") return parsed;

  // Index was missing or corrupted. Before giving up, scan for orphaned "project:<id>"
  // entries that are still perfectly readable and rebuild the index from them — otherwise
  // a single bad write to the index alone would strand real project data forever, even
  // though the underlying files are fine.
  const recovered = {};
  let foundAny = false;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("project:")) continue;
    const id = key.slice("project:".length);
    const data = safeParse(localStorage.getItem(key), null);
    if (data) {
      recovered[id] = { name: `Recovered Project`, updatedAt: data.updatedAt || Date.now() };
      foundAny = true;
    }
  }
  if (foundAny) {
    localStorage.setItem("codeagent:projects", JSON.stringify(recovered));
    console.warn("Projects index was corrupted — recovered", Object.keys(recovered).length, "project(s) from raw storage.");
  }
  return recovered;
}
function saveProjectMeta(id, meta) {
  const all = listProjects();
  all[id] = meta;
  localStorage.setItem("codeagent:projects", JSON.stringify(all));
}
function deleteProjectMeta(id) {
  const all = listProjects();
  delete all[id];
  localStorage.setItem("codeagent:projects", JSON.stringify(all));
  localStorage.removeItem(`project:${id}`);
  localStorage.removeItem(`chat:${id}`);
  localStorage.removeItem(`history:${id}`);
  localStorage.removeItem(`redo:${id}`);
}
function loadProjectFiles(id) {
  const raw = localStorage.getItem(`project:${id}`);
  const parsed = safeParse(raw, { files: {} });
  return parsed.files || {};
}
function saveProjectFiles(id, files) {
  localStorage.setItem(`project:${id}`, JSON.stringify({ files, updatedAt: Date.now() }));
  const meta = listProjects()[id] || { name: id };
  saveProjectMeta(id, { ...meta, updatedAt: Date.now() });
}
function loadChat(id) {
  const raw = localStorage.getItem(`chat:${id}`);
  return safeParse(raw, { messages: [], summary: "" });
}
function saveChat(id, messages, summary) {
  localStorage.setItem(`chat:${id}`, JSON.stringify({ messages, summary }));
}

// ---------- FILE VERSION HISTORY (undo/redo + diff view) ----------
// Keeps the last N snapshots of each file's content, separate from the live project save,
// so a bad AI edit can be undone and so we can show a real before/after diff. Capped small
// per file to keep localStorage usage sane on a phone.
const MAX_HISTORY_PER_FILE = 5;

function loadFileHistory(projectId) {
  const raw = localStorage.getItem(`history:${projectId}`);
  return safeParse(raw, {}); // { path: [ {content, ts, label}, ... ] } oldest-first
}
function saveFileHistory(projectId, history) {
  localStorage.setItem(`history:${projectId}`, JSON.stringify(history));
}

// Call this BEFORE overwriting a file's content, so the pre-change version is preserved.
function recordFileSnapshot(projectId, path, previousContent, label) {
  if (previousContent === undefined) return; // brand-new file — nothing to snapshot
  const history = loadFileHistory(projectId);
  if (!history[path]) history[path] = [];
  history[path].push({ content: previousContent, ts: Date.now(), label: label || "edit" });
  if (history[path].length > MAX_HISTORY_PER_FILE) {
    history[path] = history[path].slice(-MAX_HISTORY_PER_FILE);
  }
  saveFileHistory(projectId, history);
}

function undoFileChange(path) {
  const history = loadFileHistory(currentProjectId);
  const stack = history[path];
  if (!stack || !stack.length) return false;
  const previous = stack.pop();
  // push current (about to be replaced) content onto a redo stack so it's recoverable
  const redoKey = `redo:${currentProjectId}`;
  const redoHistory = safeParse(localStorage.getItem(redoKey), {});
  if (!redoHistory[path]) redoHistory[path] = [];
  redoHistory[path].push({ content: currentFiles[path], ts: Date.now(), label: "redo-point" });
  localStorage.setItem(redoKey, JSON.stringify(redoHistory));

  currentFiles[path] = previous.content;
  saveFileHistory(currentProjectId, history);
  saveProjectFiles(currentProjectId, currentFiles);
  return true;
}

function redoFileChange(path) {
  const redoKey = `redo:${currentProjectId}`;
  const redoHistory = safeParse(localStorage.getItem(redoKey), {});
  const stack = redoHistory[path];
  if (!stack || !stack.length) return false;
  const next = stack.pop();
  recordFileSnapshot(currentProjectId, path, currentFiles[path], "undo-point");
  currentFiles[path] = next.content;
  localStorage.setItem(redoKey, JSON.stringify(redoHistory));
  saveProjectFiles(currentProjectId, currentFiles);
  return true;
}

function hasHistory(path) {
  const history = loadFileHistory(currentProjectId);
  return !!(history[path] && history[path].length);
}

// ---------- SIMPLE LINE-BASED DIFF (for the diff view, no external library) ----------
// Implements a basic LCS-based line diff — good enough for showing added/removed lines
// in a code file without pulling in a diff library (keeps the app dependency-light).
function computeLineDiff(oldText, newText) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length, n = newLines.length;

  // LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: "same", text: oldLines[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: oldLines[i] });
      i++;
    } else {
      result.push({ type: "added", text: newLines[j] });
      j++;
    }
  }
  while (i < m) { result.push({ type: "removed", text: oldLines[i] }); i++; }
  while (j < n) { result.push({ type: "added", text: newLines[j] }); j++; }
  return result;
}

function genId() {
  return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
