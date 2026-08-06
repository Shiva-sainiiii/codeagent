// preview.js — live preview (HTML/CSS/JS rendering in an iframe), diff view, and the
// code view / manual-edit modal. Everything here is about *looking at* and *manually
// touching* file content, as opposed to chat-driven AI edits (that's chat-logic.js).

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

// ---------- DIFF VIEW ----------
// Highlights a single line of code using Prism if it's already loaded (never triggers a
// fresh CDN load itself — that only happens via applySyntaxHighlight in the code view, so
// diffs opened before that has run once just show plain escaped text, which is a harmless
// degrade). Used by both the review-card diff preview and the full-screen diff modal so a
// pending change is colored the same way the file itself would be.
function highlightLineForDiff(text, lang) {
  if (window.Prism && window.Prism.languages && lang && window.Prism.languages[lang]) {
    try {
      return window.Prism.highlight(text, window.Prism.languages[lang], lang);
    } catch (e) {
      // fall through to plain escaped text below
    }
  }
  return escapeHtml(text);
}
function langForPath(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return PRISM_LANG_MAP[ext];
}

// Shared renderer so both the history-based diff (undo/redo comparisons) and a pending
// AI-review diff (before it's even applied) go through the exact same rendering path —
// same styling, same full-screen modal, no duplicated markup logic between the two.
function renderDiffModal(path, before, after) {
  const diffLines = computeLineDiff(before, after);
  const lang = langForPath(path);
  const html = diffLines.map((line) => {
    const cls = line.type === "added" ? "diff-added" : line.type === "removed" ? "diff-removed" : "diff-same";
    const prefix = line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
    return `<div class="diff-line ${cls}"><span class="diff-prefix">${prefix}</span><span class="diff-text">${highlightLineForDiff(line.text, lang)}</span></div>`;
  }).join("");

  $("diffFileName").textContent = path;
  $("diffContent").innerHTML = html || `<p style="color:var(--text-dim);padding:10px;">No differences</p>`;
  const modal = $("diffModal");
  modal.dataset.currentPath = path;
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("show"));
}

function openDiffModal(path) {
  const history = loadFileHistory(currentProjectId);
  const stack = history[path];
  if (!stack || !stack.length) return showToast("No earlier version to compare");
  const previous = stack[stack.length - 1];
  const current = currentFiles[path] || "";
  renderDiffModal(path, previous.content, current);
}

// Full-screen diff for a change that hasn't been applied yet (the pending-review card's
// "expand" button) — takes the before/after pair directly instead of reading file history,
// since a pending change by definition isn't in currentFiles or history yet.
function openDiffModalFromPair(path, before, after) {
  renderDiffModal(path, before, after);
}
function closeDiffModal() {
  const modal = $("diffModal");
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
  const textarea = $("codeViewTextarea");
  textarea.value = content;
  textarea.dataset.originalContent = content;
  textarea.dataset.path = path;
  setCodeViewEditing(false);
  applySyntaxHighlight(path, content);
  renderCodeViewGutter(content);
  setupCodeViewScrollSync();
  const modal = $("codeViewModal");
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("show"));
}
function closeCodeViewModal() {
  const modal = $("codeViewModal");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 220);
}
function setCodeViewEditing(editing) {
  const textarea = $("codeViewTextarea");
  const highlightEl = $("codeViewHighlight");
  textarea.readOnly = !editing;
  $("codeViewEditBtn").classList.toggle("hidden", editing);
  $("codeViewSaveBtn").classList.toggle("hidden", !editing);
  $("codeViewCancelEditBtn").classList.toggle("hidden", !editing);
  textarea.classList.toggle("editing", editing);
  // The highlight layer stays visible in BOTH modes now — in editing mode the textarea
  // becomes a transparent, interactive overlay on top of it (see .raw-visible in CSS),
  // with an "input" listener (wired below) keeping the colors in sync as the user types.
  textarea.classList.toggle("raw-visible", editing);
  if (editing) {
    textarea.focus();
    if (!textarea.dataset.highlightSyncBound) {
      textarea.dataset.highlightSyncBound = "1";
      textarea.addEventListener("input", () => {
        applySyntaxHighlight(textarea.dataset.path, textarea.value);
        renderCodeViewGutter(textarea.value);
      });
    }
  }
  // Line numbers should track whichever view is actually active and scrollable right now.
  syncCodeViewGutterScroll();
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
  applySyntaxHighlight(path, after);
  renderCodeViewGutter(after);
  setCodeViewEditing(false);
}
function cancelCodeViewEdit() {
  const textarea = $("codeViewTextarea");
  textarea.value = textarea.dataset.originalContent;
  applySyntaxHighlight(textarea.dataset.path, textarea.value);
  renderCodeViewGutter(textarea.value);
  setCodeViewEditing(false);
}

