// app.js — all client logic. No frameworks, plain DOM.

const $ = (id) => document.getElementById(id);

// ---------- SVG ICONS (no emoji anywhere in the UI) ----------
const ICON = {
  eye: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  copy: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  download: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  trash: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  file: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  share: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>`,
  thumbsUp: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
  thumbsDown: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>`,
  check: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  folder: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/></svg>`,
  wave: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v0a2 2 0 0 0-4 0v0a2 2 0 0 0-4 0v6a8 8 0 0 0 8 8h1a7 7 0 0 0 7-7v-1a2 2 0 0 0-4 0Z"/></svg>`,
  diff: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="9"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
  undo: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>`,
  mic: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  code: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
};

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

// ---------- PROJECT TEMPLATES ----------
// Instant-start starting points that need zero LLM calls — pure token savings for the
// most common "give me a blank X to build on" requests.
const TEMPLATES = {
  blank: { label: "Blank", files: {} },
  landing: {
    label: "Landing Page",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>My Landing Page</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="hero">
    <h1>Welcome</h1>
    <p>Your headline goes here.</p>
    <button id="ctaBtn">Get Started</button>
  </header>
</body>
</html>`,
      "style.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; }
.hero {
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 24px;
  background: linear-gradient(135deg, #6c5ce7, #8b7cf6);
  color: white;
}
.hero h1 { font-size: 2.5rem; margin-bottom: 12px; }
.hero p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 24px; }
.hero button {
  padding: 12px 28px; border-radius: 999px; border: none;
  background: white; color: #6c5ce7; font-weight: 600; font-size: 1rem;
}`,
      "script.js": `document.getElementById('ctaBtn').addEventListener('click', () => {
  alert('Clicked!');
});`,
    },
  },
  calculator: {
    label: "Calculator",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Calculator</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="calc">
    <div class="display" id="display">0</div>
    <div class="keys" id="keys">
      <button data-key="C" class="op">C</button>
      <button data-key="/" class="op">÷</button>
      <button data-key="*" class="op">×</button>
      <button data-key="Backspace" class="op">⌫</button>
      <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button><button data-key="-" class="op">-</button>
      <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button><button data-key="+" class="op">+</button>
      <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button data-key="=" class="eq" rowspan="2">=</button>
      <button data-key="0" class="zero">0</button><button data-key=".">.</button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      "style.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #12141f; font-family: -apple-system, sans-serif; }
.calc { width: 320px; background: #191c2b; border-radius: 20px; padding: 16px; }
.display { color: white; font-size: 2.5rem; text-align: right; padding: 20px 10px; word-break: break-all; }
.keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.keys button { padding: 18px 0; border-radius: 12px; border: none; background: #262a42; color: white; font-size: 1.2rem; }
.keys button.op { background: #6c5ce7; color: white; }
.keys button.eq { background: #f0b429; grid-row: span 2; }
.keys button.zero { grid-column: span 2; }`,
      "script.js": `let expr = '';
const display = document.getElementById('display');
document.getElementById('keys').addEventListener('click', (e) => {
  const key = e.target.dataset.key;
  if (!key) return;
  if (key === 'C') expr = '';
  else if (key === 'Backspace') expr = expr.slice(0, -1);
  else if (key === '=') {
    try { expr = String(Function('"use strict";return (' + expr + ')')()); }
    catch { expr = 'Error'; }
  } else expr += key;
  display.textContent = expr || '0';
});`,
    },
  },
  todo: {
    label: "To-Do List",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>To-Do List</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app">
    <h1>My Tasks</h1>
    <div class="input-row">
      <input id="taskInput" placeholder="Add a task..." />
      <button id="addBtn">Add</button>
    </div>
    <ul id="taskList"></ul>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      "style.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #0a0b12; color: #eceef5; min-height: 100vh; }
.app { max-width: 420px; margin: 40px auto; padding: 20px; }
h1 { margin-bottom: 16px; }
.input-row { display: flex; gap: 8px; margin-bottom: 20px; }
.input-row input { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #191c2b; color: white; }
.input-row button { padding: 10px 16px; border-radius: 8px; border: none; background: #6c5ce7; color: white; }
#taskList { list-style: none; }
#taskList li { display: flex; justify-content: space-between; padding: 10px; background: #191c2b; border-radius: 8px; margin-bottom: 8px; }
#taskList li.done span { text-decoration: line-through; opacity: 0.5; }
#taskList li button { background: none; border: none; color: #ff6b6b; }`,
      "script.js": `const list = document.getElementById('taskList');
document.getElementById('addBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  const li = document.createElement('li');
  li.innerHTML = '<span>' + text + '</span><button>✕</button>';
  li.querySelector('span').addEventListener('click', () => li.classList.toggle('done'));
  li.querySelector('button').addEventListener('click', () => li.remove());
  list.appendChild(li);
  input.value = '';
}`,
    },
  },
};

function createProjectFromTemplate(name, templateKey) {
  const id = genId();
  saveProjectMeta(id, { name: name || "Untitled Project", updatedAt: Date.now() });
  const template = TEMPLATES[templateKey] || TEMPLATES.blank;
  saveProjectFiles(id, { ...template.files });
  saveChat(id, [], "");
  switchProject(id);
  if (Object.keys(template.files).length) {
    addSystemMsg(`Started from the "${template.label}" template.`);
  }
}

// ---------- CUSTOM MODAL (replaces window.prompt / confirm / alert) ----------
// showModal({title, message, hasInput, inputValue, okText, cancelText, danger})
// resolves to: string (input value) | true (confirm ok) | null (cancelled)
function showModal({ title = "", message = "", hasInput = false, inputValue = "", okText = "OK", cancelText = "Cancel", danger = false, hideCancel = false }) {
  return new Promise((resolve) => {
    const overlay = $("modalOverlay");
    const box = $("modalBox");
    $("modalTitle").textContent = title;
    $("modalMessage").textContent = message;
    $("modalMessage").classList.toggle("hidden", !message);

    const input = $("modalInput");
    input.classList.toggle("hidden", !hasInput);
    input.value = inputValue;

    const okBtn = $("modalOkBtn");
    const cancelBtn = $("modalCancelBtn");
    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;
    cancelBtn.classList.toggle("hidden", hideCancel);
    okBtn.classList.toggle("danger", danger);

    overlay.classList.remove("hidden");
    requestAnimationFrame(() => overlay.classList.add("show"));
    if (hasInput) setTimeout(() => input.focus(), 260);

    function cleanup(result) {
      overlay.classList.remove("show");
      setTimeout(() => overlay.classList.add("hidden"), 220);
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlay);
      input.removeEventListener("keydown", onKeydown);
      resolve(result);
    }
    function onOk() {
      cleanup(hasInput ? input.value.trim() : true);
    }
    function onCancel() {
      cleanup(null);
    }
    function onOverlay(e) {
      if (e.target === overlay) onCancel();
    }
    function onKeydown(e) {
      if (e.key === "Enter") onOk();
    }

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlay);
    input.addEventListener("keydown", onKeydown);
  });
}

function showAlert(message, title = "") {
  return showModal({ title, message, hideCancel: true, okText: "OK" });
}
function showConfirm(message, title = "") {
  return showModal({ title, message, okText: "OK", cancelText: "Cancel" });
}
function showPrompt(message, defaultValue = "", title = "") {
  return showModal({ title, message, hasInput: true, inputValue: defaultValue, okText: "OK", cancelText: "Cancel" });
}

// ---------- PROJECT MANAGEMENT ----------
function createProject(name) {
  const id = genId();
  saveProjectMeta(id, { name: name || "Untitled Project", updatedAt: Date.now() });
  saveProjectFiles(id, {});
  saveChat(id, [], "");
  switchProject(id);
}

