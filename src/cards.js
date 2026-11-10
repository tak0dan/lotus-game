import * as THREE from 'three';
import { UNITS, UNIT_ORDER, SPECS, COSTS, ACTIONS, ACTION_ORDER, LORE, ACTION_LORE, FOUNDATION_HP, NORMAL_HP, REINFORCED_HP, GARRISON_HITS, DRAGON, ATTACH_BONUS_MIN, ARCANE_CONVERT, ONLY_GATHERERS, RES_NAME, RES_INFO, RES_ALL, SUBTYPES, FAMILIES, FAMILY_OF, PRIMARY_YIELD, DOUBLERS, PRIEST_RADIUS, YIELD, MAX_LEVELS } from './balance.js';
import { OWNER_COL, NAME, resourceMarker } from './models.js';
import { makeModel, topOf, lib } from './modelLib.js';

// MTG-style cards for units, the tower and orders. Art for units is RENDERED from the same 3D models the game uses.
// Layout: title + cost pips · art window · type line · rules text + lore · upkeep + stat plate.

// ───────────────────────── art renderer ─────────────────────────
let rend = null; const cache = new Map();
function getRenderer() {
  if (rend) return rend;
  rend = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); rend.setPixelRatio(1); rend.setSize(640, 320, false);
  rend.shadowMap.enabled = true; rend.shadowMap.type = THREE.PCFSoftShadowMap; rend.toneMapping = THREE.ACESFilmicToneMapping; rend.toneMappingExposure = 1.25;
  return rend;
}
function backdrop() {                     // dim war-room: stone wall gradient
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2a2d36'); g.addColorStop(0.55, '#3d3a3a'); g.addColorStop(1, '#2b2926');
  x.fillStyle = g; x.fillRect(0, 0, 8, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function artFor(kind, owner = 0, opts = {}) {
  const key = `${kind}|${owner}|${lib.status[kind] || ''}|${JSON.stringify(opts)}`;
  if (cache.has(key)) return cache.get(key);
  const r = getRenderer(), scene = new THREE.Scene(); scene.background = backdrop();
  scene.add(new THREE.HemisphereLight(0xc7d0e6, 0x3a2e24, 1.25));
  const sun = new THREE.DirectionalLight(0xffe0b4, 2.4); sun.position.set(-3, 5, 4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.2, 40), new THREE.MeshStandardMaterial({ color: 0x55575e, roughness: 0.95 })); floor.position.y = -0.1; floor.receiveShadow = true; scene.add(floor);
  const sub = new THREE.Group(); let h = 1;
  if (kind === 'tower') {
    let y = 0; for (const k of ['tower_foundation', ...(opts.levels || ['tower_level', 'tower_level_reinforced', 'tower_level'])]) { const m = makeModel(k, owner); m.position.y = y; y += topOf(k); sub.add(m); }
    h = y;
    if (opts.garrison) { const f = makeModel(opts.garrison, owner); f.position.y = y; f.scale.setScalar(0.85); sub.add(f); h += 1; }
  } else if (kind.startsWith('res:')) { const m = resourceMarker(kind.slice(4)); m.scale.setScalar(2.6); sub.add(m); h = 1.15; }
  else { const m = makeModel(kind, owner); sub.add(m); h = topOf(kind) || 1; }
  sub.rotation.y = kind === 'tower' ? 0.6 : 0.55; scene.add(sub);
  const cam = new THREE.PerspectiveCamera(28, 2, 0.1, 50), d = Math.max(3.0, h * 3.0 + 0.6);
  cam.position.set(d * 0.5, h * 0.6 + 0.5, d * 0.86); cam.lookAt(0, h * 0.5, 0);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png'); cache.set(key, url);
  scene.traverse((o) => { if (o.geometry && !o.userData.shared) o.geometry.dispose?.(); });
  return url;
}

// ───────────────────────── cards ─────────────────────────
const pipBg = (k) => { const I = RES_INFO[k]; if (!I) return '#aaa'; if (!I.primary) return I.color; const [x, y] = FAMILIES[k].subs; return `linear-gradient(135deg, ${RES_INFO[x].color} 50%, ${RES_INFO[y].color} 50%)`; };
export const pips = (cost) => { const e = Object.entries(cost || {}).filter(([, v]) => v > 0); return e.length ? e.map(([k, v]) => `<span class="pip" style="--c:${RES_INFO[k] ? RES_INFO[k].color : '#aaa'};background:radial-gradient(circle at 35% 30%,#fff9,transparent 45%),${pipBg(k)}" title="${v} ${RES_NAME[k] || k}${RES_INFO[k] && RES_INFO[k].primary ? ' (any of its two kinds)' : ''}">${v}<i>${(RES_NAME[k] || k).slice(0, 2)}</i></span>`).join('') : '<span class="pip free" title="No cost">–</span>'; };
const CLS = { Foot: '#8a6f4a', Mounted: '#7a5a3a', Ranged: '#4d6b4a', Siege: '#6b5b4a', Arcane: '#5b4f8a', Dragon: '#3a3a52', Structure: '#6a6d75', Order: '#6a5a3a', Spirit: '#8a7fb0', Physical: '#9a8a5a', Mana: '#5f63b8', Resource: '#7a7a82' };

function unitRules(t) {
  const u = UNITS[t], out = [];
  if (u.builder) out.push('<b>Builder.</b> Lays foundations, tends levels.');
  if (!u.flying) out.push(u.climb ? '<b>Garrison.</b> May climb towers (+1 MOV).' : '<b>No climbing.</b> Cannot garrison.');
  if (u.hits > 1) out.push(`<b>${u.hits} hits to kill.</b> Hits do not carry over: a survivor is whole again next year.`);
  if (u.rng > 0 && !u.siege && !u.flying) out.push(`<b>Ranged ${u.rng}.</b> Needs a clear line; height shoots over.`);
  if (u.arcane) out.push(`<b>Arcane.</b> No line needed; ignores the garrison's extra hit.`);
  if (u.siege) out.push('<b>Siege.</b> Only unit that breaks towers: 1 damage/yr, if it did not move.');
  if (u.flying) out.push(`<b>Wyvern.</b> Lives on top of a tower of height ${DRAGON.minHeight}+ (never an Arcane Tower) and flies from tower to tower. Landing on an enemy tower <b>kills the unit inside</b>. Strikes within ${DRAGON.radius} squares, +1 for each level above ${DRAGON.minHeight}. A hatchling with no free tower to perch on dies.`);
  if (u.heavy) out.push(`<b>Heavy.</b> Voids ONE lethal hit a year — only from ${UNITS[u.light].name} or from a distance.`);
  if (u.hitrun) out.push('<b>Strike and return.</b> Moves to the target, strikes, then moves back exactly as far as it came.');
  if (u.priest) out.push(`<b>Ward.</b> Each friend within ${PRIEST_RADIUS} squares voids ONE lethal hit a year.`);
  for (const [fam, who] of Object.entries(DOUBLERS)) if (who.includes(t)) out.push(`<b>Doubles ${FAMILIES[fam].name}.</b> On a ${FAMILIES[fam].name} node it yields ${YIELD.double}, not ${YIELD.unit}.`);
  out.push(`<b>Recruit:</b> ${SPECS[u.at].name}${u.minLevel > 1 ? ` lvl ${u.minLevel}+` : ''}, same turn${u.tech ? ' · Dragonlore' : ''}.`);
  return out;
}
const stat = (k, v) => `<div class="st"><b>${v}</b><span>${k}</span></div>`;
function frame({ cls, name, cost, art, type, typeRight, rules, lore, loreTitle, foot, stats, upkeep, owner = 0, isNew }) {
  return `<div class="card" style="--cls:${CLS[cls] || '#666'};--own:#${OWNER_COL[owner].toString(16)}">
    <div class="bar title"><span class="nm">${name}</span><span class="cost">${cost}</span></div>
    <div class="art">${art}<em class="own"></em></div>
    <div class="bar type"><span>${type}</span><span>${typeRight || ''}</span></div>
    <div class="box"><div class="rules">${rules.map((r) => `<p>${r}</p>`).join('')}</div>
      ${lore ? `<div class="lore"><small>${loreTitle || ''}${isNew ? ' · <u>new text</u>' : ''}</small>“${lore}”</div>` : ''}</div>
    <div class="foot"><span class="up">${upkeep || ''}</span>${stats ? `<span class="stats">${stats}</span>` : ''}</div>
    <div class="coll">${foot}</div></div>`;
}
export function unitCardHTML(t, owner = 0) {
  const u = UNITS[t], L = LORE[t];
  return frame({ cls: u.class, name: u.name, cost: pips(u.cost), art: `<img alt="${u.name}" src="${artFor(t, owner)}">`, type: `Unit — ${u.class}`, typeRight: `${SPECS[u.at].name}${u.minLevel > 1 ? ' ' + u.minLevel + '+' : ''}`,
    rules: unitRules(t), lore: L.quote, loreTitle: L.title, isNew: L.isNew, owner,
    upkeep: `Upkeep <span class="pip s" style="--c:${RES_INFO.gold.color}">${u.upkeep}<i>G</i></span>/yr`, stats: (u.flying ? stat('FLIES', 'tower→tower') : stat('MOV', u.mov)) + stat('HITS', u.hits) + stat('RNG', u.flying ? DRAGON.radius + '+' : u.rng || '–'), foot: `THE TOWER GAME · UNIT · ${NAME[owner].toUpperCase()}` });
}
export function towerCardHTML(owner = 0) {
  const L = LORE.tower, c = COSTS;
  return frame({ cls: 'Structure', name: 'Tower', cost: pips(c.foundation), art: `<img alt="Tower" src="${artFor('tower', owner, { garrison: 'archer' })}">`, type: 'Structure — Stone', typeRight: `up to ${MAX_LEVELS} levels`,
    rules: [`<b>Levels.</b> Foundation ${FOUNDATION_HP}; normal ${NORMAL_HP} ${pips(c.normal)}; reinforced ${REINFORCED_HP} ${pips(c.reinforced)}. One a year.`,
      `<b>Garrison.</b> One extra hit to kill (+${GARRISON_HITS}); only ranged can hit it; adds its yield to the node. Spirit nodes: only an Arcane Tower gathers them.`,
      `<b>Height.</b> At most ${MAX_LEVELS} — or more with ${ATTACH_BONUS_MIN} attached towers: +1 for each level they all share. A Dragon needs ${DRAGON.minHeight}+.`,
      `<b>Arcane.</b> Pour ${Object.entries(ARCANE_CONVERT).map(([k, v]) => v + ' ' + RES_NAME[k]).join(' + ')} into a finished tower to make it an Arcane Tower.`,
      '<b>Siege-only.</b> Only siege engines damage it; broken levels leave the model.'],
    lore: L.quote, loreTitle: L.title, owner, upkeep: 'No upkeep', stats: stat('FOUND', FOUNDATION_HP) + stat('LVL', NORMAL_HP + '/' + REINFORCED_HP), foot: `THE TOWER GAME · STRUCTURE · ${NAME[owner].toUpperCase()}` });
}
const ICON = {
  arrow: '<path d="M10 50h70M62 30l22 20-22 20" />', swords: '<path d="M20 20l50 50M80 20L30 70M14 76l12-12M86 76L74 64"/>', tower: '<path d="M30 80V40h40v40M26 40h48M34 40V28h8v12M58 40V28h8v12M44 80V62h12v18"/>',
  base: '<path d="M16 80h68V60H16zM24 60V50h52v10"/><path d="M42 40l8-12 8 12"/>', level: '<path d="M28 82V30M72 82V30M24 30h52M24 56h52M24 82h52"/>', wall: '<path d="M22 82V34h56v48M22 58h56M50 34v24M36 58v24M64 58v24"/>',
  banner: '<path d="M30 86V16M30 20h44l-10 16 10 16H30"/>', scroll: '<path d="M26 22h48v52H26zM26 22c-10 0-10 12 0 12M74 74c10 0 10-12 0-12M36 40h28M36 52h28M36 64h18"/>',
  catapult: '<path d="M14 78h72M22 78a10 10 0 1 0 20 0M60 78a10 10 0 1 0 20 0M30 66L66 26M66 26l10 6M30 66l-8-14"/>', shield: '<path d="M50 14l32 10v24c0 18-14 30-32 38C32 78 18 66 18 48V24z"/>',
};
export function actionCardHTML(id) {
  const a = ACTIONS[id];
  const art = `<svg viewBox="0 0 100 100" class="icon">${ICON[a.art] || ''}</svg>`;
  return frame({ cls: 'Order', name: a.name, cost: pips(a.cost), art, type: `Order — ${a.phase} phase`, typeRight: '', rules: [a.text], lore: ACTION_LORE[id], loreTitle: '', owner: 0, upkeep: '', stats: '', foot: 'THE TOWER GAME · ORDER' });
}

export function resourceCardHTML(key) {
  const I = RES_INFO[key], fam = FAMILIES[I.family], primary = !!I.primary, rules = [];
  if (primary) {
    const src = Object.entries(PRIMARY_YIELD).filter(([, v]) => v[key]).map(([k, v]) => `${k === 'fortress' ? 'Fortress' : SPECS[k].name} ${v[key]}`).join(' · ');
    rules.push(`<b>Wild.</b> Spend it as ${fam.subs.map((k) => RES_NAME[k]).join(' or ')} — whichever you need.`, `<b>Produced by</b> ${src} each year (the tower needs a level).`);
  } else {
    const dbl = DOUBLERS[I.family] || [];
    rules.push(`<b>Node.</b> A unit on the node: <b>${YIELD.unit}</b>. A tower on it: <b>${YIELD.tower}</b>, and its garrison adds its own part.`);
    rules.push(ONLY_GATHERERS[I.family] ? `<b>Only ${ONLY_GATHERERS[I.family].map((t) => UNITS[t].name).join(' or ')}</b> can gather it (${YIELD.double} a year), or an <b>Arcane Tower</b> built on the node (${YIELD.tower}). An ordinary tower or unit gets nothing.` : dbl.length ? `<b>Doubled</b> (${YIELD.double}) when worked by ${dbl.map((t) => UNITS[t].name).join(' or ')}. Any other unit works it for ${YIELD.unit}.` : '<b>Any unit</b> can work it; there is no specialist.');
    rules.push(`<b>Stands in:</b> a ${fam.name} primary card can be spent as ${RES_NAME[key]}.`);
  }
  rules.push('<b>Use it or lose it.</b> Unspent cards vanish at the end of the year.');
  const stats = primary ? stat('PER YEAR', Object.values(PRIMARY_YIELD).map((v) => v[key]).filter(Boolean).join('/')) : stat('UNIT', YIELD.unit) + stat('TOWER', YIELD.tower) + stat('SPEC.', (DOUBLERS[I.family] || []).length ? YIELD.double : '–');
  return frame({ cls: fam.name, name: RES_NAME[key], cost: pips({ [key]: 1 }), art: `<img alt="${RES_NAME[key]}" src="${artFor('res:' + key, 0)}">`, type: primary ? `Primary Resource — ${fam.name}` : `Resource — ${fam.name}`, typeRight: primary ? 'any kind' : RES_NAME[key],
    rules, lore: I.lore, loreTitle: I.title, isNew: true, owner: 0, upkeep: '', stats, foot: `THE TOWER GAME · RESOURCE · ${fam.name.toUpperCase()}` });
}

export const CARD_CSS = `
.card{--cs:15px;font:var(--cs)/1.3 Georgia,'Times New Roman',serif;font-size:var(--cs);width:20em;height:28em;box-sizing:border-box;padding:.7em .7em .5em;border-radius:1em;color:#e8e2d0;position:relative;display:flex;flex-direction:column;gap:.35em;
  background:linear-gradient(160deg,#3c3f47,#26282e 60%,#34363d);box-shadow:0 .2em .8em #000a,inset 0 0 0 .14em var(--cls),inset 0 0 0 .3em #0006;break-inside:avoid;overflow:hidden}
.card:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,#ffffff06 0 1px,transparent 1px 5px);pointer-events:none}
.card .bar{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(#4a4d56,#33353c);border-radius:.45em;padding:.18em .55em;box-shadow:inset 0 0 0 .08em #0007,0 .05em .1em #0006}
.card .title{min-height:1.9em}.card .nm{font-size:1.12em;font-weight:700;letter-spacing:.02em;text-shadow:0 .06em .1em #000}
.card .type{font-size:.82em;font-variant:small-caps;letter-spacing:.05em;padding:.12em .55em;color:#d8d0b8}
.card .cost{display:flex;gap:.18em}
.pip{--c:#aaa;display:inline-grid;place-items:center;width:1.45em;height:1.45em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff9,transparent 45%),var(--c);color:#201a10;font:700 .85em Georgia,serif;position:relative;box-shadow:0 .05em .12em #000a,inset 0 0 0 .08em #0004}
.pip i{position:absolute;right:-.2em;bottom:-.25em;font:700 .5em system-ui;background:#000b;color:#fff;border-radius:.4em;padding:0 .2em;font-style:normal}
.pip.free{background:#555;color:#bbb}.pip.s{width:1.25em;height:1.25em;font-size:.8em;vertical-align:middle}
.card .art{position:relative;height:9.3em;border-radius:.35em;overflow:hidden;box-shadow:inset 0 0 0 .1em #0009,0 0 0 .1em #5c5f68;background:#222}
.card .art img{width:100%;height:100%;object-fit:cover;display:block}
.card .art .own{position:absolute;left:0;right:0;bottom:0;height:.28em;background:var(--own)}
.card .art svg.icon{width:100%;height:100%;padding:1.2em;box-sizing:border-box;fill:none;stroke:#e8c477;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;background:radial-gradient(circle at 50% 40%,#4a4636,#25241f)}
.card .box{flex:1;background:linear-gradient(#d8ceb2,#c4b896);color:#241d12;border-radius:.4em;padding:.45em .6em;font-size:.8em;line-height:1.24;box-shadow:inset 0 0 0 .08em #0006;overflow:hidden;display:flex;flex-direction:column;gap:.3em}
.card .box p{margin:0 0 .28em}.card .rules{flex:1}
.card .lore{border-top:1px solid #0004;padding-top:.3em;font-style:italic;color:#4a3c24;font-size:.95em}.card .lore small{display:block;font:700 .72em system-ui;font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:#6a5a3a;margin-bottom:.1em}
.card .lore u{text-decoration:none;color:#9a4a2a}
.card .foot{display:flex;justify-content:space-between;align-items:center;min-height:2.1em}
.card .up{font-size:.78em;color:#d8d0b8}
.card .stats{display:flex;gap:.28em;background:linear-gradient(#4a4d56,#2c2e34);padding:.2em .4em;border-radius:.5em;box-shadow:inset 0 0 0 .08em #0008,0 .05em .15em #0008}
.card .st{display:flex;flex-direction:column;align-items:center;min-width:2em}.card .st b{font-size:1.15em;color:#fff}.card .st span{font:.55em system-ui;letter-spacing:.08em;color:#b8b2a0}
.card .coll{font:.52em system-ui;letter-spacing:.12em;color:#8b8f96;text-align:center}
@media print{.card{--cs:3.15mm;box-shadow:none;border:.2mm solid #000}}
`;
export function injectCardCSS() { if (!document.getElementById('card-css')) { const s = document.createElement('style'); s.id = 'card-css'; s.textContent = CARD_CSS; document.head.append(s); } }
export { UNIT_ORDER, ACTION_ORDER };