// ---------- LINE NUMBER GUTTER ----------
// Renders one number per line into the fixed-width gutter column. Kept as a plain div per
// line (matching line-height with the code panes) rather than a single pre-formatted block,
// so it's simple to keep vertically in sync via scrollTop mirroring regardless of which of
// the two overlapping code panes (highlight vs textarea) is the one currently scrolling.
function renderCodeViewGutter(content) {
  const gutter = $("codeViewGutter");
  if (!gutter) return;
  const lineCount = content.split("\n").length;
  let html = "";
  for (let i = 1; i <= lineCount; i++) html += `<div>${i}</div>`;
  gutter.innerHTML = html;
}

// Whichever pane is actually visible/interactive right now (highlight in read-only mode,
// textarea in editing mode) drives the gutter's scroll position — mirrored on every scroll
// event from that pane, plus once immediately whenever the mode switches (view toggling
// alone doesn't fire a scroll event, so the gutter would otherwise be stale until the next
// manual scroll).
let codeViewScrollSyncSetup = false;
function setupCodeViewScrollSync() {
  if (codeViewScrollSyncSetup) return; // listeners only need to be attached once per page load
  codeViewScrollSyncSetup = true;
  const highlightEl = $("codeViewHighlight");
  const textarea = $("codeViewTextarea");
  const gutter = $("codeViewGutter");
  if (!highlightEl || !textarea || !gutter) return;
  highlightEl.addEventListener("scroll", () => { gutter.scrollTop = highlightEl.scrollTop; });
  textarea.addEventListener("scroll", () => { gutter.scrollTop = textarea.scrollTop; });
}
function syncCodeViewGutterScroll() {
  const gutter = $("codeViewGutter");
  if (!gutter) return;
  const textarea = $("codeViewTextarea");
  const highlightEl = $("codeViewHighlight");
  const active = textarea && textarea.classList.contains("raw-visible") ? textarea : highlightEl;
  if (active) gutter.scrollTop = active.scrollTop;
}

// ---------- SYNTAX HIGHLIGHTING (Prism.js, loaded from CDN) ----------
// Only the read-only overlay is highlighted — the actual <textarea> stays plain so typing/
// editing keeps native browser text-editing behavior (cursor, selection, autocomplete).
// The two are visually stacked; whichever is relevant (raw vs highlighted) is shown.
const PRISM_LANG_MAP = {
  html: "markup", htm: "markup", xml: "markup", svg: "markup",
  css: "css",
  js: "javascript", jsx: "jsx", mjs: "javascript",
  ts: "javascript", tsx: "jsx", // Prism's TS/TSX grammars need extra component files we
  // don't load below; falling back to the JS/JSX highlighter still colors the vast
  // majority of TS syntax correctly (types are the only thing that won't get tinted).
  json: "json",
  py: "python",
  md: "markdown",
};

// Loading each language as its own static <script src> — NOT via Prism's autoloader plugin.
// The autoloader resolves its component URLs relative to its own script tag by inspecting
// document.currentScript / getElementsByTagName at load time, which is exactly the kind of
// runtime path-guessing that breaks silently in some deployment setups (proxied/rewritten
// asset paths, certain CSP configurations, script injected after the fact rather than
// present in the initial HTML) — when it breaks, EVERY highlight request just times out
// with no visible error, which matches "no colors, plain white text" exactly. Loading the
// handful of languages this app actually needs as plain fixed-URL scripts sidesteps that
// resolution step entirely — there's no relative path to get wrong.
const PRISM_VERSION = "1.29.0";
const PRISM_BASE = `https://cdnjs.cloudflare.com/ajax/libs/prism/${PRISM_VERSION}`;
const PRISM_LANGUAGE_SCRIPTS = [
  `${PRISM_BASE}/components/prism-markup.min.js`,
  `${PRISM_BASE}/components/prism-css.min.js`,
  `${PRISM_BASE}/components/prism-clike.min.js`, // dependency for javascript
  `${PRISM_BASE}/components/prism-javascript.min.js`,
  `${PRISM_BASE}/components/prism-jsx.min.js`,
  `${PRISM_BASE}/components/prism-json.min.js`,
  `${PRISM_BASE}/components/prism-python.min.js`,
  `${PRISM_BASE}/components/prism-markdown.min.js`,
];

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false); // degrade gracefully — plain text stays as fallback
    document.head.appendChild(script);
  });
}

