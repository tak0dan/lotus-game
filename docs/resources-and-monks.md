# Six resources, the desk, Monks and Priests

Designer's rulings (2026-11-10) and how the engine reads them. Items marked **ASSUMPTION** were not specified — please confirm or overrule.

## Resources
- Three families, two kinds each: **Physical** (Gold, Iron), **Mana** (Aether, Ember), **Spirit** (Faith, Soul). Names are placeholders.
- A node on the map is one of the six kinds. A **unit** on it yields 1; a **tower** on it yields 1 and its garrison adds its own part (up to two sources per node).
- **Specialists double**: a Mage on a Mana node, a Monk or Priest on a Spirit node yields 2. Any unit may work any node.
- Each year the yields become **cards on the owner's desk**. Orders tap cards; unspent cards vanish at year end (no stockpile).
- A **primary** card (Physical / Mana / Spirit) can be spent as either of its kinds. Primaries come from Fortress (Physical), Arcane Tower (Mana), Monastery (Spirit). **ASSUMPTION**: source and amounts.
- Upkeep is paid first from Gold, then Physical.

## Units
- **Monk** — moves to its target, strikes, then moves back exactly as many squares as it came. Approach ≤ MOV/2. **ASSUMPTION**: stats, cost, Monastery as recruit tower.
- **Priest** — each friendly unit within 2 squares (Chebyshev, not itself) voids one lethal hit per year. **ASSUMPTION**: radius is Chebyshev.
- **Heavy** units void one lethal hit per year, only if it comes from the light version of the same unit or from a ranged attacker.

## Known consequences
- At game start the fortress's 12 Physical equals the starting army's upkeep, so a player who sends nobody to a node has an empty desk. Intentional pressure, but a poverty trap for beginners; `disband` is the exit.
- Still open: recruit-square denial (X2), rulebook §9.3 "special structure", meaning of "expanding map".

---
## Revision 2026-11-10 (second ruling)
**No attack/defence numbers.** Every strike is one hit; a unit dies when it has taken as many hits as it needs *that year*: 1 for most, **5 for a Dragon**, +1 for a unit inside a tower (Dragon and Mage-strikes excepted). Damage is forgotten at year end. Heavy units still void one hit a year (from the light version or ranged). Priests ward as before.

**Wyverns.** The Dragon never walks. It perches as the garrison of a tower of height >= 3 that is not Arcane, and flies tower to tower (`fly <dragon> <tower>`, any distance). Landing on an enemy garrison kills the unit inside; an enemy tower changes owner. It strikes from its perch within 5 squares, +1 for each level above 3. A hatchling must perch on a free own tower of height 3+ at once or it dies. **ASSUMPTIONS:** (a) if its tower is sieged below height 3 the Dragon dies; (b) two Dragons aiming at one tower: neither lands; (c) the lair itself must be height 3 (recruit level raised 2 -> 3); (d) a Dragon is one hit per strike like everyone else.

**Towers.** Max height 5. With 3 attached towers (orthogonal neighbours, same owner) the limit rises by the number of levels they all share (the lowest of them): [3,4,4] -> 5+3 = 8. **ASSUMPTION:** "attached" = orthogonally adjacent. **Arcane Tower:** pour 2 Soul + 2 Aether + 2 Ember into a finished non-fortress tower (`convert`); it can no longer be founded directly. **ASSUMPTION:** "mana and arcane" read as Aether + Ember.

**Spirit.** Reverted: only Monks and Priests gather Spirit nodes (2 each), or an Arcane Tower standing on the node (1). Ordinary units and towers get nothing from them.

**Map.** Default 75x75. Strategic points are generated (16 in 8 mirrored pairs), never on a resource square, always orthogonally next to one, so a single unit cannot hold both. 

**Pending:** names/lore/maps from ChatGPT (see `docs/chatgpt-consult/` if present), Dragon on the tower in the 3D client, AI does not build Dragons or Arcane Towers yet.

---
## Revision 2026-11-10 (third ruling: turns, economy, island map)
- **Turns are sequential, like chess.** One player at a time, in seat order. On your turn you give orders to any of your units; they resolve at once (economy, recruitment, movement, combat, building, control), then the next seat plays. A round = every seat has played once; round-end checks run then (fortress held through a round, points majority 2 rounds, last side standing). Hits, heavy voids and priest wards count within ONE turn; damaged units are whole again afterwards. No clash rule any more (nobody moves at the same time). **ASSUMPTION:** a turn is the player's whole army, not one move. If you want a tighter chess feel, limit the orders per turn.
- **Budget** is still "what your nodes yield on your turn, unspent is lost", but the flat 12 Physical wildcard from the fortress is gone (that was the "Physical accumulating" oddity). A fortress is a small mine (2 Gold, 1 Iron). The first 10 Gold of army upkeep is supplied by the fortress; only the excess is paid.
- **Costs use the subtypes.** Units ask for specific cards: Infantry 2 Gold; Heavy Infantry 2 Gold + 2 Iron; Cavalry 2 Gold + 1 Iron; Heavy Cavalry 3 Gold + 3 Iron; Archers 1 Gold + 2 Iron; **Monk 2 Soul + 1 Gold; Priest 2 Faith + 1 Gold**; Siege 4 Iron + 1 Gold; Mage 1 Aether + 1 Ember + 1 Gold; Dragon 3 Ember + 2 Aether + 1 Soul. Buildings take ANY card of a family: foundation 2 Physical, level 2, reinforced level 4, **Monastery +3 Spirit**, Lair +3 Mana, Workshop +2 Physical.
- **Start:** every seat gets a ring of 10 nodes (3 Gold, 3 Iron, Faith, Soul, Aether, Ember) within about 10 squares in front of its fortress, and **one Monk** (the only unit that can work Spirit nodes at the start).
- **Richer towards the centre:** a node yields x1 in the outer fields, x2 in the middle ring, x3 on the central island (shown as gold rings in 3D).
- **Island map (Lotus lesson):** a central island ringed by a moat, reachable only over 1-wide bridges; the rim of the island is highland (towers one level higher); seats are separated by rock ridges with two 5-wide gates; strategic points sit at bridge heads and gates. Generated for any player count.
