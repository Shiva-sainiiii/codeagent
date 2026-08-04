// app.js — main orchestrator: project management, files/import panels, voice input,
// event wiring, init. Everything else now lives in js/*.js — see index.html load order:
// icons -> storage -> templates -> modals -> preview -> chat-render -> chat-logic -> app.

// ---------- PROJECT MANAGEMENT ----------
function createProject(name) {
  const id = genId();
  saveProjectMeta(id, { name: name || "Untitled Project", updatedAt: Date.now() });
  saveProjectFiles(id, {});
  saveChat(id, [], "");
  switchProject(id);
}

function switchProject(id) {
  renderFileListSkeleton();
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
    const showRedo = hasRedoHistory(path);
    return `
    <div class="file-item">
      <div class="file-item-top">
        <b>${escapeHtml(path)}</b>
        <div class="file-item-actions">
          ${showDiffUndo ? `<button class="mini-btn" data-action="diff" data-path="${escapeAttr(path)}">${ICON.diff}</button>` : ""}
          ${showDiffUndo ? `<button class="mini-btn" data-action="undo" data-path="${escapeAttr(path)}">${ICON.undo}</button>` : ""}
          ${showRedo ? `<button class="mini-btn" data-action="redo" data-path="${escapeAttr(path)}">${ICON.redo}</button>` : ""}
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
  list.querySelectorAll('[data-action="redo"]').forEach((el) =>
    el.addEventListener("click", () => {
      if (redoFileChange(el.dataset.path)) {
        renderFileList();
        showToast(`${el.dataset.path} redone`);
      } else {
        showToast("Nothing to redo");
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

// Exports the whole project as a .zip, preserving nested folder structure exactly as
// stored (JSZip's file() with a "/"-containing path automatically creates the needed
// subfolders in the archive — verified this holds for multi-level paths like
// "src/components/Button.js", not just one level deep).
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
    haptic("tap");
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
const BINARY_EXT = new Set([
  "png","jpg","jpeg","gif","webp","ico","svg","bmp","mp3","mp4","wav","ogg","woff","woff2",
  "ttf","eot","zip","tar","gz","rar","7z","pdf","exe","dll","so","o","class","jar","db","sqlite",
]);
const MAX_IMPORT_FILE_CHARS = 30000;
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
      // unreadable as text — skip quietly
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

  const extras = [];
  if (skippedBinary) extras.push(`${skippedBinary} binary file(s) skipped`);
  if (skippedCap) extras.push(`${skippedCap} file(s) skipped (import limit is ${MAX_IMPORT_TOTAL_FILES} per batch)`);
  if (skippedTooBig) extras.push(`${skippedTooBig} file(s) skipped (too large, over ~30k chars)`);
  const hasJsxOrTs = imported.some((f) => /\.(jsx|tsx|ts)$/i.test(f.path));
  if (hasJsxOrTs) extras.push(`.jsx/.tsx/.ts won't preview live without conversion`);

  progressCard.remove();
  addImportCard({ status: "done", files: imported.map((f) => f.path), extras });
  showToast(`${imported.length} file(s) imported`);
  haptic("success");
}

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

// ---------- SKELETON LOADING ----------
// Brief shimmer placeholders shown while switching projects / opening panels, so a
// slower localStorage read (larger projects) doesn't look like nothing is happening.
function renderFileListSkeleton() {
  const list = $("fileList");
  list.innerHTML = Array.from({ length: 3 }).map(() => `
    <div class="file-item skeleton-item">
      <div class="skeleton-line skeleton-shimmer" style="width: 60%; height: 14px;"></div>
    </div>
  `).join("");
}
function renderPreviewSkeleton() {
  return `<div class="preview-skeleton">
    <div class="skeleton-line skeleton-shimmer" style="width: 40%;"></div>
    <div class="skeleton-line skeleton-shimmer" style="width: 80%;"></div>
    <div class="skeleton-line skeleton-shimmer" style="width: 65%;"></div>
  </div>`;
}