function switchProject(id) {
  currentProjectId = id;
  localStorage.setItem("codeagent:lastProject", id);
  currentFiles = loadProjectFiles(id);
  const chat = loadChat(id);
  currentChat = chat.messages;
  chatSummary = chat.summary;
  const meta = listProjects()[id];
  $("projectName").textContent = meta ? meta.name : "Project";
  $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
  renderChatLog();
  renderFileList();
  closeDrawer();
  closeFilesPanel();
}

function deleteProject(id) {
  deleteProjectMeta(id);
  if (currentProjectId === id) {
    currentProjectId = null;
    const remaining = Object.keys(listProjects());
    if (remaining.length) switchProject(remaining[0]);
    else {
      $("projectName").textContent = "No Project";
      $("projectSub").textContent = "tap menu to switch";
      currentFiles = {};
      currentChat = [];
      renderChatLog();
      renderFileList();
    }
  }
  renderProjectList();
}

// ---------- RENDER: PROJECT DRAWER ----------
function renderProjectList() {
  const list = $("projectList");
  const projects = listProjects();
  const ids = Object.keys(projects).sort((a, b) => (projects[b].updatedAt || 0) - (projects[a].updatedAt || 0));
  if (!ids.length) {
    list.innerHTML = `<p style="color:var(--text-dim);font-size:13px;padding:10px;">Koi project nahi. "+ New" tap karo.</p>`;
    return;
  }
  list.innerHTML = ids.map((id) => {
    const p = projects[id];
    const active = id === currentProjectId ? "active" : "";
    const date = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "";
    return `<div class="project-item ${active}" data-id="${id}">
      <div class="project-item-info" data-action="open" data-id="${id}">
        <b>${escapeHtml(p.name)}</b>
        <span>${date}</span>
      </div>
      <button class="mini-btn danger" data-action="delete" data-id="${id}">${ICON.trash}</button>
    </div>`;
  }).join("");

  list.querySelectorAll('[data-action="open"]').forEach((el) =>
    el.addEventListener("click", () => switchProject(el.dataset.id))
  );
  list.querySelectorAll('[data-action="delete"]').forEach((el) =>
    el.addEventListener("click", async (e) => {
      e.stopPropagation();
      const ok = await showConfirm("Delete this project? Cannot be undone.", "Delete Project");
      if (ok) deleteProject(el.dataset.id);
    })
  );
}

// ---------- RENDER: FILES PANEL ----------
function renderFileList() {
  const list = $("fileList");
  const paths = Object.keys(currentFiles);
  if (!paths.length) {
    list.innerHTML = `<p style="color:var(--text-dim);font-size:13px;padding:10px;">Abhi koi file nahi hai.</p>`;
    return;
  }
  list.innerHTML = paths.map((path) => {
    const showDiffUndo = hasHistory(path);
    return `
    <div class="file-item">
      <div class="file-item-top">
        <b>${escapeHtml(path)}</b>
        <div class="file-item-actions">
          ${showDiffUndo ? `<button class="mini-btn" data-action="diff" data-path="${escapeAttr(path)}">${ICON.diff}</button>` : ""}
          ${showDiffUndo ? `<button class="mini-btn" data-action="undo" data-path="${escapeAttr(path)}">${ICON.undo}</button>` : ""}
          <button class="mini-btn" data-action="preview" data-path="${escapeAttr(path)}">${ICON.eye}</button>
          <button class="mini-btn" data-action="code" data-path="${escapeAttr(path)}">${ICON.code}</button>
          <button class="mini-btn" data-action="copy" data-path="${escapeAttr(path)}">${ICON.copy}</button>
          <button class="mini-btn" data-action="download" data-path="${escapeAttr(path)}">${ICON.download}</button>
          <button class="mini-btn danger" data-action="delete" data-path="${escapeAttr(path)}">${ICON.trash}</button>
        </div>
      </div>
    </div>
  `;
  }).join("");

  list.querySelectorAll('[data-action="diff"]').forEach((el) =>
    el.addEventListener("click", () => openDiffModal(el.dataset.path))
  );
  list.querySelectorAll('[data-action="undo"]').forEach((el) =>
    el.addEventListener("click", async () => {
      const ok = await showConfirm(`Undo the last change to "${el.dataset.path}"?`, "Undo Edit");
      if (!ok) return;
      if (undoFileChange(el.dataset.path)) {
        renderFileList();
        showToast(`${el.dataset.path} reverted`);
      } else {
        showToast("No earlier version found");
      }
    })
  );

  list.querySelectorAll('[data-action="preview"]').forEach((el) =>
    el.addEventListener("click", () => openPreviewModal(el.dataset.path))
  );
  list.querySelectorAll('[data-action="code"]').forEach((el) =>
    el.addEventListener("click", () => openCodeViewModal(el.dataset.path))
  );
  list.querySelectorAll('[data-action="copy"]').forEach((el) =>
    el.addEventListener("click", () => copyFileContent(el.dataset.path))
  );
  list.querySelectorAll('[data-action="download"]').forEach((el) =>
    el.addEventListener("click", () => downloadFile(el.dataset.path))
  );
  list.querySelectorAll('[data-action="delete"]').forEach((el) =>
    el.addEventListener("click", async () => {
      const ok = await showConfirm(`Delete "${el.dataset.path}"?`, "Delete File");
      if (!ok) return;
      delete currentFiles[el.dataset.path];
      saveProjectFiles(currentProjectId, currentFiles);
      renderFileList();
      addSystemMsg(`Deleted: ${el.dataset.path}`);
    })
  );
}

