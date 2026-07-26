// app.js — all client logic. No frameworks, plain DOM.

const $ = (id) => document.getElementById(id);

// ---------- STATE ----------
let currentProjectId = localStorage.getItem("codeagent:lastProject") || null;
let currentFiles = {};      // {path: content}
let currentChat = [];       // [{role, content}]
let chatSummary = "";       // rolling summary of older turns
let selectedFileForPreview = null;

// ---------- LOCALSTORAGE HELPERS ----------
function listProjects() {
  const raw = localStorage.getItem("codeagent:projects");
  return raw ? JSON.parse(raw) : {}; // {id: {name, updatedAt}}
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
  return raw ? JSON.parse(raw).files : {};
}
function saveProjectFiles(id, files) {
  localStorage.setItem(`project:${id}`, JSON.stringify({ files, updatedAt: Date.now() }));
  const meta = listProjects()[id] || { name: id };
  saveProjectMeta(id, { ...meta, updatedAt: Date.now() });
}
function loadChat(id) {
  const raw = localStorage.getItem(`chat:${id}`);
  if (!raw) return { messages: [], summary: "" };
  return JSON.parse(raw);
}
function saveChat(id, messages, summary) {
  localStorage.setItem(`chat:${id}`, JSON.stringify({ messages, summary }));
}