// ---------- KEYBOARD-AWARE SCROLL ----------
// On mobile, when the on-screen keyboard opens, the visual viewport shrinks but the
// layout viewport doesn't — this is what causes the input bar to get covered by the
// keyboard on iOS Safari specifically. visualViewport gives us the real visible height,
// so we can pin the input bar to it directly instead of trusting 100vh/100dvh alone.
function initKeyboardAwareScroll() {
  if (!window.visualViewport) return; // unsupported — fall back to default (dvh already helps most browsers)
  const vv = window.visualViewport;
  const app = $("app");

  function handleViewportChange() {
    // How much the keyboard is covering, in px
    const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
    if (keyboardHeight > 60) {
      // keyboard is open — pin the app container to the visible area
      app.style.height = vv.height + "px";
      app.classList.add("keyboard-open");
      // keep the latest message in view once the layout has settled
      requestAnimationFrame(() => {
        $("chatArea").scrollTop = $("chatArea").scrollHeight;
      });
    } else {
      app.style.height = "";
      app.classList.remove("keyboard-open");
    }
  }

  vv.addEventListener("resize", handleViewportChange);
  vv.addEventListener("scroll", handleViewportChange);
}

// ---------- PULL-TO-REFRESH ----------
// Pulling down at the top of the chat re-syncs from localStorage (useful if the same
// project was open in another tab and changed) and gives a satisfying native-feeling
// gesture. Not a network refresh — there's no server-side chat state — but it re-renders
// from the source of truth, which is the meaningful "refresh" action available here.
function initPullToRefresh() {
  const chatArea = $("chatArea");
  const indicator = document.createElement("div");
  indicator.className = "pull-refresh-indicator";
  indicator.innerHTML = `<span class="status-spinner"></span>`;
  chatArea.parentElement.insertBefore(indicator, chatArea);

  let startY = 0;
  let pulling = false;
  const THRESHOLD = 70;

  chatArea.addEventListener("touchstart", (e) => {
    if (chatArea.scrollTop <= 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  chatArea.addEventListener("touchmove", (e) => {
    if (!pulling) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0 && chatArea.scrollTop <= 0) {
      const pull = Math.min(delta * 0.5, 90);
      indicator.style.transform = `translateY(${pull}px)`;
      indicator.classList.toggle("ready", pull > THRESHOLD * 0.5);
    }
  }, { passive: true });

  chatArea.addEventListener("touchend", (e) => {
    if (!pulling) return;
    pulling = false;
    const delta = (e.changedTouches[0]?.clientY || startY) - startY;
    if (delta * 0.5 > THRESHOLD * 0.5) {
      indicator.classList.add("refreshing");
      haptic("tap");
      setTimeout(() => {
        if (currentProjectId) {
          currentFiles = loadProjectFiles(currentProjectId);
          const chat = loadChat(currentProjectId);
          currentChat = chat.messages;
          chatSummary = chat.summary;
          renderChatLog();
          renderFileList();
        }
        indicator.classList.remove("refreshing", "ready");
        indicator.style.transform = "";
        showToast("Refreshed");
      }, 500);
    } else {
      indicator.style.transform = "";
      indicator.classList.remove("ready");
    }
  });
}

// ---------- MESSAGE SEARCH ----------
// Searches the current project's chat history and lets the user jump straight to a
// match — genuinely useful once a conversation grows past a screenful.
function openMessageSearch() {
  $("searchOverlay").classList.remove("hidden");
  requestAnimationFrame(() => $("searchOverlay").classList.add("show"));
  $("searchInput").value = "";
  $("searchResults").innerHTML = "";
  setTimeout(() => $("searchInput").focus(), 260);
}
function closeMessageSearch() {
  const ov = $("searchOverlay");
  ov.classList.remove("show");
  setTimeout(() => ov.classList.add("hidden"), 200);
}
function runMessageSearch(query) {
  const resultsEl = $("searchResults");
  const q = query.trim().toLowerCase();
  if (!q) {
    resultsEl.innerHTML = `<p class="search-empty">Type to search this project's messages.</p>`;
    return;
  }
  const matches = currentChat
    .map((m, idx) => ({ ...m, idx }))
    .filter((m) => m.content.toLowerCase().includes(q));

  if (!matches.length) {
    resultsEl.innerHTML = `<p class="search-empty">No messages found.</p>`;
    return;
  }

  resultsEl.innerHTML = matches.map((m) => {
    const snippet = highlightMatch(m.content, q);
    const roleLabel = m.role === "user" ? "You" : "AI";
    return `<button class="search-result-item" data-msg-id="${m.id}">
      <span class="search-result-role">${roleLabel}</span>
      <span class="search-result-snippet">${snippet}</span>
    </button>`;
  }).join("");

  resultsEl.querySelectorAll(".search-result-item").forEach((el) => {
    el.addEventListener("click", () => {
      closeMessageSearch();
      jumpToMessage(el.dataset.msgId);
    });
  });
}
function highlightMatch(text, q) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return escapeHtml(text.slice(0, 80));
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + q.length + 30);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  const before = escapeHtml(text.slice(start, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length, end));
  return `${prefix}${before}<mark>${match}</mark>${after}${suffix}`;
}
function jumpToMessage(msgId) {
  const el = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!el) return showToast("Message not visible (may need to scroll)");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("search-highlight-flash");
  setTimeout(() => el.classList.remove("search-highlight-flash"), 1500);
}

