// THE TOWER GAME — all numbers and texts in ONE place.  Edit freely; rules, AI, cards and codex all read from here.
// Values marked (RB) come straight from the rulebook (v1.0, "тестові" = test values); everything else is a [DECISION] of mine that the
// rulebook leaves open (costs, build times, specialisations...) — tune these with `node test/sim.mjs`.
//
// NOTE: with a per-year budget (see START_RESOURCES) every cost below must fit inside ONE year's budget of the nodes you hold:
// the Dragon / Dragonlore / lair costs were lowered from 8+8 / 6+4 / 4+2 for that reason — tune with `node test/sim.mjs`.
// Currency: gold = recruiting + upkeep · iron = towers, siege, heavy units · mana = magic, dragons.

// Tuning hook for the simulator:  TG_TUNE='{"CAPITAL_GOLD":8}' node test/sim.mjs   (ignored in the browser)
const T = (typeof process !== 'undefined' && process.env && process.env.TG_TUNE) ? JSON.parse(process.env.TG_TUNE) : {};
// ── Resources: 3 FAMILIES (primary types), each with 2 SUBTYPES = 6 node types on the map ──────────────────────────────────────────
// A PRIMARY (family) card can be spent as either of its subtypes. A cost written with a family name ("mana: 2") is paid by any card of that family.
// [DECISION] Names of the Mana and Spirit subtypes are placeholders — rename them here, nothing else needs to change.
export const FAMILIES = { physical: { name: 'Physical', subs: ['gold', 'iron'] }, mana: { name: 'Mana', subs: ['aether', 'ember'] }, spirit: { name: 'Spirit', subs: ['faith', 'soul'] } };
export const FAMILY_LIST = ['physical', 'mana', 'spirit'];
export const SUBTYPES = ['gold', 'iron', 'aether', 'ember', 'faith', 'soul'];            // index+1 = the node code on the map
export const FAMILY_OF = { gold: 'physical', iron: 'physical', aether: 'mana', ember: 'mana', faith: 'spirit', soul: 'spirit' };
export const RES_ALL = [...SUBTYPES, ...FAMILY_LIST];                                      // every kind of card a player can hold
export const RESOURCES = RES_ALL;
export const RES_NAME = { gold: 'Gold', iron: 'Iron', aether: 'Aether', ember: 'Ember', faith: 'Faith', soul: 'Soul', physical: 'Physical', mana: 'Mana', spirit: 'Spirit' };
export const RES_INFO = {                                                                 // used by the resource cards
  gold:   { family: 'physical', color: '#e0b94f', title: 'Coin of the Last Kingdoms', lore: 'Everything in Aurelia has a price. Most of it is paid by someone else.' },
  iron:   { family: 'physical', color: '#a2abb6', title: 'Scrap and Ore',             lore: 'Dismantled cathedrals make good walls.' },
  aether: { family: 'mana',     color: '#7ea9ff', title: 'Aether',                    lore: 'The Architects of Silence call it a variable. Everyone else calls it a miracle.' },
  ember:  { family: 'mana',     color: '#ff8a4a', title: 'Ember',                     lore: 'What remains when a miracle has been spent.' },
  faith:  { family: 'spirit',   color: '#f2e9c8', title: 'Faith',                     lore: 'Faith is obedience. It is also the only currency that never runs short of buyers.' },
  soul:   { family: 'spirit',   color: '#b99cff', title: 'Soul',                      lore: 'Some say it cannot be gathered. The monks gather it anyway.' },
  physical: { family: 'physical', color: '#c9ad73', title: 'The Material World', lore: 'Whatever can be weighed, lifted, forged or counted.', primary: true },
  mana:     { family: 'mana',     color: '#8f8cff', title: 'The Unseen Current', lore: 'Whatever the scholars cannot weigh and the soldiers cannot stop.', primary: true },
  spirit:   { family: 'spirit',   color: '#e9d9ff', title: 'The Quiet Tithe',    lore: 'Whatever is given, and cannot be taken back.', primary: true },
};