// Resolves a relative href/src (e.g. "style.css", "./js/script.js", "../shared/style.css")
// against the folder the given HTML file lives in, so imports/multi-file projects with
// folder structure (e.g. "New folder/index.html" + "New folder/style.css") still match up.
function resolveRelativePath(htmlPath, ref) {
  if (/^https?:\/\//i.test(ref) || ref.startsWith("//")) return null; // external, leave alone
  const htmlDir = htmlPath.includes("/") ? htmlPath.slice(0, htmlPath.lastIndexOf("/")) : "";
  const parts = (htmlDir ? htmlDir.split("/") : []).concat(ref.split("/"));
  const stack = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

// Builds a fully self-contained HTML document for the iframe preview by inlining any
// same-project <link rel="stylesheet"> and <script src="..."> the HTML references.
// srcdoc iframes have no real base URL, so a plain relative href/src (style.css, script.js)
// can never resolve on its own — this is what was breaking preview for every multi-file
// project (Snake Rush, calculator, imported folders, etc): the HTML rendered with no CSS
// and no JS because the browser looked for those files at the app's own root, not the
// project's virtual folder.
function inlineProjectAssets(htmlPath, htmlContent) {
  let out = htmlContent;

  out = out.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>|<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi,
    (match, hrefA, hrefB) => {
      const href = hrefA || hrefB;
      const resolved = resolveRelativePath(htmlPath, href);
      if (resolved && currentFiles[resolved] !== undefined) {
        return `<style>\n${currentFiles[resolved]}\n</style>`;
      }
      return match; // leave untouched (external URL, or file not in project — don't silently drop it)
    }
  );

  out = out.replace(
    /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi,
    (match, before, src, after) => {
      const resolved = resolveRelativePath(htmlPath, src);
      if (resolved && currentFiles[resolved] !== undefined) {
        return `<script${before}${after}>\n${currentFiles[resolved]}\n</script>`;
      }
      return match;
    }
  );

  // Safety net: AI-generated code very often reads localStorage at the top level of the
  // script (high scores, saved settings) before any try/catch of its own exists yet. If
  // storage access ever throws in the preview sandbox, that exception kills the *entire*
  // script with nothing rendering — the game looked "connected" (CSS applied) but blank,
  // which is exactly what was happening here. A tiny in-memory fallback keeps the rest of
  // the script running even in that edge case, on top of the sandbox now allowing real storage.
  const storageShim = `<script>
(function(){
  function memoryStorage(){var d={};return{getItem:function(k){return d.hasOwnProperty(k)?d[k]:null;},setItem:function(k,v){d[k]=String(v);},removeItem:function(k){delete d[k];},clear:function(){d={};},key:function(i){return Object.keys(d)[i]||null;},get length(){return Object.keys(d).length;}};}
  try { window.localStorage.setItem('__t','1'); window.localStorage.removeItem('__t'); }
  catch(e) { try { Object.defineProperty(window,'localStorage',{value:memoryStorage(),configurable:true}); } catch(e2){} }
  try { window.sessionStorage.setItem('__t','1'); window.sessionStorage.removeItem('__t'); }
  catch(e) { try { Object.defineProperty(window,'sessionStorage',{value:memoryStorage(),configurable:true}); } catch(e2){} }
})();
<\/script>`;
  out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${storageShim}`);

  // Multi-page support: if this HTML links to another HTML file in the project
  // (e.g. <a href="about.html">), intercept clicks on it so the preview can navigate
  // between project pages instead of failing (srcdoc has no real navigation target).
  const navScript = `<script>
document.addEventListener('click', function(e) {
  var a = e.target.closest('a');
  if (!a) return;
  var href = a.getAttribute('href');
  if (!href || /^https?:\\/\\//.test(href) || href.startsWith('#')) return;
  e.preventDefault();
  window.parent.postMessage({ type: 'codeagent-navigate', href: href, from: ${JSON.stringify(htmlPath)} }, '*');
});
<\/script>`;
  out = out.replace(/<\/body>/i, `${navScript}</body>`);

  return out;
}

// Finds an HTML file in the project that actually references the given CSS/JS path,
// so previewing a non-HTML file shows the real page it belongs to instead of either
// crashing (raw JS with no DOM to attach to) or a fake sample page (CSS alone).
function findHtmlUsingAsset(assetPath) {
  const htmlFiles = Object.keys(currentFiles).filter((p) => /\.html?$/i.test(p));
  const assetName = assetPath.split("/").pop();
  for (const htmlPath of htmlFiles) {
    const html = currentFiles[htmlPath];
    // cheap check: does this HTML reference the asset by filename (handles relative paths
    // like "./style.css", "../shared/script.js", etc. without needing full resolution here)
    if (html.includes(assetName)) {
      const resolved = resolveRelativePath(htmlPath, assetName);
      // confirm it actually resolves to this exact asset, not a same-named file elsewhere
      if (resolved === assetPath || html.includes(assetPath)) return htmlPath;
    }
  }
  return null;
}

function openPreviewModal(path) {
  const content = currentFiles[path];
  if (content === undefined) return showToast("File not found");
  const ext = path.split(".").pop().toLowerCase();
  let srcDoc;

  if (ext === "html") {
    srcDoc = inlineProjectAssets(path, content);
  } else if (ext === "css" || ext === "js") {
    const hostHtml = findHtmlUsingAsset(path);
    if (hostHtml) {
      // Show the real page this file belongs to — this is what the user actually wants
      // to see when they tap "preview" on a CSS/JS file: its effect in context.
      srcDoc = inlineProjectAssets(hostHtml, currentFiles[hostHtml]);
      $("previewFileName").textContent = `${path} — via ${hostHtml}`;
      $("previewFrame").srcdoc = srcDoc;
      const modal = $("previewModal");
      modal.dataset.currentPath = path;
      modal.classList.remove("hidden");
      requestAnimationFrame(() => modal.classList.add("show"));
      return;
    }
    // No HTML in the project uses this file — running raw JS standalone would crash on
    // any DOM access (getElementById, addEventListener, etc. all return null with nothing
    // to attach to), so show a read-only code view instead of pretending to execute it.
    openCodeViewModal(path);
    return;
  } else {
    openCodeViewModal(path);
    return;
  }

  $("previewFileName").textContent = path;
  $("previewFrame").srcdoc = srcDoc;
  const modal = $("previewModal");
  modal.dataset.currentPath = path;
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("show"));
}

function closePreviewModal() {
  const modal = $("previewModal");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 220);
}

// ---------- CODE VIEW / MANUAL EDIT ----------
// Used for files that can't be meaningfully live-previewed (JS with no host HTML, JSON,
// config files, etc.) and doubles as a manual-edit escape hatch — not everything needs
// to go through the AI; sometimes a quick manual fix is faster and costs zero tokens.
function openCodeViewModal(path) {
  const content = currentFiles[path];
  if (content === undefined) return showToast("File not found");
  $("codeViewFileName").textContent = path;
  $("codeViewTextarea").value = content;
  $("codeViewTextarea").dataset.originalContent = content;
  $("codeViewTextarea").dataset.path = path;
  setCodeViewEditing(false);
  const modal = $("codeViewModal");
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("show"));
}
function closeCodeViewModal() {
  const modal = $("codeViewModal");
  const textarea = $("codeViewTextarea");
  if (!textarea.readOnly && textarea.value !== textarea.dataset.originalContent) {
    // there are unsaved edits — this is handled by the Save/Cancel buttons, not silently
    // discarded, so just closing without saving is treated as an explicit cancel here.
  }
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 220);
}
function setCodeViewEditing(editing) {
  const textarea = $("codeViewTextarea");
  textarea.readOnly = !editing;
  $("codeViewEditBtn").classList.toggle("hidden", editing);
  $("codeViewSaveBtn").classList.toggle("hidden", !editing);
  $("codeViewCancelEditBtn").classList.toggle("hidden", !editing);
  textarea.classList.toggle("editing", editing);
}
function saveCodeViewEdit() {
  const textarea = $("codeViewTextarea");
  const path = textarea.dataset.path;
  const before = currentFiles[path];
  const after = textarea.value;
  if (before !== after) {
    recordFileSnapshot(currentProjectId, path, before, "manual edit");
    currentFiles[path] = after;
    saveProjectFiles(currentProjectId, currentFiles);
    renderFileList();
    showToast(`${path} saved`);
  }
  textarea.dataset.originalContent = after;
  setCodeViewEditing(false);
}
function cancelCodeViewEdit() {
  const textarea = $("codeViewTextarea");
  textarea.value = textarea.dataset.originalContent;
  setCodeViewEditing(false);
}

// Multi-page preview: when a link inside the preview iframe points to another HTML file
// in this project, navigate the preview to it instead of doing nothing (srcdoc iframes
// can't follow relative links on their own — see inlineProjectAssets' injected nav script).
window.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "codeagent-navigate") return;
  const resolved = resolveRelativePath(e.data.from, e.data.href);
  if (resolved && currentFiles[resolved] !== undefined) {
    openPreviewModal(resolved);
  } else {
    showToast(`Page "${e.data.href}" not found in project`);
  }
});

function openDiffModal(path) {
  const history = loadFileHistory(currentProjectId);
  const stack = history[path];
  if (!stack || !stack.length) return showToast("No earlier version to compare");
  const previous = stack[stack.length - 1];
  const current = currentFiles[path] || "";
  const diffLines = computeLineDiff(previous.content, current);

  const html = diffLines.map((line) => {
    const cls = line.type === "added" ? "diff-added" : line.type === "removed" ? "diff-removed" : "diff-same";
    const prefix = line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
    return `<div class="diff-line ${cls}"><span class="diff-prefix">${prefix}</span><span class="diff-text">${escapeHtml(line.text)}</span></div>`;
  }).join("");

  $("diffFileName").textContent = path;
  $("diffContent").innerHTML = html || `<p style="color:var(--text-dim);padding:10px;">No differences</p>`;
  const modal = $("diffModal");
  modal.dataset.currentPath = path;
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("show"));
}
function closeDiffModal() {
  const modal = $("diffModal");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 220);
}

function downloadFile(path) {
  const content = currentFiles[path];
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = path.split("/").pop();
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadZip() {
  const paths = Object.keys(currentFiles);
  if (!paths.length) return showAlert("Koi file nahi hai project mein.", "Zip Download");
  const zip = new JSZip();
  paths.forEach((p) => zip.file(p, currentFiles[p]));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const meta = listProjects()[currentProjectId];
  a.download = `${(meta?.name || "project").replace(/\s+/g, "_")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- LIGHTWEIGHT MARKDOWN RENDERER ----------
// Small, dependency-free markdown -> HTML for chat bubbles. Handles: bold, italic,
// inline code, code blocks, headings, unordered/ordered lists, links, paragraphs.
function renderMarkdown(text) {
  if (!text) return "";

  // Escape HTML first so nothing injects
  let src = escapeHtml(text);

  // Extract fenced code blocks first so their content isn't touched by other rules
  const codeBlocks = [];
  src = src.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`);
    return `%%CODEBLOCK${codeBlocks.length - 1}%%`;
  });

  // Split into lines for block-level parsing (headings, lists, paragraphs)
  const lines = src.split("\n");
  const htmlParts = [];
  let listBuffer = [];
  let listType = null; // 'ul' | 'ol'

  function flushList() {
    if (listBuffer.length) {
      htmlParts.push(`<${listType}>${listBuffer.join("")}</${listType}>`);
      listBuffer = [];
      listType = null;
    }
  }

  function inline(str) {
    // bold **text**
    str = str.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // italic *text* (avoid matching leftover ** pairs)
    str = str.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
    // inline code `code`
    str = str.replace(/`([^`]+?)`/g, "<code>$1</code>");
    // links [text](url)
    str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return str;
  }

  for (let rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    if (/^%%CODEBLOCK\d+%%$/.test(trimmed)) {
      flushList();
      htmlParts.push(trimmed);
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.*)/);
    const h2 = trimmed.match(/^##\s+(.*)/);
    const h1 = trimmed.match(/^#\s+(.*)/);
    if (h3) { flushList(); htmlParts.push(`<h3>${inline(h3[1])}</h3>`); continue; }
    if (h2) { flushList(); htmlParts.push(`<h2>${inline(h2[1])}</h2>`); continue; }
    if (h1) { flushList(); htmlParts.push(`<h1>${inline(h1[1])}</h1>`); continue; }

    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    const olMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (ulMatch) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listBuffer.push(`<li>${inline(ulMatch[1])}</li>`);
      continue;
    }
    if (olMatch) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listBuffer.push(`<li>${inline(olMatch[1])}</li>`);
      continue;
    }

    flushList();
    if (trimmed === "") {
      continue; // blank line = paragraph break, handled by wrapping below
    }
    htmlParts.push(`<p>${inline(line)}</p>`);
  }
  flushList();

  let html = htmlParts.join("");
  // Restore code blocks
  html = html.replace(/%%CODEBLOCK(\d+)%%/g, (_, i) => codeBlocks[Number(i)]);
  return html;
}

// ---------- CHAT RENDER ----------
function renderChatLog() {
  const log = $("chatLog");
  $("emptyState").classList.toggle("hidden", currentChat.length > 0);
  log.querySelectorAll(".msg").forEach((el) => el.remove());
  currentChat.forEach((m) =>
    appendMsgToDom(m.role, m.content, m.fileChips, { id: m.id, ts: m.ts, feedback: m.feedback })
  );
  log.scrollTop = log.scrollHeight;
}

function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function appendMsgToDom(role, content, fileChips, meta) {
  meta = meta || {};
  const log = $("chatLog");
  $("emptyState").classList.add("hidden");

  const div = document.createElement("div");
  div.className = `msg ${role}`;
  if (meta.id) div.dataset.msgId = meta.id;

  // content
  const contentEl = document.createElement("div");
  if (role === "bot") {
    contentEl.className = "msg-content";
    contentEl.innerHTML = renderMarkdown(content);
  } else {
    contentEl.className = "msg-content-plain";
    contentEl.textContent = content;
  }
  div.appendChild(contentEl);

  // file chips (with inline download/copy/diff/undo)
  if (fileChips && fileChips.length) {
    fileChips.forEach((path) => {
      const row = document.createElement("div");
      row.className = "file-chip-row";
      const showDiffUndo = hasHistory(path);
      row.innerHTML = `
        <button class="file-chip-name" data-action="open">${ICON.file} <span>${escapeHtml(path)}</span></button>
        <div class="file-chip-actions">
          ${showDiffUndo ? `<button class="chip-action-btn" data-action="diff" title="View changes">${ICON.diff}</button>` : ""}
          ${showDiffUndo ? `<button class="chip-action-btn" data-action="undo" title="Undo this edit">${ICON.undo}</button>` : ""}
          <button class="chip-action-btn" data-action="code" title="View/edit code">${ICON.code}</button>
          <button class="chip-action-btn" data-action="copy" title="Copy">${ICON.copy}</button>
          <button class="chip-action-btn" data-action="download" title="Download">${ICON.download}</button>
        </div>`;
      row.querySelector('[data-action="open"]').addEventListener("click", () => openPreviewModal(path));
      row.querySelector('[data-action="code"]').addEventListener("click", () => openCodeViewModal(path));
      row.querySelector('[data-action="copy"]').addEventListener("click", () => copyFileContent(path));
      row.querySelector('[data-action="download"]').addEventListener("click", () => downloadFile(path));
      const diffBtn = row.querySelector('[data-action="diff"]');
      if (diffBtn) diffBtn.addEventListener("click", () => openDiffModal(path));
      const undoBtn = row.querySelector('[data-action="undo"]');
      if (undoBtn) undoBtn.addEventListener("click", async () => {
        const ok = await showConfirm(`Undo the last change to "${path}"?`, "Undo Edit");
        if (!ok) return;
        if (undoFileChange(path)) {
          renderFileList();
          showToast(`${path} reverted`);
        } else {
          showToast("No earlier version found");
        }
      });
      div.appendChild(row);
    });
  }

  // USER bubble: timestamp only, no action row (keeps the bubble small and quiet)
  if (role === "user") {
    const timeEl = document.createElement("span");
    timeEl.className = "msg-time-only";
    timeEl.textContent = formatTime(meta.ts);
    div.appendChild(timeEl);
  }

  // BOT panel: full action row — time, copy, share, like/dislike (matches Claude-style layout)
  if (role === "bot") {
    const footer = document.createElement("div");
    footer.className = "msg-footer";
    const timeStr = formatTime(meta.ts);
    footer.innerHTML = `
      <span class="msg-time">${timeStr}</span>
      <button class="msg-action-btn" data-action="copy-msg" title="Copy">${ICON.copy}</button>
      <button class="msg-action-btn" data-action="share-msg" title="Share">${ICON.share}</button>
      <button class="msg-action-btn like-btn" data-action="like" title="Like">${ICON.thumbsUp}</button>
      <button class="msg-action-btn dislike-btn" data-action="dislike" title="Dislike">${ICON.thumbsDown}</button>`;

    footer.querySelector('[data-action="copy-msg"]').addEventListener("click", () => copyText(content, "Message"));
    footer.querySelector('[data-action="share-msg"]').addEventListener("click", () => shareText(content));

    const likeBtn = footer.querySelector(".like-btn");
    const dislikeBtn = footer.querySelector(".dislike-btn");
    if (meta.feedback === "like") likeBtn.classList.add("active-like");
    if (meta.feedback === "dislike") dislikeBtn.classList.add("active-dislike");
    likeBtn.addEventListener("click", () => setFeedback(meta.id, "like", likeBtn, dislikeBtn));
    dislikeBtn.addEventListener("click", () => setFeedback(meta.id, "dislike", dislikeBtn, likeBtn));

    div.appendChild(footer);
  }

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function setFeedback(msgId, kind, activeBtn, otherBtn) {
  const already = activeBtn.classList.contains(kind === "like" ? "active-like" : "active-dislike");
  activeBtn.classList.remove("active-like", "active-dislike");
  otherBtn.classList.remove("active-like", "active-dislike");
  const newVal = already ? null : kind;
  if (!already) activeBtn.classList.add(kind === "like" ? "active-like" : "active-dislike");

  // persist into chat history
  const m = currentChat.find((c) => c.id === msgId);
  if (m) {
    m.feedback = newVal;
    saveChat(currentProjectId, currentChat, chatSummary);
  }
  if (newVal) showToast(kind === "like" ? "Thanks for the feedback" : "Thanks, will improve");
}

function copyText(text, label = "Text") {
  navigator.clipboard?.writeText(text).then(
    () => showToast(`${label} copied`),
    () => showToast("Copy failed")
  );
}

function copyFileContent(path) {
  const content = currentFiles[path];
  if (content === undefined) return showToast("File not found");
  copyText(content, path);
}

async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch (e) {
      /* user cancelled share sheet — no-op */
    }
  } else {
    copyText(text, "Message");
  }
}

let toastTimer = null;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.classList.add("hidden"), 200);
  }, 1800);
}