// ---------- BULK FIND/REPLACE ACROSS FILES ----------
// "sab files mein oldColor ko newColor se replace karo" as an actual local operation —
// zero LLM cost, instant, and it's exactly the kind of mechanical bulk edit a model
// would otherwise have to be walked through file-by-file.
function openBulkReplace() {
  $("bulkReplaceOverlay").classList.remove("hidden");
  requestAnimationFrame(() => $("bulkReplaceOverlay").classList.add("show"));
  $("bulkFindInput").value = "";
  $("bulkReplaceInput").value = "";
  $("bulkReplacePreview").innerHTML = "";
  setTimeout(() => $("bulkFindInput").focus(), 260);
}
function closeBulkReplace() {
  const ov = $("bulkReplaceOverlay");
  ov.classList.remove("show");
  setTimeout(() => ov.classList.add("hidden"), 200);
}
function previewBulkReplace() {
  const find = $("bulkFindInput").value;
  const previewEl = $("bulkReplacePreview");
  if (!find) {
    previewEl.innerHTML = "";
    $("bulkReplaceConfirmBtn").disabled = true;
    return;
  }
  const matches = [];
  for (const [path, content] of Object.entries(currentFiles)) {
    const count = content.split(find).length - 1;
    if (count > 0) matches.push({ path, count });
  }
  if (!matches.length) {
    previewEl.innerHTML = `<p class="search-empty">No matches found in any file.</p>`;
    $("bulkReplaceConfirmBtn").disabled = true;
    return;
  }
  const totalCount = matches.reduce((sum, m) => sum + m.count, 0);
  previewEl.innerHTML = `
    <p class="bulk-replace-summary">${totalCount} match(es) in ${matches.length} file(s):</p>
    ${matches.map((m) => `<div class="bulk-replace-file-row">${ICON.file}<span>${escapeHtml(m.path)}</span><span class="bulk-replace-count">${m.count}×</span></div>`).join("")}
  `;
  $("bulkReplaceConfirmBtn").disabled = false;
}
function applyBulkReplace() {
  const find = $("bulkFindInput").value;
  const replace = $("bulkReplaceInput").value;
  if (!find) return;

  let filesChanged = 0;
  for (const [path, content] of Object.entries(currentFiles)) {
    if (content.includes(find)) {
      recordFileSnapshot(currentProjectId, path, content, "bulk find/replace");
      currentFiles[path] = content.split(find).join(replace);
      filesChanged++;
    }
  }
  if (filesChanged > 0) {
    saveProjectFiles(currentProjectId, currentFiles);
    renderFileList();
    addSystemMsg(`Replaced "${find}" with "${replace}" across ${filesChanged} file(s).`);
    showToast(`${filesChanged} file(s) updated`);
    haptic("success");
  }
  closeBulkReplace();
}