// ── Units ───────────────────────────────────────────────────────────────────────────────────────────
// mov: squares per year (orthogonal, 1 each) · hits: how many hits it takes to kill it THIS YEAR (a unit that survives is whole again next year) · rng: 0 = melee
// There are NO attack/defence numbers: every strike is exactly one hit. A Heavy unit also voids one hit a year from its light version or from a distance; a Priest wards its friends.
// upkeep: gold per year (RB) · cost: paid when ordered · time: years to recruit · at: building spec that can recruit it · minLevel: tower levels needed
export const UNITS = {
  infantry:       { name: 'Infantry',        class: 'Foot',     mov: 3, hits: 1, rng: 0, upkeep: 1, cost: { gold: 2 },                 time: 1, at: 'barracks',  minLevel: 1, climb: true,  builder: true },
  heavy_infantry: { name: 'Heavy Infantry',  class: 'Foot',     mov: 2, hits: 1, rng: 0, upkeep: 2, cost: { gold: 2, iron: 2 },        time: 2, at: 'barracks',  minLevel: 2, climb: true,  heavy: true, light: 'infantry' },
  cavalry:        { name: 'Cavalry',         class: 'Mounted',  mov: 7, hits: 1, rng: 0, upkeep: 2, cost: { gold: 2, iron: 1 },                 time: 1, at: 'stable',    minLevel: 1, climb: false },
  heavy_cavalry:  { name: 'Heavy Cavalry',   class: 'Mounted',  mov: 5, hits: 1, rng: 0, upkeep: 3, cost: { gold: 3, iron: 3 },        time: 2, at: 'stable',    minLevel: 2, climb: false, heavy: true, light: 'cavalry' },
  archer:         { name: 'Archers',         class: 'Ranged',   mov: 3, hits: 1, rng: 3, upkeep: 1, cost: { gold: 1, iron: 2 },                 time: 1, at: 'range',     minLevel: 1, climb: true },
  monk:           { name: 'Monk',            class: 'Spirit',   mov: 6, hits: 1, rng: 0, upkeep: 1, cost: { soul: 2, gold: 1 },       time: 1, at: 'monastery', minLevel: 1, climb: true,  hitrun: true },
  priest:         { name: 'Priest',          class: 'Spirit',   mov: 3, hits: 1, rng: 0, upkeep: 2, cost: { faith: 2, gold: 1 },      time: 2, at: 'monastery', minLevel: 2, climb: true,  priest: true },
  siege:          { name: 'Siege Engine',    class: 'Siege',    mov: 1, hits: 1, rng: 5, upkeep: 2, cost: { iron: 4, gold: 1 },        time: 2, at: 'workshop',  minLevel: 1, climb: false, siege: true },
  mage:           { name: 'Mage',            class: 'Arcane',   mov: 2, hits: 1, rng: 3, upkeep: 2, cost: { aether: 1, ember: 1, gold: 1 },        time: 2, at: 'arcane',    minLevel: 1, climb: true,  arcane: true },
  dragon:         { name: 'Dragon',          class: 'Dragon',   mov: 7, hits: 5, rng: 2, upkeep: 5, cost: { ember: 3, aether: 2, soul: 1 },        time: 4, at: 'lair',      minLevel: 3, climb: false, flying: true, tech: 'dragonlore' },
};
export const UNIT_ORDER = ['infantry', 'heavy_infantry', 'cavalry', 'heavy_cavalry', 'archer', 'monk', 'priest', 'siege', 'mage', 'dragon'];

// ── Towers ──────────────────────────────────────────────────────────────────────────────────────────
export const FOUNDATION_HP = 6, NORMAL_HP = 3, REINFORCED_HP = 5, MAX_LEVELS = 5;          // (RB) structural durability; a tower is at most 5 high ...
export const GARRISON_HITS = 1;                                                               // a unit inside a tower needs one more hit to kill (the Dragon excepted — it already sits on top)
export const ATTACH_BONUS_MIN = 3;                                                            // ... unless 3 towers are ATTACHED (orthogonal neighbours): then +1 height for every level they ALL share (the lowest of them)
export const DRAGON = { minHeight: 3, radius: 5 };                                              // a Dragon perches only on towers of height >= 3; it strikes within radius 5, +1 for each level above 3
export const ARCANE_CONVERT = { soul: 2, aether: 2, ember: 2 };                              // pour this into a finished tower and it becomes an Arcane Tower
export const COSTS = {                                                                         // a unit asks for SPECIFIC resources; a building asks for any card of a FAMILY ("physical: 2" = any 2 Gold/Iron, "spirit: 3" = any 3 Faith/Soul)
  foundation: { physical: 2 },
  normal:     { physical: 2 },
  reinforced: { physical: 4 },
  spec: { outpost: {}, barracks: { physical: 1 }, stable: { physical: 1 }, range: { physical: 1 }, workshop: { physical: 2 }, lair: { mana: 3 }, monastery: { spirit: 3 } },   // surcharge when the foundation is laid
};
// A tower's specialisation is chosen when its foundation is laid. The main fortress has the first three.
export const SPECS = {
  outpost:  { name: 'Outpost',  text: 'No recruiting. Cheap control of a resource cell or a ridge.' },
  barracks: { name: 'Barracks', text: 'Recruits Infantry; Heavy Infantry from level 2.' },
  stable:   { name: 'Stable',   text: 'Recruits Cavalry; Heavy Cavalry from level 2.' },
  range:    { name: 'Archery Yard', text: 'Recruits Archers.' },
  workshop: { name: 'Workshop', text: 'Builds Siege Engines — the only way to break a tower.' },
  arcane:   { name: 'Arcane Tower', text: 'Made by pouring 2 Soul + 2 Aether + 2 Ember into a finished tower. Recruits Mages, yields 1 Mana card a year, and — alone among towers — gathers a Spirit node it stands on. Dragons will not land on it.', convertOnly: true },
  monastery: { name: 'Monastery', text: 'Recruits Monks; Priests from level 2. Yields 1 Spirit card a year.' },
  lair:     { name: 'Dragon Lair', text: 'Needs Dragonlore. Raises Dragons over several years; the hatchling must find a free tower of height 3+ to perch on, or it dies.' },
};
export const FORTRESS_SPECS = ['barracks', 'stable', 'range'];
export const FORTRESS = { levels: ['reinforced', 'reinforced'], queueSlots: 2 };               // start-state of each main fortress
export const QUEUE_SLOTS = 1;                                                                  // recruits in progress per ordinary tower