function addSystemMsg(text) {
  const log = $("chatLog");
  $("emptyState").classList.add("hidden");
  const div = document.createElement("div");
  div.className = "msg system";
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function showTyping() {
  const log = $("chatLog");
  const div = document.createElement("div");
  div.className = "msg bot typing";
  div.id = "typingIndicator";
  div.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}
function hideTyping() {
  $("typingIndicator")?.remove();
}

// ---------- LIVE STATUS / PROGRESS TRACKING ----------
// Shows a running status bubble (like "Thinking...", "Creating x.js...") so the user
// can see the agent is actively working, not stuck.
let statusEl = null;

function pushStatus(text) {
  const log = $("chatLog");
  $("emptyState").classList.add("hidden");
  statusEl = document.createElement("div");
  statusEl.className = "msg status";
  const isFileOp = /^(Creating|Editing|Created|Updated|Edit skipped)/.test(text);
  const textHtml = isFileOp
    ? `${ICON.file}<span>${escapeHtml(text)}</span>`
    : escapeHtml(text);
  statusEl.innerHTML = `<span class="status-spinner"></span><span class="status-text${isFileOp ? " status-file-op" : ""}">${textHtml}</span>`;
  log.appendChild(statusEl);
  log.scrollTop = log.scrollHeight;
  return statusEl;
}

function updateStatus(text, done = false) {
  if (!statusEl) {
    pushStatus(text);
    return;
  }
  const textEl = statusEl.querySelector(".status-text");
  if (textEl) {
    const isFileOp = /^(Creating|Editing|Created|Updated|Edit skipped)/.test(text);
    textEl.innerHTML = isFileOp ? `${ICON.file}<span>${text}</span>` : escapeHtml(text);
    textEl.classList.toggle("status-file-op", isFileOp);
  }
  if (done) {
    statusEl.classList.add("done");
    const spinner = statusEl.querySelector(".status-spinner");
    if (spinner) spinner.outerHTML = `<span class="status-check">${ICON.check}</span>`;
  }
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
}

function finishStatus(finalText) {
  if (statusEl) {
    updateStatus(finalText, true);
    // freeze this bubble in place (it becomes part of history-visible log, not removed)
    statusEl = null;
  }
}

function clearStatus() {
  statusEl?.remove();
  statusEl = null;
}

// ---------- INTENT ROUTING (local, no LLM cost) ----------
// Returns a handled=true if it fully handled the message locally.
function tryLocalIntent(text) {
  const t = text.trim().toLowerCase();

  // naya project banao
  if (/^(naya|new)\s+project/.test(t) || /create\s+(a\s+)?new\s+project/.test(t)) {
    showPrompt("Project ka naam?", "My Project", "New Project").then((name) => {
      if (name) createProject(name);
    });
    return true;
  }

  // list files
  if (/^(list|show)\s+files?$/.test(t) || /files?\s+dikhao/.test(t) || /list\s+all\s+files/.test(t)) {
    const paths = Object.keys(currentFiles);
    addSystemMsg(paths.length ? `Files:\n${paths.join("\n")}` : "Koi file nahi hai abhi.");
    return true;
  }

  // delete this file / delete <filename>
  let m = t.match(/delete\s+(?:this\s+file|file\s+)?["']?([\w./-]+\.\w+)["']?/);
  if (m) {
    const target = m[1];
    const match = Object.keys(currentFiles).find((p) => p === target || p.endsWith("/" + target));
    if (match) {
      delete currentFiles[match];
      saveProjectFiles(currentProjectId, currentFiles);
      renderFileList();
      addSystemMsg(`Deleted: ${match}`);
    } else {
      addSystemMsg(`File "${target}" nahi mili.`);
    }
    return true;
  }
  if (/^delete\s+this\s+file$/.test(t)) {
    const openPath = $("previewModal").dataset.currentPath;
    if (openPath && currentFiles[openPath] !== undefined) {
      delete currentFiles[openPath];
      saveProjectFiles(currentProjectId, currentFiles);
      renderFileList();
      addSystemMsg(`Deleted: ${openPath}`);
    } else {
      addSystemMsg("Pehle koi file preview mein kholo (Files → 👁).");
    }
    return true;
  }

  // clear chat
  if (/^clear\s+chat$/.test(t) || /chat\s+clear\s+karo/.test(t)) {
    currentChat = [];
    chatSummary = "";
    saveChat(currentProjectId, currentChat, chatSummary);
    renderChatLog();
    return true;
  }

  // download zip
  if (/^(download|zip)\b/.test(t) && /zip|project/.test(t)) {
    downloadZip();
    return true;
  }

  return false; // not handled locally -> goes to LLM
}

// ---------- CHAT HISTORY TRIMMING ----------
function buildTrimmedMessages() {
  // Keep the most recent messages up to ~4000 chars OR 6 messages, whichever is smaller —
  // short replies like "ok"/"haan" barely cost anything, so this avoids paying for 6 long
  // technical messages when 3-4 would carry the same context at a fraction of the tokens.
  const CHAR_BUDGET = 4000;
  const MAX_COUNT = 6;
  const recent = currentChat.slice(-MAX_COUNT);
  let totalChars = 0;
  const kept = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const len = recent[i].content.length;
    if (kept.length > 0 && totalChars + len > CHAR_BUDGET) break; // always keep at least the latest one
    totalChars += len;
    kept.unshift(recent[i]);
  }
  return kept.map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));
}