// ---------- PLAN MODE ----------
// For requests that look substantial (multiple files, a whole feature, "build me a...",
// etc.), the AI is asked to first return a short step-by-step plan instead of executing
// immediately. The user reviews and confirms before any files are touched — mirrors how
// Claude Code proposes a plan for non-trivial tasks rather than just diving in.
function looksLikeComplexRequest(text) {
  const t = text.toLowerCase();
  // Heuristics for "this is probably a multi-file / multi-step task", not just a quick fix
  const complexSignals = [
    /\bbuild\b|\bbanao\b|\bbana do\b|\bcreate\b.*\b(app|game|website|project|system)\b/,
    /\bfull\b.*\b(app|website|project)\b/,
    /\bwith\b.*\band\b.*\band\b/, // "with X and Y and Z" — multiple features listed
  ];
  return complexSignals.some((re) => re.test(t)) && t.split(/\s+/).length > 6;
}

function openPlanConfirm(planSteps, originalText) {
  $("planStepsList").innerHTML = planSteps.map((s, i) => `
    <div class="plan-step">
      <span class="plan-step-num">${i + 1}</span>
      <span class="plan-step-text">${escapeHtml(s)}</span>
    </div>
  `).join("");
  $("planConfirmOverlay").dataset.originalText = originalText;
  $("planConfirmOverlay").classList.remove("hidden");
  requestAnimationFrame(() => $("planConfirmOverlay").classList.add("show"));
}
function closePlanConfirm() {
  const ov = $("planConfirmOverlay");
  ov.classList.remove("show");
  setTimeout(() => ov.classList.add("hidden"), 200);
}
async function confirmPlanAndExecute() {
  const originalText = $("planConfirmOverlay").dataset.originalText;
  closePlanConfirm();
  if (originalText) await runLlmRequest(originalText);
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
  e.target.value = "";
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

// Message search
$("searchBtn").addEventListener("click", openMessageSearch);
$("closeSearchBtn").addEventListener("click", closeMessageSearch);
$("searchInput").addEventListener("input", (e) => runMessageSearch(e.target.value));

// Bulk find/replace
$("bulkReplaceBtn").addEventListener("click", openBulkReplace);
$("bulkReplaceCancelBtn").addEventListener("click", closeBulkReplace);
$("bulkFindInput").addEventListener("input", previewBulkReplace);
$("bulkReplaceInput").addEventListener("input", previewBulkReplace);
$("bulkReplaceConfirmBtn").addEventListener("click", applyBulkReplace);

// Review mode toggle
$("reviewModeToggle").addEventListener("click", () => {
  const newState = !isReviewModeEnabled();
  setReviewModeEnabled(newState);
  haptic("tap");
});

// Plan confirmation
$("planCancelBtn").addEventListener("click", closePlanConfirm);
$("planConfirmBtn").addEventListener("click", confirmPlanAndExecute);

// ---------- INIT ----------
(function init() {
  initVoiceInput();
  initKeyboardAwareScroll();
  initPullToRefresh();
  setReviewModeEnabled(isReviewModeEnabled()); // sync toggle visual state with stored preference

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

// ---------- REVIEW MODE (optional review-before-applying for file edits) ----------
// Off by default — undo/redo already provides a safety net after the fact. This is for
// users who'd rather catch a bad edit before it lands, at the cost of an extra tap per
// edited file. New file creation is never gated (nothing to overwrite).
function isReviewModeEnabled() {
  // Defaults ON (opt-out, not opt-in) — reviewing an edit before it lands is the safer
  // default for anyone new to the app; localStorage only stores "0" once someone actually
  // turns it off, so existing users who never touched the toggle also get the safer
  // behavior going forward rather than being silently switched over.
  const stored = localStorage.getItem("codeagent:reviewMode");
  return stored === null ? true : stored === "1";
}
function setReviewModeEnabled(on) {
  localStorage.setItem("codeagent:reviewMode", on ? "1" : "0");
  const toggle = $("reviewModeToggle");
  toggle.classList.toggle("on", on);
  toggle.setAttribute("aria-checked", String(on));
}

// Renders an inline "pending changes" card with a real diff and Accept/Reject actions
// for each file the AI wants to edit but hasn't been applied yet.
function renderPendingReviewCard(pendingFiles) {
  const log = $("chatLog");
  const div = document.createElement("div");
  div.className = "msg review-card";

  const rows = pendingFiles.map((f, i) => {
    const before = currentFiles[f.path] || "";
    let after = before;
    if (Array.isArray(f.edits)) {
      for (const e of f.edits) {
        if (e.find && after.includes(e.find)) after = after.replace(e.find, e.replace ?? "");
      }
    } else if (f.content) {
      after = f.content;
    }
    const diffLines = computeLineDiff(before, after);
    const diffHtml = diffLines.map((line) => {
      const cls = line.type === "added" ? "diff-added" : line.type === "removed" ? "diff-removed" : "diff-same";
      const prefix = line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
      return `<div class="diff-line ${cls}"><span class="diff-prefix">${prefix}</span><span class="diff-text">${escapeHtml(line.text)}</span></div>`;
    }).join("");

    return `
      <div class="review-file-block" data-idx="${i}">
        <div class="review-file-header">
          ${ICON.file}<span>${escapeHtml(f.path)}</span>
        </div>
        <div class="review-diff-preview">${diffHtml}</div>
        <div class="review-file-actions">
          <button class="review-btn reject" data-idx="${i}">Reject</button>
          <button class="review-btn accept" data-idx="${i}">Accept</button>
        </div>
      </div>`;
  }).join("");

  const bulkActionsHtml = pendingFiles.length > 1
    ? `<div class="review-bulk-actions">
        <button class="review-bulk-btn reject-all" data-action="reject-all">Reject all</button>
        <button class="review-bulk-btn accept-all" data-action="accept-all">Accept all</button>
      </div>`
    : "";

  div.innerHTML = `
    <div class="review-card-header">${ICON.diff}<span>Review ${pendingFiles.length} change${pendingFiles.length === 1 ? "" : "s"} before applying</span></div>
    ${rows}
    ${bulkActionsHtml}
  `;

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;

  function acceptOne(idx) {
    const f = pendingFiles[idx];
    const block = div.querySelector(`.review-file-block[data-idx="${idx}"]`);
    if (block.classList.contains("resolved-accepted") || block.classList.contains("resolved-rejected")) return;
    const before = currentFiles[f.path];
    recordFileSnapshot(currentProjectId, f.path, before, "AI edit (reviewed)");
    const result = applyFileOps([f]);
    block.classList.add("resolved-accepted");
    if (result.warnings && result.warnings.length) {
      addSystemMsg(`⚠ ${result.warnings.join("\n")}`);
    }
  }
  function rejectOne(idx) {
    const block = div.querySelector(`.review-file-block[data-idx="${idx}"]`);
    if (block.classList.contains("resolved-accepted") || block.classList.contains("resolved-rejected")) return;
    block.classList.add("resolved-rejected");
  }

  const acceptAllBtn = div.querySelector('[data-action="accept-all"]');
  if (acceptAllBtn) acceptAllBtn.addEventListener("click", () => {
    pendingFiles.forEach((_, idx) => acceptOne(idx));
    saveProjectFiles(currentProjectId, currentFiles);
    renderFileList();
    $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
    haptic("success");
    showToast(`${pendingFiles.length} file(s) applied`);
  });
  const rejectAllBtn = div.querySelector('[data-action="reject-all"]');
  if (rejectAllBtn) rejectAllBtn.addEventListener("click", () => {
    pendingFiles.forEach((_, idx) => rejectOne(idx));
    showToast("All changes rejected");
  });

  div.querySelectorAll(".review-btn.accept").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const f = pendingFiles[idx];
      acceptOne(idx);
      saveProjectFiles(currentProjectId, currentFiles);
      renderFileList();
      $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
      haptic("success");
      showToast(`${f.path} applied`);
    });
  });
  div.querySelectorAll(".review-btn.reject").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      rejectOne(idx);
      showToast("Change rejected");
    });
  });
}
