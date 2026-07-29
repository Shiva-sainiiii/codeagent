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
};

// ---------- STATE ----------
let currentProjectId = localStorage.getItem("codeagent:lastProject") || null;
let currentFiles = {};      // {path: content}
let currentChat = [];       // [{role, content}]
let chatSummary = "";       // rolling summary of older turns

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
  list.innerHTML = paths.map((path) => `
    <div class="file-item">
      <div class="file-item-top">
        <b>${escapeHtml(path)}</b>
        <div class="file-item-actions">
          <button class="mini-btn" data-action="preview" data-path="${escapeAttr(path)}">${ICON.eye}</button>
          <button class="mini-btn" data-action="copy" data-path="${escapeAttr(path)}">${ICON.copy}</button>
          <button class="mini-btn" data-action="download" data-path="${escapeAttr(path)}">${ICON.download}</button>
          <button class="mini-btn danger" data-action="delete" data-path="${escapeAttr(path)}">${ICON.trash}</button>
        </div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll('[data-action="preview"]').forEach((el) =>
    el.addEventListener("click", () => openPreviewModal(el.dataset.path))
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

  return out;
}

function openPreviewModal(path) {
  const content = currentFiles[path];
  if (content === undefined) return showToast("File not found");
  const ext = path.split(".").pop().toLowerCase();
  let srcDoc;

  if (ext === "html") {
    srcDoc = inlineProjectAssets(path, content);
  } else if (ext === "css") {
    srcDoc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      body { font-family: -apple-system, sans-serif; margin: 0; padding: 16px; color: #222; }
      .preview-note { font-size: 12px; color: #888; margin-bottom: 12px; font-family: monospace; }
      ${content}
    </style></head><body>
      <div class="preview-note">CSS preview — pair with an HTML file to see it fully applied.</div>
      <h1>Heading</h1>
      <p>Paragraph text to preview typography.</p>
      <button>Button</button>
    </body></html>`;
  } else if (ext === "js") {
    srcDoc = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="background:#0d1117;color:#7ee787;font-family:monospace;padding:16px;margin:0;font-size:13px;white-space:pre-wrap;">
      <div id="output"></div>
      <script>
        const log = document.getElementById('output');
        const origLog = console.log;
        console.log = (...args) => { log.innerHTML += args.join(' ') + '\\n'; origLog(...args); };
        try { ${content} } catch(e) { log.innerHTML += 'Error: ' + e.message; }
      <\/script></body></html>`;
  } else {
    srcDoc = `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#0d1117;color:#d4e2f0;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;">${escapeHtml(content)}</body></html>`;
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

  // file chips (with inline download/copy)
  if (fileChips && fileChips.length) {
    fileChips.forEach((path) => {
      const row = document.createElement("div");
      row.className = "file-chip-row";
      row.innerHTML = `
        <button class="file-chip-name" data-action="open">${ICON.file} <span>${escapeHtml(path)}</span></button>
        <div class="file-chip-actions">
          <button class="chip-action-btn" data-action="copy" title="Copy">${ICON.copy}</button>
          <button class="chip-action-btn" data-action="download" title="Download">${ICON.download}</button>
        </div>`;
      row.querySelector('[data-action="open"]').addEventListener("click", () => openPreviewModal(path));
      row.querySelector('[data-action="copy"]').addEventListener("click", () => copyFileContent(path));
      row.querySelector('[data-action="download"]').addEventListener("click", () => downloadFile(path));
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
  // Keep only last 6 for the actual API call (server also enforces this)
  return currentChat.slice(-6).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));
}

function buildFileContext() {
  const paths = Object.keys(currentFiles);
  if (!paths.length) return "";

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
// Returns { touched: [paths actually changed], failed: [paths where an edit snippet didn't match] }
function applyFileOps(files) {
  const touched = [];
  const failed = [];
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
        if (fileChanged) touched.push(f.path);
        if (fileHadMiss) failed.push(f.path);
      } else if (f.content) {
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
      // IMPORTANT: reuse the single status bubble via updateStatus() only — never call
      // pushStatus() again mid-loop, or the previous bubble is orphaned still spinning.
      let anyEditFailed = false;
      for (const f of filesToApply) {
        const verb = f.action === "edit" ? "Editing" : "Creating";
        updateStatus(`${verb} ${f.path}...`);
        await sleep(300); // brief pause so each step is actually readable
        const result = applyFileOps([f]);
        if (result.failed.length) anyEditFailed = true;
        const label = result.failed.length
          ? `Edit skipped (no match): ${f.path}`
          : `${f.action === "edit" ? "Updated" : "Created"} ${f.path}`;
        updateStatus(label);
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
    const msg = "Connection issue — phir se try karo.";
    const errMsg = { role: "bot", content: msg, id: genId(), ts: Date.now() };
    currentChat.push(errMsg);
    saveChat(currentProjectId, currentChat, chatSummary);
    appendMsgToDom("bot", msg, null, { id: errMsg.id, ts: errMsg.ts });
  } finally {
    // Guaranteed cleanup — no matter how the try block exits (success, thrown error,
    // JSON parse failure), the spinner/status bubble and pending timers must never
    // survive past this point. This is what was causing the "loading never stops" bug.
    stageTimers.forEach(clearTimeout);
    clearStatus();
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
  el.style.height = Math.min(el.scrollHeight, 100) + "px";
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

  addSystemMsg(`Importing ${capped.length} file(s)...`);

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
    addSystemMsg("Koi readable text file nahi mili import karne ke liye.");
    return;
  }

  for (const f of imported) {
    currentFiles[f.path] = f.content;
  }
  saveProjectFiles(currentProjectId, currentFiles);
  renderFileList();
  $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;

  // One consolidated system note in chat — this is what keeps it token-efficient: the AI
  // only needs to be told once what arrived. Full content already lives in currentFiles and
  // flows through buildFileContext() on the next message, same as any other project file,
  // so we don't duplicate the content again here in the chat log itself.
  const list = imported.map((f) => f.path).join("\n");
  let note = `Imported ${imported.length} file(s):\n${list}`;
  const extras = [];
  if (skippedBinary) extras.push(`${skippedBinary} binary file(s) skipped`);
  if (skippedCap) extras.push(`${skippedCap} file(s) skipped (import limit is ${MAX_IMPORT_TOTAL_FILES} per batch)`);
  if (skippedTooBig) extras.push(`${skippedTooBig} file(s) skipped (too large, over ~30k chars)`);
  if (extras.length) note += `\n(${extras.join(", ")})`;
  addSystemMsg(note);
  showToast(`${imported.length} file(s) imported`);
}

// ---------- EVENT WIRING ----------
$("menuBtn").addEventListener("click", openDrawer);
$("drawerOverlay").addEventListener("click", closeDrawer);
$("filesBtn").addEventListener("click", openFilesPanel);
$("filesOverlay").addEventListener("click", closeFilesPanel);
$("closePreviewBtn").addEventListener("click", closePreviewModal);
$("previewRefreshBtn").addEventListener("click", () => {
  const path = $("previewModal").dataset.currentPath;
  if (path) openPreviewModal(path);
});
$("newProjectBtn").addEventListener("click", async () => {
  const name = await showPrompt("Project ka naam?", "My Project", "New Project");
  if (name) createProject(name);
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
