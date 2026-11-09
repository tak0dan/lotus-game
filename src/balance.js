// THE TOWER GAME — all numbers and texts in ONE place.  Edit freely; rules, AI, cards and codex all read from here.
// Values marked (RB) come straight from the rulebook (v1.0, "тестові" = test values); everything else is a [DECISION] of mine that the
// rulebook leaves open (costs, build times, specialisations...) — tune these with `node test/sim.mjs`.
//
// Currency: gold = recruiting + upkeep · iron = towers, siege, heavy units · mana = magic, dragons.

// Tuning hook for the simulator:  TG_TUNE='{"CAPITAL_GOLD":8}' node test/sim.mjs   (ignored in the browser)
const T = (typeof process !== 'undefined' && process.env && process.env.TG_TUNE) ? JSON.parse(process.env.TG_TUNE) : {};
export const RESOURCES = ['gold', 'iron', 'mana'];
export const RES_NAME = { gold: 'Gold', iron: 'Iron', mana: 'Mana' };

// ── Units ───────────────────────────────────────────────────────────────────────────────────────────
// mov: squares per year (orthogonal, 1 each) · atk/def: deterministic (ATK > DEF kills; equal = both live) · rng: 0 = melee
// upkeep: gold per year (RB) · cost: paid when ordered · time: years to recruit · at: building spec that can recruit it · minLevel: tower levels needed
export const UNITS = {
  infantry:       { name: 'Infantry',        class: 'Foot',     mov: 3, atk: 2, def: 2, rng: 0, upkeep: 1, cost: { gold: 2 },            time: 1, at: 'barracks', minLevel: 1, climb: true,  builder: true },
  heavy_infantry: { name: 'Heavy Infantry',  class: 'Foot',     mov: 2, atk: 3, def: 4, rng: 0, upkeep: 2, cost: { gold: 3, iron: 2 },   time: 2, at: 'barracks', minLevel: 2, climb: true },
  cavalry:        { name: 'Cavalry',         class: 'Mounted',  mov: 7, atk: 3, def: 2, rng: 0, upkeep: 2, cost: { gold: 3 },            time: 1, at: 'stable',   minLevel: 1, climb: false },
  heavy_cavalry:  { name: 'Heavy Cavalry',   class: 'Mounted',  mov: 5, atk: 4, def: 3, rng: 0, upkeep: 3, cost: { gold: 4, iron: 2 },   time: 2, at: 'stable',   minLevel: 2, climb: false },
  archer:         { name: 'Archers',         class: 'Ranged',   mov: 3, atk: 2, def: 1, rng: 3, upkeep: 1, cost: { gold: 2 },            time: 1, at: 'range',    minLevel: 1, climb: true },
  siege:          { name: 'Siege Engine',    class: 'Siege',    mov: 1, atk: 4, def: 1, rng: 5, upkeep: 2, cost: { gold: 3, iron: 3 },   time: 2, at: 'workshop', minLevel: 1, climb: false, siege: true },
  mage:           { name: 'Mage',            class: 'Arcane',   mov: 2, atk: 2, def: 1, rng: 3, upkeep: 2, cost: { gold: 3, mana: 2 },   time: 2, at: 'arcane',   minLevel: 1, climb: true,  arcane: true },
  dragon:         { name: 'Dragon',          class: 'Dragon',   mov: 7, atk: 7, def: 5, rng: 2, upkeep: 5, cost: { gold: 8, mana: 8 },   time: 4, at: 'lair',     minLevel: 2, climb: false, flying: true, tech: 'dragonlore' },
};
export const UNIT_ORDER = ['infantry', 'heavy_infantry', 'cavalry', 'heavy_cavalry', 'archer', 'siege', 'mage', 'dragon'];