// ── Economy ─────────────────────────────────────────────────────────────────────────────────────────
// How a resource NODE (a marked square) pays, per year  [designer's rules, 2026-11-10]:
//   a unit standing on it .......... 1 card of that node's type — ANY unit can work ANY node
//   ... but the family's specialist DOUBLES it (yielded twice): a Mage on a Mana node, a Monk or Priest on a Spirit node: 2
//   a tower built on it ............ 1 card by itself            (no unit needed)
//   + a garrison in that tower ..... + the unit's part (1, or 2 for the specialist) — so a node yields up to 2, or 3 with a specialist garrison
export const YIELD = { tower: T.YT ?? 1, unit: T.YU ?? 1, double: 2 };
export const DOUBLERS = { mana: ['mage'], spirit: ['monk', 'priest'] };
export const ONLY_GATHERERS = { spirit: ['monk', 'priest'] };                                   // Spirit nodes can be worked ONLY by spiritual units — or by an Arcane Tower built on the node
// Towers also yield a PRIMARY (family) card each year if they have at least one level — the three families have a home:
export const PRIMARY_YIELD = { fortress: { gold: 2, iron: 1 }, arcane: { mana: 1 }, monastery: { spirit: 1 } };   // [DECISION 2026-11-10] no more flat Physical wildcard: a fortress is a small mine (2 Gold, 1 Iron a turn); the real economy is the nodes
export const FREE_UPKEEP = T.FREE_UPKEEP ?? 10;                                               // the first 10 Gold of army upkeep a turn is supplied by the fortress; only the excess is paid from your cards   // [DECISION] fortress >= the starting army's upkeep, so the start is not a trap
export const PRIEST_RADIUS = 2;                                                            // squares (Chebyshev) around a Priest whose friends may void one hit a year
// Resources are a per-YEAR BUDGET (designer's ruling, like tapping lands in MTG): your nodes give this much this year, unspent is lost.
// START_RESOURCES is a one-time OPENING budget added to year 1 only, so the first year is not empty of the rarer cards.
export const START_RESOURCES = { gold: T.START_GOLD ?? 6, iron: T.START_IRON ?? 4, aether: 1, ember: 1, faith: 2, soul: 2 };
export const TECHS = {
  dragonlore: { name: 'Dragonlore', cost: { mana: 3, gold: 2 }, text: 'Unlocks Dragon Lairs and Dragons.' },
  runic:      { name: 'Runic Gauntlets', cost: { ember: 2, iron: 2 }, text: 'Your Monks wear fire-rune gauntlets: their blows burst inside armour. A Heavy unit can no longer void a hit from them — only a Priest\'s ward can.' },
  siegecraft: { name: 'Siegecraft', cost: { iron: 4 },          text: 'Siege Engines deal 2 structural damage per hit instead of 1.' },
};

// ── Victory ─────────────────────────────────────────────────────────────────────────────────────────
export const FORTRESS_HOLD_YEARS = 1;      // (RB) occupy the enemy fortress and keep it through the next year
export const POINTS_HOLD_YEARS = 2;        // [DECISION] hold a strategic majority for 2 consecutive years