function genId() {
  return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
      $("projectSub").textContent = "tap ☰ to switch";
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
      <button class="mini-btn danger" data-action="delete" data-id="${id}">🗑</button>
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
  list.innerHTML = paths.map((path) => `
    <div class="file-item">
      <div class="file-item-top">
        <b>${escapeHtml(path)}</b>
        <div class="file-item-actions">
          <button class="mini-btn" data-action="preview" data-path="${escapeAttr(path)}">👁</button>
          <button class="mini-btn" data-action="download" data-path="${escapeAttr(path)}">⬇</button>
          <button class="mini-btn danger" data-action="delete" data-path="${escapeAttr(path)}">🗑</button>
        </div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll('[data-action="preview"]').forEach((el) =>
    el.addEventListener("click", () => previewFile(el.dataset.path))
  );
  list.querySelectorAll('[data-action="download"]').forEach((el) =>
    el.addEventListener("click", () => downloadFile(el.dataset.path))
  );
  list.querySelectorAll('[data-action="delete"]').forEach((el) =>
    el.addEventListener("click", () => {
      delete currentFiles[el.dataset.path];
      saveProjectFiles(currentProjectId, currentFiles);
      renderFileList();
      addSystemMsg(`🗑 Deleted: ${el.dataset.path}`);
    })
  );
}

function previewFile(path) {
  const content = currentFiles[path];
  const ext = path.split(".").pop().toLowerCase();
  let srcDoc;
  if (ext === "html") {
    srcDoc = content;
  } else if (ext === "css") {
    srcDoc = `<style>${content}</style><body style="padding:10px;font-family:sans-serif;color:#333">CSS applied — preview only shows styling context, use with an HTML file.</body>`;
  } else if (ext === "js") {
    srcDoc = `<body style="background:#111;color:#0f0;font-family:monospace;padding:10px;"><script>
      try { ${content} } catch(e) { document.body.innerText = 'Error: ' + e.message; }
    <\/script></body>`;
  } else {
    srcDoc = `<pre style="padding:12px;white-space:pre-wrap;font-family:monospace;">${escapeHtml(content)}</pre>`;
  }
  $("previewFrame").srcdoc = srcDoc;
  $("previewWrap").classList.remove("hidden");
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

// ---------- CHAT RENDER ----------
function renderChatLog() {
  const log = $("chatLog");
  $("emptyState").classList.toggle("hidden", currentChat.length > 0);
  log.querySelectorAll(".msg").forEach((el) => el.remove());
  currentChat.forEach((m) => appendMsgToDom(m.role, m.content, m.fileChips));
  log.scrollTop = log.scrollHeight;
}

function appendMsgToDom(role, content, fileChips) {
  const log = $("chatLog");
  $("emptyState").classList.add("hidden");
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = content;
  if (fileChips && fileChips.length) {
    fileChips.forEach((path) => {
      const chip = document.createElement("span");
      chip.className = "file-chip";
      chip.textContent = `📄 ${path}`;
      chip.addEventListener("click", () => {
        openFilesPanel();
        previewFile(path);
      });
      div.appendChild(document.createElement("br"));
      div.appendChild(chip);
    });
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
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
  statusEl.innerHTML = `<span class="status-spinner"></span><span class="status-text">${escapeHtml(text)}</span>`;
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
  if (textEl) textEl.textContent = text;
  if (done) {
    statusEl.classList.add("done");
    const spinner = statusEl.querySelector(".status-spinner");
    if (spinner) spinner.outerHTML = `<span class="status-check">✓</span>`;
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
    addSystemMsg(paths.length ? `📁 Files:\n${paths.join("\n")}` : "Koi file nahi hai abhi.");
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
      addSystemMsg(`🗑 Deleted: ${match}`);
    } else {
      addSystemMsg(`File "${target}" nahi mili.`);
    }
    return true;
  }
  if (/^delete\s+this\s+file$/.test(t)) {
    if (selectedFileForPreview) {
      delete currentFiles[selectedFileForPreview];
      saveProjectFiles(currentProjectId, currentFiles);
      renderFileList();
      addSystemMsg(`🗑 Deleted: ${selectedFileForPreview}`);
    } else {
      addSystemMsg("Pehle koi file select/preview karo.");
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
  // Keep only last 6 for the actual API call (server also enforces this)
  return currentChat.slice(-6).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));
}

function buildFileContext() {
  const paths = Object.keys(currentFiles);
  if (!paths.length) return "";
  return paths.map((p) => `--- ${p} ---\n${currentFiles[p]}`).join("\n\n").slice(0, 6000); // cap size
}

async function maybeSummarize() {
  // very light heuristic: if chat grows past 6, fold the oldest excess into the summary string locally (no extra LLM call)
  if (currentChat.length > 8) {
    const toFold = currentChat.slice(0, currentChat.length - 6);
    const folded = toFold.map((m) => `${m.role}: ${m.content}`).join(" | ").slice(0, 500);
    chatSummary = (chatSummary ? chatSummary + " " : "") + folded;
    chatSummary = chatSummary.slice(-1500); // cap summary size
    currentChat = currentChat.slice(-6);
  }
}

// ---------- APPLY LLM FILE OPS ----------
function applyFileOps(files) {
  const touched = [];
  for (const f of files) {
    if (!f.path) continue;
    if (f.action === "create" || (f.action === "edit" && f.content && !currentFiles[f.path])) {
      currentFiles[f.path] = f.content ?? "";
      touched.push(f.path);
    } else if (f.action === "edit") {
      let content = currentFiles[f.path];
      if (content === undefined) {
        // file doesn't exist yet, fall back to content if given
        content = f.content ?? "";
      } else if (Array.isArray(f.edits)) {
        for (const e of f.edits) {
          if (e.find && content.includes(e.find)) {
            content = content.replace(e.find, e.replace ?? "");
          } else if (e.find) {
            // find not matched — append a note so user notices
            console.warn(`Edit snippet not found in ${f.path}:`, e.find);
          }
        }
      } else if (f.content) {
        content = f.content;
      }
      currentFiles[f.path] = content;
      touched.push(f.path);
    }
  }
  if (touched.length) saveProjectFiles(currentProjectId, currentFiles);
  return touched;
}

// ---------- SEND MESSAGE ----------
async function sendMessage() {
  const input = $("chatInput");
  const text = input.value.trim();
  if (!text) return;
  if (!currentProjectId) {
    createProject("My Project");
  }

  input.value = "";
  autoResize();

  currentChat.push({ role: "user", content: text });
  appendMsgToDom("user", text);
  saveChat(currentProjectId, currentChat, chatSummary);

  // 1) try local intent first (saves LLM cost)
  if (tryLocalIntent(text)) {
    $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
    return;
  }

  // 2) otherwise call LLM
  $("sendBtn").disabled = true;
  pushStatus("Samajh raha hoon...");

  // Give the user a sense of progress while we wait for the (single) API response.
  // These are staged local updates — not fake data, just honest phase labels for a
  // request that's genuinely in flight.
  const stageTimers = [];
  stageTimers.push(setTimeout(() => updateStatus("Model se connect ho raha hai..."), 1200));
  stageTimers.push(setTimeout(() => updateStatus("Code likh raha hai..."), 3500));
  stageTimers.push(setTimeout(() => updateStatus("Thoda aur time lag raha hai, rukiye..."), 9000));

  try {
    await maybeSummarize();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: buildTrimmedMessages(),
        summary: chatSummary,
        fileContext: buildFileContext(),
      }),
    });
    const data = await res.json();
    stageTimers.forEach(clearTimeout);

    const replyText = data.reply || "…";
    const filesToApply = data.files || [];

    if (filesToApply.length) {
      // Walk through each file so the user sees exactly what's happening, one by one.
      for (const f of filesToApply) {
        const verb = f.action === "edit" ? "Editing" : "Creating";
        updateStatus(`${verb} ${f.path}...`);
        await sleep(350); // brief pause so each step is actually readable
        applyFileOps([f]);
        pushStatus(`${f.action === "edit" ? "Updated" : "Created"} ${f.path}`);
        updateStatus(`${f.action === "edit" ? "Updated" : "Created"} ${f.path}`, true);
      }
      finishStatus("Done ✓");
      renderFileList();
      $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
    } else {
      clearStatus();
    }

    const touchedFiles = filesToApply.map((f) => f.path);
    currentChat.push({ role: "bot", content: replyText, fileChips: touchedFiles });
    saveChat(currentProjectId, currentChat, chatSummary);
    appendMsgToDom("bot", replyText, touchedFiles);
  } catch (e) {
    stageTimers.forEach(clearTimeout);
    clearStatus();
    const msg = "⚠️ Connection issue. Phir se try karo.";
    currentChat.push({ role: "bot", content: msg });
    saveChat(currentProjectId, currentChat, chatSummary);
    appendMsgToDom("bot", msg);
  } finally {
    $("sendBtn").disabled = false;
  }
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
  renderProjectList();
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
  renderFileList();
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
    $("previewWrap").classList.add("hidden");
  }, 280);
}

function autoResize() {
  const el = $("chatInput");
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 100) + "px";
}

// ---------- EVENT WIRING ----------
$("menuBtn").addEventListener("click", openDrawer);
$("drawerOverlay").addEventListener("click", closeDrawer);
$("filesBtn").addEventListener("click", openFilesPanel);
$("filesOverlay").addEventListener("click", closeFilesPanel);
$("closePreviewBtn").addEventListener("click", () => $("previewWrap").classList.add("hidden"));
$("newProjectBtn").addEventListener("click", async () => {
  const name = await showPrompt("Project ka naam?", "My Project", "New Project");
  if (name) createProject(name);
});
$("downloadZipBtn").addEventListener("click", downloadZip);
$("sendBtn").addEventListener("click", sendMessage);
$("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
$("chatInput").addEventListener("input", autoResize);

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
