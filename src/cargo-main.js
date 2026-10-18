import './cargo.css';
import {CARGO, SLOTS, CROSSING_SECONDS, createCargoGame, cargoBalance, seaState, canMove, moveCargo, unloadCargo, undoCargo, startCrossing, tickCargo} from './cargo-model.js';
import {createCargoView, cargoColor} from './cargo-view.js';

document.getElementById('cargoApp').innerHTML = `
  <header><a href="./index.html">← TIDE RAID</a><h1>CARGO BALANCE <span>LAB / EXPERIMENTAL</span></h1></header>
  <main><section class="visual"><div id="cargoView" aria-label="Container ship and changing sea"></div>
    <div class="view-controls"><button id="orbitLeft" aria-label="Rotate view left">↶</button><button id="orbitRight" aria-label="Rotate view right">↷</button><button id="closer">Zoom +</button><button id="farther">Zoom −</button></div>
    <div class="instruments"><strong id="phase"></strong><p id="sea"></p><progress id="progress" max="90" value="0" aria-label="Crossing progress"></progress>
    <div id="balance"></div><label>CARGO CONDITION <meter id="condition" min="0" max="1" value="1"></meter></label><p id="crane"></p></div>
  </section><aside><h2>18 containers. One crossing.</h2><p>Load every box. Keep heavy cargo low and balance port/starboard and bow/stern. Select a container, then an empty deck slot. Upper slots need support; unload the top first.</p>
    <p class="forecast">FORECAST · 0–30s gentle → 30–60s cross swell → 60–90s rougher beam sea. Crane windows: 22–30s and 52–60s.</p>
    <div class="actions"><button id="sail">Start crossing</button><button id="pause" disabled>Pause / plan</button><button id="restart">Edit / retry load</button><button id="clear">Clear deck</button></div>
    <p id="notice" role="status" aria-live="polite">Choose a container from the quay below.</p>
    <div class="deck-heading"><span>PORT</span><span>CENTER</span><span>STARBOARD</span></div><div id="grid" aria-label="Two-tier container deck"></div>
    <div class="actions"><button id="unload">Return selected to quay</button><button id="undo">Undo loading move</button></div>
    <h3>Quay · unloaded containers</h3><div id="tray"></div>
    <details><summary>How this prototype works</summary><p>At sea you have four moves total, each taking three seconds using a fictional onboard crane. Start moves only in a crane window and below 20° heel. Pause to plan; the crane pauses too. Deliver every box with condition remaining. Severe heel damages cargo; sustained extreme heel fails the crossing. Restart is always free.</p><p>Stability, waves and crane rules are simplified game mechanics, not a loading calculator or maritime safety guidance. No wind, container lashing, flooded compartments or true naval hydrostatics are simulated. This mode does not change TIDE RAID saves or racing physics.</p></details>
  </aside></main>`;