// ── Orders (action cards) ───────────────────────────────────────────────────────────────────────────
// phase = when it resolves in the year.  cost is what the order spends (gold/iron/mana) — shown on the card.
export const ACTIONS = {
  advance:    { name: 'Advance',        phase: 'Movement', cost: {},                       art: 'arrow',   text: 'Move up to your MOV, one square at a time, orthogonally. Friends and enemies block the way; a tower base can only be entered by climbing it.' },
  strike:     { name: 'Strike',         phase: 'Combat',   cost: {},                       art: 'swords',  text: 'Attack an enemy in reach after movement. Every striker lands exactly one hit; a unit falls when it has taken as many hits as it needs this year (most need one). Survivors are whole again next year.' },
  garrison:   { name: 'Garrison',       phase: 'Movement', cost: {},                       art: 'tower',   text: 'Climb an own (or empty enemy) tower: costs 1 extra MOV. The garrison needs one extra hit to kill, can only be hit by ranged units, and adds its part to the node under the tower. Cavalry, dragons and siege engines cannot climb.' },
  found:      { name: 'Lay a Foundation', phase: 'Building', cost: COSTS.foundation,       art: 'base',    text: 'An Infantry beside a free square raises a tower foundation (6 structural). Pick its specialisation now. Levels come in later years.' },
  raise:      { name: 'Raise a Level',  phase: 'Building', cost: COSTS.normal,             art: 'level',   text: 'Add one normal level (3 structural) to a tower you garrison or tend. One level per tower per year.' },
  reinforce:  { name: 'Reinforce a Level', phase: 'Building', cost: COSTS.reinforced,      art: 'wall',    text: 'Add one reinforced level (5 structural). Heavier to break, slower to pay for.' },
  recruit:    { name: 'Recruit',        phase: 'Recruitment', cost: {},                    art: 'banner',  text: 'Order a unit from a tower with the right specialisation and height. Pay now; the figure appears when the time has passed. Gold upkeep begins at once.' },
  research:   { name: 'Research',       phase: 'Economy',  cost: {},                       art: 'scroll',  text: 'Spend resources on a technology: Dragonlore or Siegecraft.' },
  siege:      { name: 'Siege',          phase: 'Combat',   cost: {},                       art: 'catapult',text: 'A Siege Engine that did not move this year, within 5 squares with a clear line, deals 1 structural damage to a tower\'s top level. Zero removes the level. No levels left: the foundation falls, and the tower with it.' },
  hold:       { name: 'Hold',           phase: 'Movement', cost: {},                       art: 'shield',  text: 'Stay put. A unit on a resource cell still gathers it; a unit that does not move is never "out of position".' },
};
export const ACTION_ORDER = ['advance', 'strike', 'garrison', 'found', 'raise', 'reinforce', 'recruit', 'research', 'siege', 'hold'];

// ── Lore (kept from the Lotus manifesto where it exists; [new] = written for units the manifesto lacks — rewrite freely) ──
export const LORE = {
  infantry:       { title: 'The Counted',           quote: 'One soldier can die. A formation must survive.' },
  heavy_infantry: { title: 'The Plated',            quote: 'Armour is just a promise the poor are made to carry.', isNew: true },
  cavalry:        { title: 'The Iron Pilgrims',     quote: 'A soldier who stops moving has already surrendered.' },
  heavy_cavalry:  { title: 'The Long Road',         quote: 'They do not charge the line. They charge the idea that there was one.', isNew: true },
  archer:         { title: 'The Children of the Last Watch', quote: 'They are not taught whose lives matter.' },
  monk:           { title: 'The Walkers of the Mist', quote: 'They arrive, strike once, and are already on their way home.', isNew: true },
  priest:         { title: 'The Keepers of the Last Prayer', quote: 'What they cannot spare you, they will carry for you.', isNew: true },
  siege:          { title: 'The Patient Engine',    quote: 'A wall is only a question. This is the answer, delivered slowly.', isNew: true },
  mage:           { title: 'The Architects of Silence', quote: 'It began as an attempt to preserve civilization. It ended with the discovery that civilization was merely another variable.' },
  dragon:         { title: 'The Exiled Heaven',     quote: 'It is simply trying to remember the way home.' },
  tower:          { title: 'The Last Walls',        quote: 'A declaration that someone owns the ground beneath it.' },
  // Lotus-era lore kept for later (not units in this ruleset yet):
  leviathan:      { title: 'The Hunger Beneath',    quote: 'It does not protect them. It tolerates them.' },
  inquisitor:     { title: 'The Last Confession',   quote: 'It removes the permission to be afraid.' },
  ship:           { title: 'The Drowned Fleets',    quote: 'The Admiralty records these as operational losses. The sailors call them offerings.' },
};
export const ACTION_LORE = {
  advance: 'Every road in Aurelia leads to someone else\'s wall.', strike: 'Faith is obedience. Obedience is a plan.', garrison: 'Whoever holds the top holds the view.',
  found: 'A promise, set in stone, with someone else\'s sweat in it.', raise: 'The higher the Tower, the farther its influence reaches.', reinforce: 'Fear, poured into mortar.',
  recruit: 'Names are replaced with identification marks.', research: 'Scholars promise knowledge in exchange for bodies.', siege: 'Time is the heaviest weapon.', hold: 'The watch never ends.',
};
