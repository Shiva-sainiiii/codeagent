// chat-logic.js — the actual conversation engine: local intent routing (zero-cost commands),
// token-efficient context building, streaming request handling, and applying AI file edits.

// ---------- INTENT ROUTING (local, no LLM cost) ----------
// Returns handled=true if it fully handled the message locally.
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
      addSystemMsg("Pehle koi file preview mein kholo (Files → preview icon).");
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
let currentRequestController = null; // AbortController for the in-flight request, so Stop can actually cancel it

async function sendMessage() {
  const input = $("chatInput");
  const text = input.value.trim();
  if (!text) return;
  if (!currentProjectId) {
    createProject("My Project");
  }

  input.value = "";
  autoResize();
  haptic("tap");

  const userMsg = { role: "user", content: text, id: genId(), ts: Date.now() };
  currentChat.push(userMsg);
  appendMsgToDom("user", text, null, { id: userMsg.id, ts: userMsg.ts });
  saveChat(currentProjectId, currentChat, chatSummary);

  // 1) try local intent first (saves LLM cost)
  if (tryLocalIntent(text)) {
    $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
    return;
  }

  // 2) complex-looking requests get a plan-first pass — a short, cheap call that proposes
  // steps without touching any files, so the user can confirm scope before real work (and
  // real tokens) are spent executing something that might not be what they meant.
  if (looksLikeComplexRequest(text)) {
    await requestPlan(text);
    return;
  }

  // 3) otherwise call LLM directly (streaming)
  await runLlmRequest(text);
}

// Asks the AI for a short numbered plan only (no file content generated yet) — a small,
// cheap call. The user then confirms or edits the request before the real (expensive)
// generation call happens.
async function requestPlan(text) {
  pushStatus("Planning...");
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: buildTrimmedMessages(),
        summary: chatSummary,
        fileContext: buildFileContext(text),
        planOnly: true,
      }),
    });
    const data = await res.json();
    clearStatus();

    if (data.ok && Array.isArray(data.planSteps) && data.planSteps.length) {
      openPlanConfirm(data.planSteps, text);
    } else {
      // Model didn't return a usable plan — don't block the user, just proceed normally.
      await runLlmRequest(text);
    }
  } catch (e) {
    clearStatus();
    // Planning call failed — fall back to executing directly rather than leaving the
    // user stuck with no path forward.
    await runLlmRequest(text);
  }
}

// Re-sends a prompt after it was stopped mid-response, without re-adding the user message
// bubble (it's already in the chat) — used by the Retry button on a stopped message.
async function retryStoppedMessage(promptText) {
  if (!promptText) return showToast("Original message not found");
  if (currentRequestController) return; // a request is already in flight, ignore
  await runLlmRequest(promptText);
}

async function runLlmRequest(text) {
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

    let results = [];
    let pendingReview = [];

    if (filesToApply.length) {
      let anyEditFailed = false;

      // Optional review-before-applying: only meaningfully protective for EDITS to existing
      // files (something could be overwritten) — new file creation always applies immediately,
      // since there's nothing to lose and undo/redo already covers reverting it if unwanted.
      const reviewMode = isReviewModeEnabled();
      const editsToExisting = filesToApply.filter((f) => f.action !== "create" && currentFiles[f.path] !== undefined);
      const safeToApplyNow = filesToApply.filter((f) => !(reviewMode && editsToExisting.includes(f)));
      pendingReview = reviewMode ? editsToExisting : [];

      // Apply the safe ones now (fast, synchronous) — this is the real work, and it
      // already happens before any of the display delay below, so it's not blocked by it.
      results = safeToApplyNow.map((f) => ({ f, result: applyFileOps([f]) }));

      // Scale the reveal pace by file count: for 1-2 files, a readable ~500ms/file total
      // pace feels intentional. For a big multi-file generation (5+ files), waiting
      // 2.5s+ just to *show* work that's already done defeats the point of applying
      // everything up front — so the per-step delay shrinks as the batch grows.
      const n = results.length;
      const stepDelay = n <= 2 ? 350 : n <= 4 ? 180 : 80;
      const settleDelay = n <= 2 ? 150 : n <= 4 ? 90 : 40;

      for (const { f, result } of results) {
        const verb = (f.action === "create" || currentFiles[f.path] === f.content) ? "Creating" : "Editing";
        updateStatus(`${verb} ${escapeHtml(f.path)}...`);
        await sleep(stepDelay);
        if (result.failed.length) anyEditFailed = true;
        const doneVerb = f.action === "create" ? "Created" : "Updated";
        const label = result.failed.length
          ? `Edit skipped (no match): ${escapeHtml(f.path)}`
          : `${doneVerb} ${escapeHtml(f.path)}`;
        updateStatus(label);
        await sleep(settleDelay);
      }
      finishStatus(anyEditFailed || pendingReview.length ? "Done — review pending" : "Done");
      renderFileList();
      $("projectSub").textContent = `${Object.keys(currentFiles).length} files`;
    } else {
      clearStatus();
    }

    const touchedFiles = results.map(({ f }) => f.path);
    const botMsg = { role: "bot", content: replyText, fileChips: touchedFiles, id: genId(), ts: Date.now() };
    currentChat.push(botMsg);
    saveChat(currentProjectId, currentChat, chatSummary);
    appendMsgToDom("bot", replyText, touchedFiles, { id: botMsg.id, ts: botMsg.ts });

    if (pendingReview.length) {
      renderPendingReviewCard(pendingReview);
    }
    haptic("success");
  } catch (e) {
    if (streamingBubble) streamingBubble.div.remove();
    if (e.name === "AbortError") {
      // User pressed Stop — save whatever text had already streamed in (if any) rather
      // than discarding it, since tokens for that partial response were already spent.
      const partialContent = partialTextSoFar
        ? partialTextSoFar + "\n\n_[Stopped by user]_"
        : "_[Stopped by user]_";
      const stoppedMsg = {
        role: "bot",
        content: partialContent,
        id: genId(),
        ts: Date.now(),
        stopped: true,
        retryPrompt: text, // the original user message, so Retry can re-send exactly this
      };
      currentChat.push(stoppedMsg);
      saveChat(currentProjectId, currentChat, chatSummary);
      appendMsgToDom("bot", partialContent, null, { id: stoppedMsg.id, ts: stoppedMsg.ts, stopped: true, retryPrompt: text });
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