// Heuristic: does this message plausibly need the current project's file content sent
// along with it? Generic questions ("explain closures", "hi", "what's a promise") don't
// need 18k chars of file context riding along — only send it when the message references
// a file by name/extension, or uses action verbs that imply working on existing code.
function messageNeedsFileContext(text) {
  const t = text.toLowerCase();
  const paths = Object.keys(currentFiles);
  // mentions an actual file name from the project
  if (paths.some((p) => t.includes(p.toLowerCase()) || t.includes(p.split("/").pop().toLowerCase()))) return true;
  // mentions a code file extension generically
  if (/\.(html?|css|js|jsx|tsx?|py|json)\b/.test(t)) return true;
  // action verbs that imply modifying/looking at existing code
  if (/\b(fix|edit|update|change|add|remove|delete|refactor|debug|improve|isme|ismein|iska|isko|ye|yeh)\b/.test(t)) return true;
  // very first message in a project that already has files — safe default to include
  if (paths.length && currentChat.filter((m) => m.role === "user").length <= 1) return true;
  return false;
}

function buildFileContext(text) {
  const paths = Object.keys(currentFiles);
  if (!paths.length) return "";
  if (text !== undefined && !messageNeedsFileContext(text)) return ""; // save the tokens

  // Prioritize files the user's latest message actually names (e.g. "script.js mein fix karo")
  // so if we do have to cut something for size, it's the least-relevant file, not the one being edited.
  const lastUserMsg = [...currentChat].reverse().find((m) => m.role === "user");
  const mentioned = lastUserMsg
    ? paths.filter((p) => lastUserMsg.content.toLowerCase().includes(p.toLowerCase()))
    : [];
  const rest = paths.filter((p) => !mentioned.includes(p));
  const ordered = [...mentioned, ...rest];

  const CAP = 18000; // free models here have large context windows; 6000 was cutting files mid-content
  let out = "";
  for (const p of ordered) {
    const block = `--- ${p} ---\n${currentFiles[p]}\n\n`;
    if (out.length + block.length > CAP) {
      out += `--- ${p} --- (omitted for space, ${currentFiles[p].length} chars)\n\n`;
      continue;
    }
    out += block;
  }
  return out.trim();
}

