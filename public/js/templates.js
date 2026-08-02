// templates.js — instant-start project templates. Zero LLM cost: pure token savings for
// the common "give me a blank X to build on" request.
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
