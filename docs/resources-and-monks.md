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
