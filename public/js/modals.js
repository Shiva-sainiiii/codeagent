// modals.js — custom modal/toast system replacing window.prompt/confirm/alert (which look
// jarring against the app's own dark theme on mobile).

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

// ---------- HAPTIC FEEDBACK ----------
// Thin wrapper around navigator.vibrate — silently no-ops where unsupported (iOS Safari,
// desktop) rather than throwing. Short, deliberately subtle durations so it reads as a
// premium tactile cue, not a buzz.
function haptic(kind = "tap") {
  if (!navigator.vibrate) return;
  const patterns = {
    tap: 10,
    success: [10, 30, 10],
    warning: 25,
    longPress: 15,
  };
  try {
    navigator.vibrate(patterns[kind] ?? patterns.tap);
  } catch (e) {
    // some browsers throw if called outside a user gesture — safe to ignore
  }
}