async function maybeSummarize() {
  // Fold older turns into a proper summary once the chat grows past 8 messages, so long
  // conversations don't silently lose context via crude truncation. This costs one extra
  // small API call only when the threshold is crossed — not on every message — and the
  // summarization prompt itself is short, so the token cost is minor compared to what it
  // saves by not re-sending the full raw history forever.
  if (currentChat.length <= 8) return;

  const toFold = currentChat.slice(0, currentChat.length - 6);
  const foldedText = toFold.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 6000);

  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priorSummary: chatSummary,
        newTurns: foldedText,
      }),
    });
    const data = await res.json();
    if (data.ok && data.summary) {
      chatSummary = data.summary.slice(0, 1500);
      currentChat = currentChat.slice(-6);
      return;
    }
  } catch (e) {
    console.warn("Summarization call failed, falling back to local fold:", e);
  }

  // Fallback if the summarize endpoint fails for any reason — keep the old crude-but-safe
  // behavior so a chat never gets stuck un-trimmed.
  const folded = toFold.map((m) => `${m.role}: ${m.content}`).join(" | ").slice(0, 500);
  chatSummary = (chatSummary ? chatSummary + " " : "") + folded;
  chatSummary = chatSummary.slice(-1500);
  currentChat = currentChat.slice(-6);
}

// ---------- APPLY LLM FILE OPS ----------
// Returns { touched: [paths actually changed], failed: [paths where an edit snippet didn't match] }
function applyFileOps(files) {
  const touched = [];
  const failed = [];
  for (const f of files) {
    if (!f.path) continue;
    const before = currentFiles[f.path]; // undefined if brand-new
    if (f.action === "create" || (f.action === "edit" && f.content && !currentFiles[f.path])) {
      if (before !== undefined) recordFileSnapshot(currentProjectId, f.path, before, "recreated");
      currentFiles[f.path] = f.content ?? "";
      touched.push(f.path);
    } else if (f.action === "edit") {
      let content = currentFiles[f.path];
      if (content === undefined) {
        // file doesn't exist yet, fall back to content if given
        content = f.content ?? "";
        touched.push(f.path);
      } else if (Array.isArray(f.edits) && f.edits.length) {
        let fileChanged = false;
        let fileHadMiss = false;
        for (const e of f.edits) {
          if (e.find && content.includes(e.find)) {
            content = content.replace(e.find, e.replace ?? "");
            fileChanged = true;
          } else if (e.find) {
            console.warn(`Edit snippet not found in ${f.path}:`, e.find);
            fileHadMiss = true;
          }
        }
        if (fileChanged) {
          recordFileSnapshot(currentProjectId, f.path, before, "AI edit");
          touched.push(f.path);
        }
        if (fileHadMiss) failed.push(f.path);
      } else if (f.content) {
        recordFileSnapshot(currentProjectId, f.path, before, "AI edit");
        content = f.content;
        touched.push(f.path);
      }
      currentFiles[f.path] = content;
    }
  }
  if (touched.length) saveProjectFiles(currentProjectId, currentFiles);
  return { touched, failed };
}

// ---------- SEND MESSAGE ----------
let currentRequestController = null; // AbortController for the in-flight sendMessage call, so Stop can actually cancel it

async function sendMessage() {
  const input = $("chatInput");
  const text = input.value.trim();
  if (!text) return;
  if (!currentProjectId) {
    createProject("My Project");
  }

  input.value = "";
  autoResize();

  const userMsg = { role: "user", content: text, id: genId(), ts: Date.now() };
  currentChat.push(userMsg);
  appendMsgToDom("user", text, null, { id: userMsg.id, ts: userMsg.ts });
  saveChat(currentProjectId, currentChat, chatSummary);

  // 1) try local intent first (saves LLM cost)
  if (tryLocalIntent(text)) {
    $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
    return;
  }

  // 2) otherwise call LLM (streaming)
  currentRequestController = new AbortController();
  setSendingState(true);
  pushStatus("Samajh raha hoon...");

  let streamingBubble = null; // becomes a live "typing" content element once text starts arriving
  let partialTextSoFar = ""; // function-scoped so the catch block (on Stop/abort) can still read it

  function ensureStreamingBubble() {
    if (streamingBubble) return streamingBubble;
    clearStatus(); // replace the spinner bubble with the actual live text bubble
    const log = $("chatLog");
    $("emptyState").classList.add("hidden");
    const div = document.createElement("div");
    div.className = "msg bot streaming";
    const contentEl = document.createElement("div");
    contentEl.className = "msg-content";
    div.appendChild(contentEl);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    streamingBubble = { div, contentEl };
    return streamingBubble;
  }

  try {
    await maybeSummarize();

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: buildTrimmedMessages(),
        summary: chatSummary,
        fileContext: buildFileContext(text),
        stream: true,
      }),
      signal: currentRequestController.signal,
    });

    if (!res.body) throw new Error("No response body (streaming unsupported)");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalData = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop();

      for (const chunk of chunks) {
        const eventMatch = chunk.match(/^event:\s*(.+)$/m);
        const dataMatch = chunk.match(/^data:\s*(.+)$/m);
        if (!eventMatch || !dataMatch) continue;
        const eventType = eventMatch[1].trim();
        let payload;
        try { payload = JSON.parse(dataMatch[1]); } catch { continue; }

        if (eventType === "partial") {
          partialTextSoFar = payload.text || "";
          const bubble = ensureStreamingBubble();
          bubble.contentEl.innerHTML = renderMarkdown(partialTextSoFar);
          $("chatLog").scrollTop = $("chatLog").scrollHeight;
        } else if (eventType === "final") {
          finalData = payload;
        }
      }
    }

    if (!finalData) {
      // Stream ended with no final event — either the connection dropped, or (more likely
      // here) the user hit Stop, which aborts the reader and lands us in the catch block
      // below instead, not this branch. Treat this as a soft failure either way.
      if (partialTextSoFar) {
        // We at least have partial text the user saw — keep it as the saved message rather
        // than discarding it, since re-asking from scratch wastes the tokens already spent.
        finalData = { ok: true, reply: partialTextSoFar, files: [] };
      } else {
        throw new Error("Stream ended without a final result");
      }
    }
    const data = finalData;

    const replyText = data.reply || "…";
    const filesToApply = data.files || [];

    // Remove the temporary streaming bubble now — the real, fully-formed bot message
    // (with footer, file chips, etc.) replaces it below via the normal appendMsgToDom path.
    if (streamingBubble) streamingBubble.div.remove();

    if (filesToApply.length) {
      let anyEditFailed = false;
      for (const f of filesToApply) {
        const isNewFile = !(f.path in currentFiles) || f.action === "create";
        const verb = isNewFile ? "Creating" : "Editing";
        updateStatus(`${verb} ${escapeHtml(f.path)}...`);
        await sleep(500); // long enough to actually read, not just flash past
        const result = applyFileOps([f]);
        if (result.failed.length) anyEditFailed = true;
        const doneVerb = isNewFile ? "Created" : "Updated";
        const label = result.failed.length
          ? `Edit skipped (no match): ${escapeHtml(f.path)}`
          : `${doneVerb} ${escapeHtml(f.path)}`;
        updateStatus(label);
        await sleep(250); // brief pause on the completed state too, before moving to the next file
      }
      finishStatus(anyEditFailed ? "Done — with a skipped edit" : "Done");
      renderFileList();
      $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
    } else {
      clearStatus();
    }

    const touchedFiles = filesToApply.map((f) => f.path);
    const botMsg = { role: "bot", content: replyText, fileChips: touchedFiles, id: genId(), ts: Date.now() };
    currentChat.push(botMsg);
    saveChat(currentProjectId, currentChat, chatSummary);
    appendMsgToDom("bot", replyText, touchedFiles, { id: botMsg.id, ts: botMsg.ts });
  } catch (e) {
    if (streamingBubble) streamingBubble.div.remove();
    if (e.name === "AbortError") {
      // User pressed Stop — save whatever text had already streamed in (if any) rather
      // than discarding it, since tokens for that partial response were already spent.
      const partialContent = partialTextSoFar
        ? partialTextSoFar + "\n\n_[Stopped by user]_"
        : "_[Stopped by user]_";
      const stoppedMsg = { role: "bot", content: partialContent, id: genId(), ts: Date.now() };
      currentChat.push(stoppedMsg);
      saveChat(currentProjectId, currentChat, chatSummary);
      appendMsgToDom("bot", partialContent, null, { id: stoppedMsg.id, ts: stoppedMsg.ts });
    } else {
      const msg = "Connection issue — phir se try karo.";
      const errMsg = { role: "bot", content: msg, id: genId(), ts: Date.now() };
      currentChat.push(errMsg);
      saveChat(currentProjectId, currentChat, chatSummary);
      appendMsgToDom("bot", msg, null, { id: errMsg.id, ts: errMsg.ts });
    }
  } finally {
    clearStatus();
    setSendingState(false);
    currentRequestController = null;
  }
}

