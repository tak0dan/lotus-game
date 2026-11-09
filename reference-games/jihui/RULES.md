# Jihui — the game inside "World of Warcraft: Vol'jin — Shadows of the Horde"

Reading notes (my paraphrase, short quotes only) from the PDF in the designer's PDF copy of the novel. The earlier working name "Jol'Jihn" = **Vol'jin** (the book) and **jihui** (the game).
Main scene: PDF **p.27** (Tyrathan teaches Vol'jin). Other mentions: pp.29, 37, 39, 44, 73–74, 87, 116, 127–128. Not a rulebook — a scene — so some rules are only implied.

## What the book says the game is
- **Board:** flat bamboo grid, **12 × 12**. Each side starts with its pieces on the **last row**, faced toward the opponent, **turned to their lowest value**.
- **Pieces are cubes (six-sided).** Each side owns **24 cubes** (four groups of six), kept in a **canister** (one red, one black). Faces carry symbols: **dots = movement**, an **arrow = facing**. Piece kinds seen: warrior, warlord, archer, kite, knights ("could move far"), cavalry, **ship**, and the **fireship**.
- **A turn (one action):** (a) move/attack as the **top face** says; (b) **turn the cube one face** (change by one side), then move or attack; (c) **pick it up and roll it** to get a random new face; (d) **do nothing on the board and draw a new piece** from the canister (shake and upend it; the first cube out enters play; if two fall out, the second is removed from play and the opponent may draw one for free).
- **Who starts:** each shakes out one cube; the higher top face moves first.
- **Fireship:** a special FACE of a ship cube. It can **destroy anything but is consumed** (removed from play). Of the six ships only **one** can ever become a fireship, and the **only way** to get the face is **rolling** the piece (rule b can't reach it). Some players physically burn the piece afterwards.
- **Winning, culturally:** the aim is to eliminate the opposing pieces, but *doing so is considered ill-mannered and barbaric*. Normally someone is out-manoeuvred and **yields**; yielding to a superior position is **honourable**; losing to a side with more pieces is no disgrace. **A standstill — forces balanced — is "the greatest victory."** The game "balances deliberation with chance, and chance can be punished."
- **Used as lore / metaphor:** pieces on a map table to model the Pandaria war; a character is "the fireship, not yet turned to display his maximum power"; fighters "faced to be at their maximum power"; a hunter splits his forces "as he splits the cubes"; "everything would magically reset like jihui pieces at the start of a game."

## How it lines up with the Lotus manifesto (my reading — for you to confirm)
| Jihui | Lotus manifesto |
|---|---|
| six-sided piece, face = strength/level | every unit has an **ID that is a D6 value** and four levels; level shown "by changing the die or level marker" |
| turn the cube one face (then act) | **kill = gain one level**; "reroll it" at max level |
| roll the cube to get a random face | **the Ritual (roll 5): sacrifice, then reroll eligible units** |
| the fireship face: only reachable by rolling; one per navy; destroys anything, consumed | **the Lotuses**: cannot be recruited, only reached through the ritual; powerful, conditional, **sacrificable** |
| draw a new piece from the canister instead of moving | **summoning by the die** (a roll of 1,2,3,4,6 summons a unit) |
| faced "to maximum power" | Inquisitor "boosts allies to maximum Level"; "keep at max level or reroll" |
| standstill = greatest victory, honourable surrender | (manifesto has no victory condition at all — "an open design decision") |
| 12×12, last-row start | Lotus board 75×75 …  |

## Observations relevant to the project
1. **Lotus is a jihui descendant.** The dice-as-units and the ritual/sacrifice are not arbitrary — worth keeping in mind when deciding what to keep of the Lotus rules on the Tower Game base.
2. **The Tower Game ("no dice") and jihui disagree** on chance. Jihui is explicit that chance is part of the philosophy, but *bounded* (draw/roll is a chosen action that can backfire). If dice/rerolls come back they could be that kind of **chosen, punishable** randomness, not a roll at the start of every turn.
3. **The fireship is the template for a "dirty path" unit:** a one-of-six piece whose only route in is an easily-overlooked alternative action. Matches your design principle (see `../../docs/design-philosophy.md`).
4. **Playtest 1's draw is thematically legitimate**: in jihui a balanced standstill is *the best outcome*. If the Tower Game wants that spirit, a recognised **"standstill"/honourable-yield ending** (concede, or a balance score) would turn the turtle-draw finding (X4) from a flaw into a feature.
5. **12×12 vs 30×30 / 75×75:** the book's board is small. Not necessarily a target, but a reminder that the original source game is compact.