let game = createCargoGame(); let selected = null; let paused = false; let accumulator = 0; let lastTime; let lastSignature = ''; let hudTime = 0;
const element = (id) => document.getElementById(id);
let view;
try {view = createCargoView(element('cargoView'));}
catch {element('cargoView').textContent = '3D view unavailable. The loading puzzle and instruments still work.';}
const degrees = (angle) => (angle * 180 / Math.PI).toFixed(1);
function message(text) {element('notice').textContent = text;}
function label(id) {return `${String(id + 1).padStart(2, '0')} · ${CARGO[id].tonnes}t`;}
function renderBoard() {
  element('grid').innerHTML = Array.from({length: 4}, (_, bay) => `<section class="bay"><b>Bay ${bay + 1} ${bay === 0 ? '· BOW' : bay === 3 ? '· STERN' : ''}</b><div class="row">${[0, 1, 2].map((column) => `<div>${[1, 0].map((tier) => {
    const index = bay * 6 + column * 2 + tier; const id = game.board[index];
    const available = selected !== null && canMove(game, selected, index);
    return `<button class="slot ${available ? 'valid' : ''}" data-slot="${index}" aria-label="Bay ${bay + 1}, ${['port', 'center', 'starboard'][column]}, ${tier ? 'upper' : 'lower'}: ${id === null ? 'empty' : label(id)}" aria-pressed="${id !== null && selected === id}" style="${id !== null ? `border-color:#${cargoColor(id).toString(16)}` : ''}"><small>${tier ? 'UPPER' : 'LOWER'}</small>${id === null ? '—' : label(id)}</button>`;
  }).join('')}</div>`).join('')}</div></section>`).join('');
  element('tray').innerHTML = CARGO.filter((cargo) => !game.board.includes(cargo.id)).map((cargo) => `<button data-cargo="${cargo.id}" aria-pressed="${selected === cargo.id}" style="border-color:#${cargoColor(cargo.id).toString(16)}">${label(cargo.id)}</button>`).join('') || '<small>All cargo aboard.</small>';
}
element('tray').onclick = (event) => {const button = event.target.closest('[data-cargo]'); if (!button) return; selected = Number(button.dataset.cargo); message(`Selected ${label(selected)}. Choose a highlighted empty slot.`); lastSignature = '';};
element('grid').onclick = (event) => {
  const button = event.target.closest('[data-slot]'); if (!button) return;
  const index = Number(button.dataset.slot); const id = game.board[index];
  if (id !== null) {selected = id; message(`Selected ${label(id)}. A loaded upper box must be moved before its lower support.`);}
  else if (selected !== null && moveCargo(game, selected, index)) {message(game.pending ? 'Crane moving · 3 seconds. Cargo stays in its old slot until the move completes.' : 'Cargo placed. Check list, trim and stability.'); selected = null;}
  else message(game.phase === 'loading' ? 'Select cargo first; upper slots require a loaded lower support.' : 'Move blocked: use an empty supported slot during a crane window, below 20° heel, with moves remaining.');
  lastSignature = '';
};
element('unload').onclick = () => {if (selected !== null && unloadCargo(game, selected)) {selected = null; message('Returned to quay.');} else message('Only unblocked cargo can return to quay, before departure.'); lastSignature = '';};
element('undo').onclick = () => {undoCargo(game); selected = null; lastSignature = '';};
element('sail').onclick = () => {if (startCrossing(game)) {selected = null; message('Underway. Watch the forecast and the two crane windows.');} else message('Load all 18 containers before departure.'); lastSignature = '';};
element('pause').onclick = () => {if (game.phase !== 'crossing') return; paused = !paused; accumulator = 0;};
element('restart').onclick = () => {const board = [...game.board]; game = createCargoGame(); game.board = board; selected = null; paused = false; accumulator = 0; lastSignature = ''; message('Cargo kept aboard. Adjust the plan and try again.');};
element('clear').onclick = () => {game = createCargoGame(); selected = null; paused = false; accumulator = 0; lastSignature = ''; message('Deck cleared. All cargo is back on the quay.');};
element('orbitLeft').onclick = () => view?.orbit(-0.3); element('orbitRight').onclick = () => view?.orbit(0.3);
element('closer').onclick = () => view?.zoom(-10); element('farther').onclick = () => view?.zoom(10);
document.addEventListener('visibilitychange', () => {if (document.hidden && game.phase === 'crossing') {paused = true; accumulator = 0;}});
function updateHud() {
  const balance = cargoBalance(game.board); const sea = seaState(game.time); const loaded = game.board.filter((id) => id !== null).length;
  element('phase').textContent = game.phase === 'loading' ? `LOAD PLAN · ${loaded}/18 ABOARD` : game.phase === 'arrived' ? `DELIVERED · ${Math.round(game.integrity * 100)}% CONDITION` : game.phase === 'failed' ? 'CROSSING FAILED · RELOAD AND RETRY' : `${paused ? 'PAUSED / PLAN' : 'UNDERWAY'} · ${Math.ceil(CROSSING_SECONDS - game.time)}s TO PORT`;
  element('sea').textContent = ['Gentle water', 'Cross swell', 'Rougher beam sea'][sea.stage];
  element('balance').textContent = `Heel ${degrees(game.roll)}° · load list ${degrees(balance.list)}° · trim ${degrees(balance.trim)}° · stability margin ${balance.gm.toFixed(2)}m${balance.gm < 0.8 ? ' · TOP-HEAVY' : ''}`;
  element('balance').style.color = balance.gm < 0.8 || Math.abs(game.roll) > 0.35 ? '#ffb48f' : '#e5f0ef';
  element('condition').value = game.integrity; element('progress').value = game.time;
  const nextWindow = game.time < 22 ? 22 : game.time < 52 && game.time >= 30 ? 52 : null;
  element('crane').textContent = game.pending ? `CRANE MOVING · ${game.pending.remaining.toFixed(1)}s` : `${sea.crane && game.phase === 'crossing' ? 'CRANE WINDOW OPEN' : nextWindow !== null && game.phase === 'crossing' ? `NEXT CRANE WINDOW IN ${Math.ceil(nextWindow - game.time)}s` : 'CRANE CLOSED'} · ${game.moves} sea moves left`;
  element('pause').disabled = game.phase !== 'crossing'; element('pause').textContent = paused ? 'Resume crossing' : 'Pause / plan';
  element('sail').disabled = game.phase !== 'loading' || loaded !== CARGO.length; element('undo').disabled = game.phase !== 'loading' || !game.history.length;
  const signature = `${game.board.join(',')}/${selected}/${game.phase}/${Boolean(game.pending)}/${sea.crane}/${Math.abs(game.roll) < 0.35}`;
  if (signature !== lastSignature) {renderBoard(); lastSignature = signature;}
}
function frame(time) {
  requestAnimationFrame(frame);
  const elapsed = lastTime === undefined ? 0 : Math.min(0.1, (time - lastTime) / 1000); lastTime = time;
  if (!paused && game.phase === 'crossing') {
    accumulator += elapsed;
    while (accumulator >= 1 / 120) {tickCargo(game, 1 / 120); accumulator -= 1 / 120;}
  }
  hudTime += elapsed; if (hudTime >= 0.1 || !lastSignature) {updateHud(); hudTime = 0;}
  view?.update(game, selected);
}
updateHud(); requestAnimationFrame(frame);
