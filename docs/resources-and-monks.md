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