// Toggles the input bar between "send mode" and "sending mode" (send button becomes a
// Stop button while a request is in flight, so the user can cancel instead of being
// stuck waiting for something they realize mid-request they want to change).
function setSendingState(isSending) {
  const sendBtn = $("sendBtn");
  sendBtn.classList.toggle("sending", isSending);
  if (isSending) sendBtn.classList.remove("hidden-btn");
  sendBtn.disabled = false; // never actually disabled — during sending, tapping it stops instead
  sendBtn.setAttribute("aria-label", isSending ? "Stop" : "Send");
  sendBtn.innerHTML = isSending
    ? `<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`
    : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
  if (!isSending) updateSendMicToggle(); // restore mic/send visibility logic based on input content
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- UI HELPERS ----------
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) {
  return s.replace(/"/g, "&quot;");
}

function openDrawer() {
  try {
    renderProjectList();
  } catch (e) {
    console.error("renderProjectList failed:", e);
    // Don't let a data problem prevent the drawer from opening at all —
    // show an error state inside it instead of nothing happening on tap.
    const list = $("projectList");
    if (list) list.innerHTML = `<p style="color:var(--text-dim);font-size:13px;padding:10px;">Kuch error aaya projects load karte waqt.</p>`;
  }
  const drawer = $("drawer");
  const overlay = $("drawerOverlay");
  drawer.classList.remove("hidden");
  overlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    drawer.classList.add("show");
    overlay.classList.add("show");
  });
}
function closeDrawer() {
  const drawer = $("drawer");
  const overlay = $("drawerOverlay");
  drawer.classList.remove("show");
  overlay.classList.remove("show");
  setTimeout(() => {
    drawer.classList.add("hidden");
    overlay.classList.add("hidden");
  }, 280);
}
function openFilesPanel() {
  try {
    renderFileList();
  } catch (e) {
    console.error("renderFileList failed:", e);
    const list = $("fileList");
    if (list) list.innerHTML = `<p style="color:var(--text-dim);font-size:13px;padding:10px;">Kuch error aaya files load karte waqt.</p>`;
  }
  const panel = $("filesPanel");
  const overlay = $("filesOverlay");
  panel.classList.remove("hidden");
  overlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    panel.classList.add("show");
    overlay.classList.add("show");
  });
}
function closeFilesPanel() {
  const panel = $("filesPanel");
  const overlay = $("filesOverlay");
  panel.classList.remove("show");
  overlay.classList.remove("show");
  setTimeout(() => {
    panel.classList.add("hidden");
    overlay.classList.add("hidden");
  }, 280);
}

function autoResize() {
  const el = $("chatInput");
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
  updateSendMicToggle();
}

function updateSendMicToggle() {
  const sendBtn = $("sendBtn");
  if (sendBtn.classList.contains("sending")) return; // Stop button stays visible regardless of input text
  const hasText = $("chatInput").value.trim().length > 0;
  const micBtn = $("micBtn");
  if (hasText) {
    sendBtn.classList.remove("hidden-btn");
    if (!micBtn.classList.contains("unsupported")) micBtn.style.display = "none";
  } else {
    sendBtn.classList.add("hidden-btn");
    if (!micBtn.classList.contains("unsupported")) micBtn.style.display = "flex";
  }
}

// ---------- VOICE INPUT ----------
// Uses the Web Speech API (supported in Chrome on Android, which covers this app's
// primary phone-browser use case). Silently hides the mic button where unsupported
// rather than showing a broken control.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

function initVoiceInput() {
  const micBtn = $("micBtn");
  if (!SpeechRecognitionAPI) {
    micBtn.classList.add("unsupported");
    return;
  }
  recognition = new SpeechRecognitionAPI();
  recognition.continuous = false;
  recognition.interimResults = true;
  // "hi-IN" recognizes Hindi/Hinglish speech reasonably well on Android Chrome; falls
  // back gracefully to English-only recognition on browsers that don't support it well.
  recognition.lang = "hi-IN";

  recognition.onresult = (e) => {
    let transcript = "";
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    $("chatInput").value = transcript;
    autoResize();
  };
  recognition.onerror = (e) => {
    console.warn("Speech recognition error:", e.error);
    stopListening();
    if (e.error === "not-allowed") showToast("Microphone access denied");
  };
  recognition.onend = () => stopListening();

  micBtn.addEventListener("click", () => {
    if (isListening) stopListening();
    else startListening();
  });
}

function startListening() {
  if (!recognition) return;
  try {
    recognition.start();
    isListening = true;
    $("micBtn").classList.add("listening");
  } catch (e) {
    console.warn("Could not start recognition:", e);
  }
}
function stopListening() {
  if (!recognition) return;
  try { recognition.stop(); } catch {}
  isListening = false;
  $("micBtn").classList.remove("listening");
}

// ---------- FILE / FOLDER IMPORT ----------
// Lets the user bring in an existing project (multiple loose files, or a whole folder via
// webkitdirectory) so the AI can see it once and keep working on it — same idea as pasting
// files into Claude. Binary files are skipped since the model can't use them as text anyway.

const BINARY_EXT = new Set([
  "png","jpg","jpeg","gif","webp","ico","svg","bmp","mp3","mp4","wav","ogg","woff","woff2",
  "ttf","eot","zip","tar","gz","rar","7z","pdf","exe","dll","so","o","class","jar","db","sqlite",
]);
const MAX_IMPORT_FILE_CHARS = 30000; // guard against accidentally importing a giant minified bundle
const MAX_IMPORT_TOTAL_FILES = 40;

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function openImportPicker() {
  $("importPickerOverlay").classList.remove("hidden");
  requestAnimationFrame(() => $("importPickerOverlay").classList.add("show"));
}
function closeImportPicker() {
  const ov = $("importPickerOverlay");
  ov.classList.remove("show");
  setTimeout(() => ov.classList.add("hidden"), 200);
}

