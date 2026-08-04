// chat-render.js — turning chat messages into DOM: markdown rendering, message bubbles,
// long-press-to-edit, status/typing indicators, and the copy/share/like/retry footer.

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
    appendMsgToDom(m.role, m.content, m.fileChips, { id: m.id, ts: m.ts, feedback: m.feedback, stopped: m.stopped, retryPrompt: m.retryPrompt })
  );
  log.scrollTop = log.scrollHeight;
}

function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---------- LONG-PRESS EDIT (user messages) ----------
// Hold a user message to edit and resend it — truncates everything after that point in
// the conversation (matches Claude/ChatGPT's standard edit-message behavior) and re-sends.
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10; // px — cancels the hold if the finger drags this far (scrolling)

function attachLongPressEdit(bubbleEl, contentEl, msgId, originalText) {
  let timer = null;
  let startX = 0, startY = 0;

  const start = (x, y) => {
    startX = x; startY = y;
    bubbleEl.classList.add("pressing");
    timer = setTimeout(() => {
      bubbleEl.classList.remove("pressing");
      haptic("longPress");
      startEditingMessage(bubbleEl, contentEl, msgId, originalText);
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    clearTimeout(timer);
    bubbleEl.classList.remove("pressing");
  };
  const move = (x, y) => {
    if (Math.abs(x - startX) > LONG_PRESS_MOVE_TOLERANCE || Math.abs(y - startY) > LONG_PRESS_MOVE_TOLERANCE) {
      cancel();
    }
  };

  bubbleEl.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, { passive: true });
  bubbleEl.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: true });
  bubbleEl.addEventListener("touchend", cancel);
  bubbleEl.addEventListener("touchcancel", cancel);

  // Desktop/mouse support too (testing, and anyone using this from a laptop browser)
  bubbleEl.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
  bubbleEl.addEventListener("mousemove", (e) => { if (timer) move(e.clientX, e.clientY); });
  bubbleEl.addEventListener("mouseup", cancel);
  bubbleEl.addEventListener("mouseleave", cancel);
}

function startEditingMessage(bubbleEl, contentEl, msgId, originalText) {
  if (currentRequestController) return showToast("Wait for the current response to finish first");
  if (bubbleEl.classList.contains("editing")) return;
  bubbleEl.classList.add("editing");

  const textarea = document.createElement("textarea");
  textarea.className = "edit-msg-textarea";
  textarea.value = originalText;
  const actions = document.createElement("div");
  actions.className = "edit-msg-actions";
  actions.innerHTML = `
    <button class="edit-msg-btn cancel">Cancel</button>
    <button class="edit-msg-btn save">Save &amp; Resend</button>`;

  contentEl.replaceWith(textarea);
  bubbleEl.appendChild(actions);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  });

  actions.querySelector(".cancel").addEventListener("click", () => {
    textarea.replaceWith(contentEl);
    actions.remove();
    bubbleEl.classList.remove("editing");
  });

  actions.querySelector(".save").addEventListener("click", async () => {
    const newText = textarea.value.trim();
    if (!newText) return showToast("Message can't be empty");
    await resendEditedMessage(msgId, newText);
  });
}

// Truncates the conversation at the edited message (everything after it — including the
// AI's original response — is discarded, matching standard edit-message behavior) and
// re-sends the edited text as a fresh request.
async function resendEditedMessage(msgId, newText) {
  const idx = currentChat.findIndex((m) => m.id === msgId);
  if (idx === -1) return showToast("Message not found");

  currentChat = currentChat.slice(0, idx);
  saveChat(currentProjectId, currentChat, chatSummary);

  // Re-render the whole log from the truncated history, then send the edited text through
  // the normal path so it appends fresh (keeps this in sync with how sendMessage builds
  // the DOM, rather than duplicating that logic here).
  renderChatLog();
  $("chatInput").value = newText;
  await sendMessage();
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
      const showRedo = hasRedoHistory(path);
      row.innerHTML = `
        <button class="file-chip-name" data-action="open">${ICON.file} <span>${escapeHtml(path)}</span></button>
        <div class="file-chip-actions">
          ${showDiffUndo ? `<button class="chip-action-btn" data-action="diff" title="View changes">${ICON.diff}</button>` : ""}
          ${showDiffUndo ? `<button class="chip-action-btn" data-action="undo" title="Undo this edit">${ICON.undo}</button>` : ""}
          ${showRedo ? `<button class="chip-action-btn" data-action="redo" title="Redo this edit">${ICON.redo}</button>` : ""}
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
      const redoBtn = row.querySelector('[data-action="redo"]');
      if (redoBtn) redoBtn.addEventListener("click", () => {
        if (redoFileChange(path)) {
          renderFileList();
          showToast(`${path} redone`);
        } else {
          showToast("Nothing to redo");
        }
      });
      div.appendChild(row);
    });
  }

  // USER bubble: timestamp only, no action row (keeps the bubble small and quiet).
  // Long-press (hold) the bubble to edit and resend — everything after this message in
  // the conversation is replaced, matching how Claude/ChatGPT handle message edits.
  if (role === "user") {
    const timeEl = document.createElement("span");
    timeEl.className = "msg-time-only";
    timeEl.textContent = formatTime(meta.ts);
    div.appendChild(timeEl);
    attachLongPressEdit(div, contentEl, meta.id, content);
  }

  // BOT panel: full action row — time, copy, share, like/dislike (matches Claude-style layout)
  if (role === "bot") {
    const footer = document.createElement("div");
    footer.className = "msg-footer";
    const timeStr = formatTime(meta.ts);
    const retryBtnHtml = meta.stopped
      ? `<button class="msg-action-btn retry-btn" data-action="retry" title="Retry">${ICON.retry}</button>`
      : "";
    footer.innerHTML = `
      <span class="msg-time">${timeStr}</span>
      ${retryBtnHtml}
      <button class="msg-action-btn" data-action="copy-msg" title="Copy">${ICON.copy}</button>
      <button class="msg-action-btn" data-action="share-msg" title="Share">${ICON.share}</button>
      <button class="msg-action-btn like-btn" data-action="like" title="Like">${ICON.thumbsUp}</button>
      <button class="msg-action-btn dislike-btn" data-action="dislike" title="Dislike">${ICON.thumbsDown}</button>`;

    footer.querySelector('[data-action="copy-msg"]').addEventListener("click", () => copyText(content, "Message"));
    footer.querySelector('[data-action="share-msg"]').addEventListener("click", () => shareText(content));

    if (meta.stopped) {
      footer.querySelector('[data-action="retry"]').addEventListener("click", () => retryStoppedMessage(meta.retryPrompt));
    }

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

// Shows the AI's short "what I'm about to do and why" before file changes land — the
// step-by-step visibility a person would otherwise only get once, from the separate
// plan-confirmation modal. This appears on every file-changing turn, not just ones that
// were flagged as "complex" enough to trigger a full plan-first pass.
function addReasoningMsg(text) {
  const log = $("chatLog");
  $("emptyState").classList.add("hidden");
  const div = document.createElement("div");
  div.className = "msg reasoning";
  div.innerHTML = `<span class="reasoning-icon">${ICON.listChecks}</span><span class="reasoning-text">${escapeHtml(text)}</span>`;
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
