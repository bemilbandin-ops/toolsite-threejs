/* VECTOR — Personal Workspace. All tools work client-side; Three.js is optional. */
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let toastTimeout;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 2400);
}
async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const temp = document.createElement('textarea');
      temp.value = value;
      temp.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.append(temp);
      temp.select();
      const successful = document.execCommand('copy');
      temp.remove();
      if (!successful) throw new Error('Copy not supported');
    }
    toast('Copied to clipboard');
  } catch {
    toast('Copy unavailable in this browser');
  }
}
function secureRandom(max) {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000) throw new RangeError('Invalid random bound');
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  let value;
  do { crypto.getRandomValues(buffer); value = buffer[0]; } while (value >= limit);
  return value % max;
}

// Navigation and clock
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#scrim').hidden = true;
}
$('#menu-btn').addEventListener('click', () => {
  const open = $('#sidebar').classList.toggle('open');
  $('#scrim').hidden = !open;
});
$('#scrim').addEventListener('click', closeSidebar);
$$('.nav-link').forEach(link => link.addEventListener('click', closeSidebar));
const navLinks = $$('.nav-link');
function selectNav(hash) {
  navLinks.forEach(link => {
    const selected = link.getAttribute('href') === hash;
    link.classList.toggle('active', selected);
    link.querySelector('.nav-dot')?.remove();
    if (selected) {
      const dot = document.createElement('span'); dot.className = 'nav-dot'; link.append(dot);
      $('.breadcrumb strong').textContent = link.textContent.trim().toUpperCase();
    }
  });
}
window.addEventListener('hashchange', () => selectNav(location.hash || '#top'));
selectNav(location.hash || '#top');
function updateClock() {
  const now = new Date();
  $('#clock').textContent = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  $('#today').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit' }).format(now).toUpperCase();
  $('#year').textContent = now.getFullYear();
}
updateClock(); setInterval(updateClock, 1000);

// Focus timer: expiry based on wall-clock timestamps, so it stays accurate in background tabs.
let selectedSeconds = 25 * 60;
let remainingSeconds = selectedSeconds;
let endTime = 0;
let timerRunning = false;
const timerCircle = $('#timer-progress');
const circleLength = 2 * Math.PI * 83;
timerCircle.style.strokeDasharray = String(circleLength);
function updateTimer() {
  if (timerRunning) {
    remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    if (remainingSeconds === 0) {
      timerRunning = false;
      $('#timer-state').textContent = 'SESSION COMPLETE';
      toast('Session complete. Nice work.');
    }
  }
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  $('#timer-display').textContent = `${minutes}:${seconds}`;
  document.title = timerRunning ? `${minutes}:${seconds} • VECTOR` : 'VECTOR — Your personal workspace';
  timerCircle.style.strokeDashoffset = String(circleLength * (1 - remainingSeconds / selectedSeconds));
  $('#timer-start').innerHTML = `${timerRunning ? 'Pause timer' : remainingSeconds === selectedSeconds ? 'Start focus' : 'Resume timer'} <svg aria-hidden="true"><use href="#i-arrow"/></svg>`;
}
$('#timer-start').addEventListener('click', () => {
  if (timerRunning) {
    remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    timerRunning = false;
    $('#timer-state').textContent = 'PAUSED';
  } else {
    if (remainingSeconds <= 0) remainingSeconds = selectedSeconds;
    endTime = Date.now() + remainingSeconds * 1000;
    timerRunning = true;
    $('#timer-state').textContent = 'STAY IN THE ZONE';
  }
  updateTimer();
});
function resetTimer() {
  timerRunning = false;
  remainingSeconds = selectedSeconds;
  $('#timer-state').textContent = 'READY WHEN YOU ARE';
  updateTimer();
}
$('#timer-reset').addEventListener('click', resetTimer);
$$('[data-minutes]').forEach(button => button.addEventListener('click', () => {
  selectedSeconds = Number(button.dataset.minutes) * 60;
  $$('.segmented button').forEach(b => b.classList.toggle('selected', b === button));
  $('#timer-mode').textContent = selectedSeconds === 5 * 60 ? 'SHORT BREAK' : 'FOCUS SESSION';
  resetTimer();
}));
setInterval(updateTimer, 250);
updateTimer();