// ── Towers ──────────────────────────────────────────────────────────────────────────────────────────
export const FOUNDATION_HP = 6, NORMAL_HP = 3, REINFORCED_HP = 5, MAX_LEVELS = 4;          // (RB) structural durability; max height is open in RB -> 4
export const GARRISON_DEF = 2;                                                                // (RB) +2 DEF defending on a tower
export const COSTS = {
  foundation: { gold: 1, iron: 2 },
  normal:     { iron: 2 },
  reinforced: { gold: 1, iron: 4 },
  spec: { outpost: {}, barracks: { gold: 1 }, stable: { gold: 1 }, range: { gold: 1 }, workshop: { iron: 2 }, arcane: { mana: 2 }, lair: { mana: 4, gold: 2 } },   // surcharge when the foundation is laid
};
// A tower's specialisation is chosen when its foundation is laid. The main fortress has the first three.
export const SPECS = {
  outpost:  { name: 'Outpost',  text: 'No recruiting. Cheap control of a resource cell or a ridge.' },
  barracks: { name: 'Barracks', text: 'Recruits Infantry; Heavy Infantry from level 2.' },
  stable:   { name: 'Stable',   text: 'Recruits Cavalry; Heavy Cavalry from level 2.' },
  range:    { name: 'Archery Yard', text: 'Recruits Archers.' },
  workshop: { name: 'Workshop', text: 'Builds Siege Engines — the only way to break a tower.' },
  arcane:   { name: 'Arcane Tower', text: 'Recruits Mages.' },
  lair:     { name: 'Dragon Lair', text: 'Needs Dragonlore. Raises Dragons over several years.' },
};
export const FORTRESS_SPECS = ['barracks', 'stable', 'range'];
export const FORTRESS = { levels: ['reinforced', 'reinforced'], queueSlots: 2 };               // start-state of each main fortress
export const QUEUE_SLOTS = 1;                                                                  // recruits in progress per ordinary tower

// ── Economy ─────────────────────────────────────────────────────────────────────────────────────────
export const YIELD = { unit: T.YU ?? 1, tower: T.YT ?? 1, garrisoned: T.YG ?? 2 };                                     // (RB, test values) per resource cell per year
export const CAPITAL_GOLD = T.CAPITAL_GOLD ?? 10;                                                                 // [DECISION] the home province pays gold even without a cell
export const START_RESOURCES = { gold: T.START_GOLD ?? 14, iron: T.START_IRON ?? 6, mana: 2 };
export const TECHS = {
  dragonlore: { name: 'Dragonlore', cost: { mana: 6, gold: 4 }, text: 'Unlocks Dragon Lairs and Dragons.' },
  siegecraft: { name: 'Siegecraft', cost: { iron: 6 },          text: 'Siege Engines deal 2 structural damage per hit instead of 1.' },
};

// ── Victory ─────────────────────────────────────────────────────────────────────────────────────────
export const FORTRESS_HOLD_YEARS = 1;      // (RB) occupy the enemy fortress and keep it through the next year
export const POINTS_HOLD_YEARS = 2;        // [DECISION] hold a strategic majority for 2 consecutive years

// ── Orders (action cards) ───────────────────────────────────────────────────────────────────────────
// phase = when it resolves in the year.  cost is what the order spends (gold/iron/mana) — shown on the card.
export const ACTIONS = {
  advance:    { name: 'Advance',        phase: 'Movement', cost: {},                       art: 'arrow',   text: 'Move up to your MOV, one square at a time, orthogonally. Friends and enemies block the way; a tower base can only be entered by climbing it.' },
  strike:     { name: 'Strike',         phase: 'Combat',   cost: {},                       art: 'swords',  text: 'Attack an enemy in reach after movement. Effective ATK = ATK + 1 for every other friend striking the same target. ATK above DEF destroys it; equal changes nothing.' },
  garrison:   { name: 'Garrison',       phase: 'Movement', cost: {},                       art: 'tower',   text: 'Climb an own (or empty enemy) tower: costs 1 extra MOV. The garrison defends with +2 DEF, can only be hit by ranged units, and doubles the tower\'s yield. Cavalry, dragons and siege engines cannot climb.' },
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