let prismLoadPromise = null;
function ensurePrismLoaded() {
  if (window.Prism && window.Prism.languages && window.Prism.languages.javascript) {
    return Promise.resolve();
  }
  if (prismLoadPromise) return prismLoadPromise;
  prismLoadPromise = (async () => {
    const coreOk = await loadScript(`${PRISM_BASE}/components/prism-core.min.js`);
    if (!coreOk || !window.Prism) return; // CDN unreachable — plain text fallback stands
    // clike and markup must land before javascript/jsx (grammar extension order matters),
    // so load them sequentially rather than all in parallel.
    for (const src of PRISM_LANGUAGE_SCRIPTS) {
      await loadScript(src);
    }
  })();
  return prismLoadPromise;
}

async function applySyntaxHighlight(path, content) {
  const highlightEl = $("codeViewHighlight");
  if (!highlightEl) return;

  const ext = (path.split(".").pop() || "").toLowerCase();
  const lang = PRISM_LANG_MAP[ext];
  const prismReady = window.Prism && window.Prism.languages && (!lang || window.Prism.languages[lang] || window.Prism.languages.markup);

  // If Prism is already loaded (the common case after the very first call — see the
  // eager warm-up in app.js's init), paint the highlighted version directly and skip the
  // plain-text intermediate step below entirely. Without this, every single keystroke
  // while editing repainted plain text first and only replaced it with colors a moment
  // later once the (here, near-instant but still async) Prism path resolved — on fast
  // typing that flicker made it look like syntax colors simply weren't updating, since
  // the next keystroke's plain-text repaint would land before the previous one's colored
  // result did.
  if (prismReady && lang) {
    try {
      const grammar = window.Prism.languages[lang] || window.Prism.languages.markup;
      const highlighted = window.Prism.highlight(content, grammar, lang);
      highlightEl.innerHTML = `<pre class="language-${lang}"><code>${highlighted}</code></pre>`;
      return;
    } catch (e) {
      // fall through to the plain-text path below
    }
  }

  // Show plain (escaped) text IMMEDIATELY — never leave the box blank while we wait on
  // the CDN. This was the actual cause of "code view opens blank": Prism loads async,
  // and on a slow/flaky connection (or if the CDN request fails entirely) the highlight
  // box's innerHTML was never set at all, so nothing ever appeared. Painting plain text
  // first means the user always sees the code instantly; highlighting is a progressive
  // upgrade on top of that, not a blocking requirement. This path only runs now on the
  // first call for a language (before Prism/that grammar has finished loading) or for
  // unsupported languages, rather than on every single keystroke.
  highlightEl.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`;

  if (!lang) return; // unsupported language — plain text already shown, nothing more to do

  // Guard the CDN load with a timeout so a hung/slow request can't leave us stuck —
  // plain text (already painted above) stays as the permanent fallback in that case.
  try {
    await Promise.race([
      ensurePrismLoaded(),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
  } catch (e) {
    return; // plain text already shown
  }

  if (!window.Prism || !window.Prism.languages) return; // plain text already shown

  // Bail out silently if the user has since closed the modal or switched files while we
  // were waiting on the network — avoids painting stale highlighted content over a
  // different file that may already be showing.
  if ($("codeViewTextarea").dataset.path !== path) return;

  try {
    const grammar = window.Prism.languages[lang] || window.Prism.languages.markup;
    if (!grammar) return; // language script failed to load — plain text stays
    const highlighted = window.Prism.highlight(content, grammar, lang);
    highlightEl.innerHTML = `<pre class="language-${lang}"><code>${highlighted}</code></pre>`;
  } catch (e) {
    // Highlighting failed for some reason — plain text (painted at the top of this
    // function) is already there and stays as-is. Nothing to do.
  }
}