// Notes: stored only in the current browser and origin.
const notesStorageKey = 'vector.notes.v1';
function loadNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem(notesStorageKey) || '[]');
    return Array.isArray(stored) ? stored.filter(note => typeof note.id === 'string' && typeof note.text === 'string').slice(0, 200) : [];
  } catch { return []; }
}
let notes = loadNotes();
function saveNotes() {
  try { localStorage.setItem(notesStorageKey, JSON.stringify(notes)); }
  catch { toast('Browser storage is unavailable'); }
  $('#notes-count').textContent = `${notes.length} NOTE${notes.length === 1 ? '' : 'S'} SAVED LOCALLY`;
}
function renderNotes(focusId = null) {
  const list = $('#notes-list');
  list.replaceChildren();
  if (!notes.length) {
    const empty = document.createElement('div');
    empty.className = 'notes-empty';
    empty.textContent = 'A clear head starts with a clear space.\nPress + to add your first note.';
    empty.style.whiteSpace = 'pre-line';
    list.append(empty);
  }
  notes.forEach(note => {
    const article = document.createElement('article'); article.className = 'note';
    const top = document.createElement('div'); top.className = 'note-top';
    const title = document.createElement('input');
    title.type = 'text'; title.placeholder = 'Untitled note'; title.value = note.title || '';
    title.setAttribute('aria-label', 'Note title');
    title.addEventListener('input', () => { note.title = title.value; saveNotes(); });
    const del = document.createElement('button'); del.type = 'button'; del.title = 'Delete note'; del.setAttribute('aria-label', 'Delete note');
    del.innerHTML = '<svg aria-hidden="true"><use href="#i-trash"/></svg>';
    del.addEventListener('click', () => { notes = notes.filter(item => item.id !== note.id); saveNotes(); renderNotes(); });
    top.append(title, del);
    const body = document.createElement('textarea'); body.placeholder = 'Write something...'; body.value = note.text;
    body.setAttribute('aria-label', 'Note content');
    body.addEventListener('input', () => { note.text = body.value; saveNotes(); });
    const timestamp = document.createElement('small'); timestamp.textContent = 'SAVED ON THIS DEVICE';
    article.append(top, body, timestamp);
    list.append(article);
    if (note.id === focusId) title.focus();
  });
  saveNotes();
}
$('#add-note').addEventListener('click', () => {
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${secureRandom(1000000)}`;
  notes.unshift({ id, title: '', text: '' });
  saveNotes(); renderNotes(id);
});
renderNotes();

// JSON tools, includes readable parser error messages.
const jsonInput = $('#json-input');
function jsonLineNumbers() {
  const number = jsonInput.value.split('\n').length;
  $('#json-lines').textContent = Array.from({ length: number }, (_, i) => String(i + 1).padStart(2, '0')).join('\n');
}
function jsonMessage(message, error = false) {
  $('#json-feedback').textContent = message;
  $('#json-feedback').classList.toggle('error', error);
  $('#json-state').innerHTML = `<span class="status-light" style="background:${error ? '#fa99a1' : '#c3f46d'}"></span> ${error ? 'INVALID' : 'VALID'}`;
}
function parseJSON() {
  if (!jsonInput.value.trim()) throw new Error('Add some JSON first');
  return JSON.parse(jsonInput.value);
}
$('#json-format').addEventListener('click', () => {
  try { jsonInput.value = JSON.stringify(parseJSON(), null, 2); jsonLineNumbers(); jsonMessage('JSON formatted successfully'); }
  catch (err) { jsonMessage(err.message, true); }
});
$('#json-minify').addEventListener('click', () => {
  try { jsonInput.value = JSON.stringify(parseJSON()); jsonLineNumbers(); jsonMessage('JSON minified successfully'); }
  catch (err) { jsonMessage(err.message, true); }
});
$('#json-validate').addEventListener('click', () => {
  try { parseJSON(); jsonMessage('Valid JSON. No syntax errors found.'); }
  catch (err) { jsonMessage(err.message, true); }
});
$('#json-copy').addEventListener('click', () => {
  if (!jsonInput.value) { toast('Nothing to copy'); return; }
  copyText(jsonInput.value);
});
jsonInput.addEventListener('input', () => { jsonLineNumbers(); $('#json-feedback').textContent = ''; });
jsonInput.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  const start = jsonInput.selectionStart, end = jsonInput.selectionEnd;
  jsonInput.setRangeText('  ', start, end, 'end');
  jsonLineNumbers();
});
jsonLineNumbers();

// Color palettes: analogous plus contrasting accents, with accessible copy targets.
const initialPalette = ['#122A2F', '#235F60', '#4B9D90', '#B9DC91', '#D9F29B'];
function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}
function paletteGenerate() {
  const hue = secureRandom(360);
  return [
    hslHex(hue, .39, .14), hslHex(hue + 16, .41, .28),
    hslHex(hue + 37, .46, .46), hslHex(hue + 58, .65, .68),
    hslHex(hue + 83, .70, .81)
  ];
}
function renderPalette(colors) {
  const palette = $('#palette'); palette.replaceChildren();
  colors.forEach(hex => {
    const swatch = document.createElement('button');
    swatch.className = 'swatch'; swatch.type = 'button'; swatch.style.background = hex;
    swatch.title = `Copy ${hex}`;
    swatch.setAttribute('aria-label', `Copy ${hex}`);
    const label = document.createElement('span'); label.textContent = hex;
    swatch.append(label);
    swatch.addEventListener('click', () => copyText(hex));
    palette.append(swatch);
  });
}
renderPalette(initialPalette);
$('#colors-generate').addEventListener('click', () => renderPalette(paletteGenerate()));

// Password lab: unbiased cryptographically secure picks; one char from each selected group.
const passwordGroups = [
  ['#pass-upper', 'ABCDEFGHJKLMNPQRSTUVWXYZ'],
  ['#pass-lower', 'abcdefghjkmnpqrstuvwxyz'],
  ['#pass-number', '23456789'],
  ['#pass-symbol', '!@#$%&*?-_+=']
];
const passLength = $('#password-length');
function passwordOptions() {
  return passwordGroups.filter(([selector]) => $(selector).checked).map(([, alphabet]) => alphabet);
}
function renderStrength() {
  $('#password-length-value').textContent = passLength.value;
  const groupCount = passwordOptions().length;
  const length = Number(passLength.value);
  const score = Math.min(100, Math.round((length / 24) * 57 + groupCount * 10));
  $('#pass-strength-fill').style.width = `${score}%`;
  $('#pass-strength-label').textContent = `STRENGTH / ${score >= 75 ? 'VERY STRONG' : score >= 50 ? 'STRONG' : score >= 30 ? 'MODERATE' : 'WEAK'}`;
}
function newPassword() {
  const alphabets = passwordOptions();
  if (!alphabets.length) { toast('Select at least one character type'); return; }
  const length = Number(passLength.value);
  const combined = alphabets.join('');
  const chars = alphabets.map(alphabet => alphabet[secureRandom(alphabet.length)]);
  while (chars.length < length) chars.push(combined[secureRandom(combined.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  $('#password-output').textContent = chars.join('');
  renderStrength();
}
passLength.addEventListener('input', () => { renderStrength(); newPassword(); });
passwordGroups.forEach(([selector]) => $(selector).addEventListener('change', () => { renderStrength(); newPassword(); }));
$('#password-generate').addEventListener('click', newPassword);
$('#password-copy').addEventListener('click', () => {
  const value = $('#password-output').textContent;
  if (value.includes('•')) return toast('Generate a password first');
  copyText(value);
});
newPassword();

// Unit converter. Digital storage uses SI powers of 1000 and IEC powers of 1024.
const units = {
  length: [['Millimeters', 'mm', .001], ['Centimeters', 'cm', .01], ['Meters', 'm', 1], ['Kilometers', 'km', 1000], ['Inches', 'in', .0254], ['Feet', 'ft', .3048], ['Yards', 'yd', .9144], ['Miles', 'mi', 1609.344]],
  mass: [['Milligrams', 'mg', .001], ['Grams', 'g', 1], ['Kilograms', 'kg', 1000], ['Ounces', 'oz', 28.349523125], ['Pounds', 'lb', 453.59237], ['Metric tons', 't', 1000000]],
  temperature: [['Celsius', '°C', 0], ['Fahrenheit', '°F', 0], ['Kelvin', 'K', 0]],
  data: [['Bytes', 'B', 1], ['Kilobytes', 'kB', 1000], ['Megabytes', 'MB', 1000000], ['Gigabytes', 'GB', 1e9], ['Terabytes', 'TB', 1e12], ['Kibibytes', 'KiB', 1024], ['Mebibytes', 'MiB', 1048576], ['Gibibytes', 'GiB', 1073741824], ['Tebibytes', 'TiB', 1099511627776]]
};
const convertCategory = $('#convert-type');
const convertFrom = $('#convert-from');
const convertTo = $('#convert-to');
const convertInput = $('#convert-input');
function setUnits() {
  const category = convertCategory.value;
  [convertFrom, convertTo].forEach(select => {
    select.replaceChildren();
    units[category].forEach(([name, symbol], idx) => {
      const option = document.createElement('option'); option.value = String(idx); option.textContent = `${name} (${symbol})`;
      select.append(option);
    });
  });
  convertFrom.value = '2';
  convertTo.value = category === 'temperature' ? '1' : '3';
  convertUpdate();
}
function formatNumber(value) {
  if (!Number.isFinite(value)) return 'Out of range';
  if (value === 0) return '0';
  if (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-7) return value.toExponential(6);
  return Number(value.toPrecision(11)).toLocaleString(undefined, { maximumFractionDigits: 10 });
}
function convertUpdate() {
  const value = Number(convertInput.value);
  if (convertInput.value.trim() === '' || !Number.isFinite(value)) { $('#convert-output').textContent = '—'; return; }
  const category = convertCategory.value;
  const from = units[category][Number(convertFrom.value)];
  const to = units[category][Number(convertTo.value)];
  if (!from || !to) return;
  let result;
  if (category === 'temperature') {
    const celsius = Number(convertFrom.value) === 0 ? value : Number(convertFrom.value) === 1 ? (value - 32) * 5 / 9 : value - 273.15;
    result = Number(convertTo.value) === 0 ? celsius : Number(convertTo.value) === 1 ? celsius * 9 / 5 + 32 : celsius + 273.15;
  } else result = value * from[2] / to[2];
  $('#convert-output').textContent = formatNumber(result);
}
convertCategory.addEventListener('change', setUnits);
[convertFrom, convertTo, convertInput].forEach(node => node.addEventListener('input', convertUpdate));
$('#convert-swap').addEventListener('click', () => {
  const a = convertFrom.value;
  convertFrom.value = convertTo.value;
  convertTo.value = a;
  convertUpdate();
});
setUnits();

// Search palette: a keyboard-accessible launcher.
const commandItems = [
  ['Overview', 'Home', '#top', 'i-grid'], ['Focus timer', 'Productivity', '#focus', 'i-timer'],
  ['Quick notes', 'Organization', '#notes', 'i-note'], ['JSON studio', 'Developer', '#json', 'i-code'],
  ['Color lab', 'Design', '#colors', 'i-color'], ['Password lab', 'Security', '#password', 'i-lock'],
  ['Unit converter', 'Utility', '#converter', 'i-swap']
];
const commandDialog = $('#command-dialog');
function closeCommand() { if (commandDialog.open) commandDialog.close(); }
function renderCommands(query = '') {
  const results = $('#command-results'); results.replaceChildren();
  const filtered = commandItems.filter(([name, kind]) => `${name} ${kind}`.toLowerCase().includes(query.toLowerCase()));
  if (!filtered.length) {
    const noMatch = document.createElement('p');
    noMatch.textContent = 'No tools match your search.';
    noMatch.style.cssText = 'padding:12px;color:#91a5b1';
    results.append(noMatch);
  }
  filtered.forEach(([name, kind, href, icon]) => {
    const button = document.createElement('button'); button.className = 'command-result';
    button.innerHTML = `<svg aria-hidden="true"><use href="#${icon}"/></svg>`;
    const title = document.createElement('span'); title.textContent = name;
    const badge = document.createElement('small'); badge.textContent = kind.toUpperCase();
    button.append(title, badge);
    button.addEventListener('click', () => {
      closeCommand();
      location.hash = href;
      if (href === '#top') window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
    });
    results.append(button);
  });
}
function openCommand() {
  $('#command-input').value = '';
  renderCommands();
  if (!commandDialog.open) commandDialog.showModal();
  $('#command-input').focus();
}
$('#search-open').addEventListener('click', openCommand);
$('#command-close').addEventListener('click', closeCommand);
$('#command-input').addEventListener('input', event => renderCommands(event.target.value));
$('#command-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') $('#command-results button')?.click();
  if (event.key === 'ArrowDown') { event.preventDefault(); $('#command-results button')?.focus(); }
});
$('#command-results').addEventListener('keydown', event => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const buttons = $$('#command-results button');
  const current = buttons.indexOf(document.activeElement);
  const next = (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
});
commandDialog.addEventListener('click', event => { if (event.target === commandDialog) closeCommand(); });
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); commandDialog.open ? closeCommand() : openCommand();
  }
});

// WebGL hero: progressive enhancement. Failure does not impact the tools.
async function startThree() {
  if (reducedMotion.matches || !window.WebGLRenderingContext) return;
  const canvas = $('#scene');
  if (!canvas) return;
  let THREE;
  try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'); }
  catch (err) { console.info('Three.js could not load. Showing CSS fallback.', err); return; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (err) { console.info('WebGL is unavailable. Showing CSS fallback.', err); return; }
  const { Scene, PerspectiveCamera, Mesh, TorusGeometry, IcosahedronGeometry, MeshPhysicalMaterial, MeshBasicMaterial, Color, Group, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, AdditiveBlending, AmbientLight, PointLight } = THREE;
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, .1, 100);
  camera.position.set(0, .5, 8.6);
  scene.add(new AmbientLight(0xffffff, 1.25));
  const topLight = new PointLight(0xbaffaf, 95, 22); topLight.position.set(1, 3, 4); scene.add(topLight);
  const edgeLight = new PointLight(0x47d5ed, 70, 18); edgeLight.position.set(-4, -2, 1); scene.add(edgeLight);
  const assembly = new Group(); scene.add(assembly);
  const core = new Mesh(new IcosahedronGeometry(1.55, 9), new MeshPhysicalMaterial({ color:new Color('#4a8582'), metalness:.42, roughness:.19, transmission:.12, thickness:1.2, clearcoat:1, clearcoatRoughness:.1, flatShading:true }));
  assembly.add(core);
  const wire = new Mesh(new IcosahedronGeometry(1.57, 2), new THREE.MeshBasicMaterial({color:0x9feacf,wireframe:true,transparent:true,opacity:.17}));
  assembly.add(wire);
  const rings = [
    [1.98,.018,0x8ef5d9,.57, .25, .1],
    [2.30,.012,0x6cd7e6,.42, 1.13, .6],
    [2.63,.008,0xbfffa6,.22, -.66, -.35]
  ].map(([radius,thickness,color,opacity,rx,ry]) => {
    const ring = new Mesh(new TorusGeometry(radius, thickness, 8, 210), new MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
    ring.rotation.set(rx, ry, .15); assembly.add(ring); return ring;
  });
  const dustCount = 260;
  const vertices = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const a = Math.random() * Math.PI * 2, radius = 2.2 + Math.random() * 3.3;
    vertices[i*3] = Math.cos(a) * radius;
    vertices[i*3+1] = (Math.random()-.5) * 5.9;
    vertices[i*3+2] = (Math.random()-.5)*2.5;
  }
  const particlesGeometry = new BufferGeometry(); particlesGeometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const particles = new Points(particlesGeometry, new PointsMaterial({color:0x83dad1, size:.022,transparent:true,opacity:.65,blending:AdditiveBlending,depthWrite:false}));
  scene.add(particles);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  function resize() {
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 400 ? 10 : 8.6;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const mouse = { x:0, y:0 }; const aim = { x:0, y:0 };
  const host = $('.hero');
  host.addEventListener('pointermove', e => {
    const rect = host.getBoundingClientRect();
    aim.x = ((e.clientX - rect.left)/rect.width-.5)*.55;
    aim.y = ((e.clientY - rect.top)/rect.height-.5)*.38;
  });
  host.addEventListener('pointerleave', () => { aim.x=0; aim.y=0; });
  let requestId;
  const start = performance.now();
  function frame(now) {
    requestId = requestAnimationFrame(frame);
    if (document.hidden) return;
    const time = (now - start)*.001;
    mouse.x += (aim.x - mouse.x)*.03;
    mouse.y += (aim.y - mouse.y)*.03;
    assembly.rotation.x = Math.sin(time*.2)*.11-mouse.y;
    assembly.rotation.y = time*.10+mouse.x;
    assembly.position.y = Math.sin(time*.65)*.08;
    core.rotation.set(time*.055,time*.105,0);
    wire.rotation.set(-time*.045,time*.095,0);
    rings[0].rotation.z = time*.09;
    rings[1].rotation.x = 1.13 + time*.06;
    rings[2].rotation.y = -.35-time*.07;
    particles.rotation.y = -time*.01;
    renderer.render(scene,camera);
  }
  frame(performance.now());
  reducedMotion.addEventListener('change', event => { if (event.matches) cancelAnimationFrame(requestId); else frame(performance.now()); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(requestId); observer.disconnect(); renderer.dispose(); core.geometry.dispose(); wire.geometry.dispose(); rings.forEach(r=>r.geometry.dispose()); particlesGeometry.dispose(); }, {once:true});
}
startThree();