# Findings — player 2

## E1 — Strategic-point win is geometrically unreachable
- Category: victory
- Rule(s): 4 of 6 garrisoned strategic towers for 2 consecutive years; infantry MOV3; foundation->level->garrison pipeline takes 3 years; board 30x30, fortresses 21 columns apart.
- What I did: sent builders from year 1; founded (20,7) Y5, level Y6, garrisoned Y7.
- Result: FAILED — only 1 point by Y10; "held-years: you 0".
- Severity: major. Why: points are 9-17 squares from home; with infantry-only builders you need ~year 7 to have 4 foundations. Effectively a draw/stall game.
- Possible fix: closer points, or stockpile-funded faster builders (cavalry builders).

## E2 — Movement validation uses static positions (box-in)
- Category: movement. Unit #13 was boxed by friends and had 0 reach in Y1; orders validated against start-of-year positions, so friendly units block each other in lockstep columns. Result: WORKED (annoyance). Severity: minor.

## E3 — Turtle + dragon at end of cap
- Category: victory/clarity. P1 turtled, went dragonlore + lair; dragon musters Y9, too late to matter under year cap 10. Draw-forcing by turtling is trivially available since fortress win needs ranged kill of DEF4 garrison and MOV1 siege takes 20 years to cross the map. Severity: major.

## E4 — Foundation on a square enemy cavalry occupies/kills
- Category: towers/siege. My foundation at (19,15) vanished in Y3 (enemy cavalry moved onto/around; no tower listed afterwards). Unclear whether foundations are destroyed by units standing on them. Severity: minor; ambiguity.

## E5 — Cavalry strikes kill without retaliation when target dies simultaneously only if both strike; lone cav raids trade 1:1 for 3g
- Category: combat. Cav (DEF2) vs cav ATK3 always mutual kill; raids cheap (3g) vs 500 stockpile. Siege (ATK4) kills cav alone from RNG5 without risk.

## E6 — Ready resolves instantly when opponent already ready; stale state risk
- Category: harness/orders. Years resolved right after my 'ready' so no look at events before next planning is forced.

## Summary
| Entry | Category | Result | Severity |
|---|---|---|---|
| E1 strategic points unreachable | victory | FAILED | major |
| E2 box-in validation | movement | WORKED | minor |
| E3 turtle draw | victory | worked for P1 | major |
| E4 foundation lost | towers | unclear | minor |
| E5 cav/siege trades | combat | PARTLY | minor |
| E6 instant resolve | harness | noted | minor |
Verdict: turtling/draw strongest; map too large for infantry-only victory conditions within 10 years.