function openTemplatePicker() {
  $("templatePickerOverlay").classList.remove("hidden");
  requestAnimationFrame(() => $("templatePickerOverlay").classList.add("show"));
}
function closeTemplatePicker() {
  const ov = $("templatePickerOverlay");
  ov.classList.remove("show");
  setTimeout(() => ov.classList.add("hidden"), 200);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function handleImportedFileList(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  if (!currentProjectId) {
    const name = await showPrompt("Project ka naam?", "Imported Project", "New Project");
    if (!name) return;
    createProject(name);
  }

  const usable = files.filter((f) => !BINARY_EXT.has(extOf(f.name)));
  const skippedBinary = files.length - usable.length;
  const capped = usable.slice(0, MAX_IMPORT_TOTAL_FILES);
  const skippedCap = usable.length - capped.length;

  const progressCard = addImportCard({ status: "importing", count: capped.length });

  const imported = [];
  let skippedTooBig = 0;
  for (const file of capped) {
    // webkitRelativePath preserves folder structure (e.g. "myapp/src/index.js") when a
    // folder was picked; for loose multi-file picks it's empty, so fall back to file.name.
    const relPath = file.webkitRelativePath && file.webkitRelativePath.length
      ? file.webkitRelativePath
      : file.name;
    try {
      const text = await readFileAsText(file);
      if (text.length > MAX_IMPORT_FILE_CHARS) {
        skippedTooBig++;
        continue;
      }
      imported.push({ path: relPath, content: text });
    } catch {
      // unreadable as text (likely binary we didn't catch by extension) — skip quietly
    }
  }

  if (!imported.length) {
    progressCard.remove();
    addSystemMsg("Koi readable text file nahi mili import karne ke liye.");
    return;
  }

  for (const f of imported) {
    currentFiles[f.path] = f.content;
  }
  saveProjectFiles(currentProjectId, currentFiles);
  renderFileList();
  $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;

  // One consolidated card in chat — this is what keeps it token-efficient: the AI only
  // needs to be told once what arrived. Full content already lives in currentFiles and
  // flows through buildFileContext() on the next message, same as any other project file,
  // so we don't duplicate the content again here in the chat log itself.
  const extras = [];
  if (skippedBinary) extras.push(`${skippedBinary} binary file(s) skipped`);
  if (skippedCap) extras.push(`${skippedCap} file(s) skipped (import limit is ${MAX_IMPORT_TOTAL_FILES} per batch)`);
  if (skippedTooBig) extras.push(`${skippedTooBig} file(s) skipped (too large, over ~30k chars)`);
  const hasJsxOrTs = imported.some((f) => /\.(jsx|tsx|ts)$/i.test(f.path));
  if (hasJsxOrTs) extras.push(`.jsx/.tsx/.ts won't preview live without conversion`);

  progressCard.remove();
  addImportCard({ status: "done", files: imported.map((f) => f.path), extras });
  showToast(`${imported.length} file(s) imported`);
}

// Left-aligned import status card — icon + file list, instead of centered plain text.
// Visually matches the file-chip pattern already used for AI-generated files, so an
// import looks like "here's what arrived" rather than a generic system notice.
function addImportCard({ status, count, files, extras }) {
  const log = $("chatLog");
  $("emptyState").classList.add("hidden");
  const div = document.createElement("div");
  div.className = "msg import-card";

  if (status === "importing") {
    div.innerHTML = `
      <div class="import-card-header">
        <span class="status-spinner"></span>
        <span>Importing ${count} file${count === 1 ? "" : "s"}...</span>
      </div>`;
  } else {
    const fileRows = files.map((p) => `
      <div class="import-card-file">${ICON.file}<span>${escapeHtml(p)}</span></div>
    `).join("");
    const extrasHtml = extras && extras.length
      ? `<div class="import-card-extras">${extras.map((e) => escapeHtml(e)).join(" · ")}</div>`
      : "";
    div.innerHTML = `
      <div class="import-card-header">
        <span class="status-check">${ICON.check}</span>
        <span>Imported ${files.length} file${files.length === 1 ? "" : "s"}</span>
      </div>
      <div class="import-card-files">${fileRows}</div>
      ${extrasHtml}`;
  }

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

// ---------- EVENT WIRING ----------
$("menuBtn").addEventListener("click", openDrawer);
$("drawerOverlay").addEventListener("click", closeDrawer);
$("filesBtn").addEventListener("click", openFilesPanel);
$("filesOverlay").addEventListener("click", closeFilesPanel);
$("closePreviewBtn").addEventListener("click", closePreviewModal);
$("closeDiffBtn").addEventListener("click", closeDiffModal);
$("closeCodeViewBtn").addEventListener("click", closeCodeViewModal);
$("codeViewEditBtn").addEventListener("click", () => setCodeViewEditing(true));
$("codeViewSaveBtn").addEventListener("click", saveCodeViewEdit);
$("codeViewCancelEditBtn").addEventListener("click", cancelCodeViewEdit);
$("previewRefreshBtn").addEventListener("click", () => {
  const path = $("previewModal").dataset.currentPath;
  if (path) openPreviewModal(path);
});
$("newProjectBtn").addEventListener("click", openTemplatePicker);
$("templatePickerCancelBtn").addEventListener("click", closeTemplatePicker);
$("templatePickerOverlay").addEventListener("click", (e) => {
  if (e.target.id === "templatePickerOverlay") closeTemplatePicker();
});
$("templateList").querySelectorAll("[data-template]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.template;
    closeTemplatePicker();
    const label = TEMPLATES[key]?.label || "Project";
    const name = await showPrompt("Project ka naam?", label, "New Project");
    if (name) createProjectFromTemplate(name, key);
  });
});
$("downloadZipBtn").addEventListener("click", downloadZip);
$("importFilesBtn").addEventListener("click", openImportPicker);
$("importPickerCancelBtn").addEventListener("click", closeImportPicker);
$("importPickerOverlay").addEventListener("click", (e) => {
  if (e.target.id === "importPickerOverlay") closeImportPicker();
});
$("pickFilesBtn").addEventListener("click", () => {
  closeImportPicker();
  $("importFilesInput").click();
});
$("pickFolderBtn").addEventListener("click", () => {
  closeImportPicker();
  $("importFolderInput").click();
});
$("importFilesInput").addEventListener("change", (e) => {
  handleImportedFileList(e.target.files);
  e.target.value = ""; // allow re-selecting the same file(s) later
});
$("importFolderInput").addEventListener("change", (e) => {
  handleImportedFileList(e.target.files);
  e.target.value = "";
});
$("attachBtn").addEventListener("click", () => $("attachInput").click());

document.querySelectorAll("[data-shortcut]").forEach((card) => {
  card.addEventListener("click", () => {
    const kind = card.dataset.shortcut;
    if (kind === "template") {
      openTemplatePicker();
    } else if (kind === "upload") {
      $("attachInput").click();
    } else if (kind === "discuss") {
      $("chatInput").value = "Mera project idea hai — ";
      $("chatInput").focus();
      autoResize();
    } else if (kind === "fix") {
      $("chatInput").value = "Is code mein bug hai — ";
      $("chatInput").focus();
      autoResize();
    }
  });
});
$("attachInput").addEventListener("change", (e) => {
  handleImportedFileList(e.target.files);
  e.target.value = "";
});
$("sendBtn").addEventListener("click", () => {
  if (currentRequestController) {
    currentRequestController.abort();
  } else {
    sendMessage();
  }
});
// Enter always inserts a newline (textarea's native behavior) — on mobile there's no
// Shift key, so treating plain Enter as "send" meant any accidental tap, or just wanting
// a new line while typing a longer message, fired the message early. Sending now only
// happens via the explicit send button tap.
$("chatInput").addEventListener("input", autoResize);
updateSendMicToggle();

// ---------- INIT ----------
(function init() {
  const projects = listProjects();
  const ids = Object.keys(projects);
  if (currentProjectId && projects[currentProjectId]) {
    switchProject(currentProjectId);
  } else if (ids.length) {
    switchProject(ids[0]);
  } else {
    createProject("My First Project");
  }
})();
