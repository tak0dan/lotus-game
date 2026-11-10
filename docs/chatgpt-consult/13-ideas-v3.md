# ChatGPT ideas chat — round 3 (IDEAS v3: falsifiable gaps, final rules text, scenarios)


…
Worked for 1m 34s
IDEAS v3 — The Tower Game
Version 3 design authority: The supplied engine answers are now treated as implemented behaviour, not proposals.
This version makes three important distinctions:
    Documented gap: The engine produces an unusual but deterministic result that follows from its rules.
    Deliberate strategic interaction: A player can intentionally exploit the result.
    Bug: The engine permits an unintended or inconsistent result that should be corrected.
I will also distinguish between an actual exploit and a timing trap. Both can reward careful reading, but they are not the same thing.
Testing convention: Coordinates are (x,y). Unless stated otherwise, all units and structures belong to the named player, all unspecified units are absent, and card inventories are stated after upkeep. The digest does not provide costs for ordinary orders, so I will not invent them. Where a trace requires an already queued recruit or an already funded order, that is explicitly stated.
TASK 1 — TWELVE TESTABLE RULE INTERACTIONS
Part A — The top eight, corrected
1. The Living Tower Network
Deliberate gap
Relevant engine rules
    Maximum tower height is 5.
    Highland adds 1.
    Three or more orthogonal neighbouring towers of the same owner, each with at least one level, add the minimum level count among those neighbours.
    The calculation is dynamic, non-reciprocal, and overlapping groups are permitted.
    Existing levels are never demolished when the maximum decreases.
Test scenario
Player A owns four towers:
Tower
Position
Terrain
Levels
A
(10,10)
Plain
2
B
(10,9)
Plain
3
C
(10,11)
Plain
2
D
(9,10)
Plain
4
A has three qualifying neighbours: B, C and D.
Its maximum is:
5+min⁡(3,2,4)=7
5+min(3,2,4)=7
A therefore has a maximum height of 7.
Resolution trace
    Economy: Player A pays upkeep. No relevant changes.
    Recruitment: No relevant orders.
    Movement: No relevant orders.
    Combat: No relevant attacks.
    Building: A submits a level order for Tower A. The engine recalculates its maximum: 7. A may build if the ordinary construction conditions are satisfied.
    Control: No relevant changes.
    End of year: The new level remains.
Now remove Tower D's last level in a later siege.
The network bonus disappears because A has only two qualifying neighbours.
A's maximum returns to 5.
If A already has 6 levels, those levels remain, but A cannot grow further.
Cards: No special resource requirement beyond the ordinary level-building cost.
Why skimmers miss it: They read the five-level limit as a fixed maximum and overlook the dynamic minimum-neighbour calculation.
Counter: Attack the weakest supporting tower. The minimum neighbour determines the entire bonus.
Engine test: Build three neighbours with different heights, raise the centre tower, remove the weakest neighbour, and attempt another level.
2. The Arcane Conversion Timing Window
Deliberate gap
Relevant engine rules
    Upkeep is paid before Economy.
    Arcane conversion occurs in Building.
    Conversion costs 2 Soul + 2 Aether + 2 Ember.
    It creates a finished non-fortress tower.
    A recruit in progress or Dragon garrison blocks conversion.
Test scenario
Player A has:
    2 Soul cards.
    2 Aether cards.
    2 Ember cards.
    No Dragon garrison.
    No recruit in progress at the target location.
    An eligible conversion square at (20,20).
The six cards are already available after upkeep.
Resolution trace
    Economy: Upkeep has already been deducted from the budget. Player A submits the conversion order.
    Recruitment: No recruit is in progress at (20,20).
    Movement: No relevant movement.
    Combat: No relevant attacks.
    Building: Arcane conversion resolves first. The engine consumes 2 Soul, 2 Aether and 2 Ember and creates the finished tower.
    Foundations and levels: Resolve after conversion.
    Control: The new tower's control consequences are evaluated.
    End of year: Its effect on node yields is reflected in the next year's budget calculation.
The exploit: The player can commit to an expensive conversion without worrying that its cost will retroactively change the upkeep already paid.
The conversion is an investment in the next economic cycle, not a way to escape current upkeep.
Why skimmers miss it: They mentally group all resource operations into Economy.
Counter: Deny the relevant resource nodes before the following year's yield calculation.
Engine test: Verify that the conversion consumes cards in Building and does not alter the current year's upkeep or budget calculation.
3. The Dragon's Two Different Entry Requirements
Deliberate gap
Relevant engine rules
    A completed Dragon recruit must perch immediately on a free own tower of height 3+, excluding Arcane Towers.
    If no eligible tower exists, the Dragon dies.
    A flying Dragon may land on any other qualifying tower without a friendly or Dragon garrison.
    An enemy garrison is crushed and ownership changes.
Test scenario
Player A owns:
    Tower A at (30,30), height 3, empty.
    Tower B at (35,30), height 3, empty.
Player B owns Tower C at (40,30), height 3, with one Infantry garrison.
Player A has a completed Dragon recruit waiting for placement.
Resolution trace
    Economy: Upkeep is paid.
    Recruitment: The Dragon perches on Tower A, the nearest qualifying free own tower.
    Recruitment: The Dragon is now placed.
    Movement: Player A orders the Dragon to fly to Tower C.
    Movement: Tower C has no friendly or Dragon garrison. The enemy Infantry is crushed. Tower C changes ownership to Player A.
    Combat: Other strikes resolve normally.
    Building: No relevant orders.
    Control: Ownership is evaluated.
Cards: No new recruitment cost during this trace; the Dragon's recruit completed previously.
The exploit: Recruitment placement and subsequent flight are governed by different eligibility conditions.
Why skimmers miss it: They assume the recruitment perch restriction also applies to flight.
Counter: Maintain Dragon garrisons on important towers, since another Dragon cannot land on a tower with a Dragon garrison.
Engine test: Verify that recruitment refuses an enemy tower, while flight can seize it and crush its non-Dragon garrison.
4. The Priest's Moving Protection
Deliberate gap
Relevant engine rules
    A Priest protects each friendly unit within Chebyshev distance 2.
    The Priest itself is excluded.
    The Priest must not be idle.
    Each protected unit voids one hit per year.
    Idle units ignore unit orders.
Test scenario
Player A:
    Priest at (50,50).
    Heavy Infantry at (52,50).
    Infantry at (51,51).
Player B:
- Mage at (53,50).
All units are active.
Resolution trace
    Economy: Upkeep is paid; the Priest is not idle.
    Recruitment: No relevant orders.
    Movement: The Priest remains at (50,50).
    Combat: The Mage strikes the Heavy Infantry. The Heavy unit's hit void applies according to its own rule, while the Priest's protection also applies to the Heavy unit for the year.
    The Infantry at (51,51) is independently eligible for one Priest-provided hit void.
    Later strikes against either protected unit cannot consume another Priest-provided void that year.
    End of year: Surviving units heal.
The exploit: One Priest can protect multiple units, including Heavy units, but each protected unit gets its own protection.
Why skimmers miss it: They may interpret the Priest as providing one shared defensive charge rather than one charge per friendly unit.
Counter: Attack from multiple directions, use enough strikes to exhaust individual protection, or make the Priest idle through upkeep pressure.
Engine test: Strike two different protected units once each and verify that both receive the protection independently.
5. The Monk's Exact-Return Failure
Bug to fix
Relevant engine rules
    Monks that strike withdraw exactly as many squares as they advanced.
    Withdrawal occurs after siege orders.
    The withdrawal happens only if such a square exists.
Test scenario
Player A Monk begins at (60,60).
Its submitted movement route is:
(60,60) → (61,60) → (62,60) → (63,60)
It advances three squares.
Player B has an Infantry unit at (62,60) by the time withdrawal occurs.
Player A has a valid strike against an adjacent target after movement.
Resolution trace
    Economy: No relevant changes.
    Recruitment: No relevant changes.
    Movement: Monk advances three squares to (63,60).
    Combat: Monk strikes its adjacent target.
    Siege: All siege orders resolve.
    Monk withdrawal: It must withdraw exactly three squares.
    Its original route is blocked at (62,60).
    The engine must determine whether another route exists or whether withdrawal fails.
The exploit: If the engine allows a Monk to strike knowing that its withdrawal route can be obstructed, an opponent can deliberately trap it after its attack.
Why skimmers miss it: They assume that returning means reversing the original movement path.
Counter: Occupy the withdrawal route or force the Monk to approach from a position with no alternative exact-distance route.
Verdict: Bug to fix unless the engine already has a defined fallback. I recommend: if no legal withdrawal path of exactly the required length exists, the Monk remains at its post-movement position.
That preserves the exact-distance requirement without inventing displacement or death.
6. Runic Gauntlets Against Heavy Units
Deliberate gap
Relevant engine rules
    Heavy voids one hit per year from its light version, ranged units or Dragons.
    This protection does not apply against a Monk with Runic Gauntlets.
    Every strike is one hit.
Test scenario
Player A:
- Monk with Runic Gauntlets at (70,70).
Player B:
    Heavy Infantry at (71,70).
    Heavy Infantry needs 2 hits to die.
Resolution trace
    Economy: Both units are active.
    Recruitment: No relevant orders.
    Movement: Monk remains adjacent to the Heavy Infantry.
    Combat: Monk submits a strike against (71,70).
    Strike validation: The units are orthogonally adjacent.
    Strike resolves: One hit is applied.
    Heavy's void does not activate because the attacker is a Monk with Runic Gauntlets.
    The Heavy survives with one hit remaining.
    End of year: The Heavy heals fully if it survives.
Cards: No special card requirement in the strike trace; the equipment is already present.
The exploit: A specialist Monk bypasses an otherwise reliable Heavy defence.
Why skimmers miss it: The exception is buried inside the Heavy rule rather than described as a Monk ability.
Counter: Prevent Monk access to melee range or protect the Heavy with a Priest.
Engine test: Repeat with and without Runic Gauntlets. The Heavy should void the first hit only in the unequipped case.
7. Primary Cards as Flexible Budget
Deliberate gap
Relevant engine rules
    Primary Physical, Mana and Spirit cards represent either of their two subtypes.
    Upkeep is paid first from Gold, then Physical.
    Unspent cards vanish at year-end.
Test scenario
Player A receives the following budget after upkeep:
Card
Quantity
Gold
0
Physical primary
2
Mana primary
2
Spirit primary
2
The player has two possible orders requiring different subtypes of Mana and Spirit.
Resolution trace
    Economy: Upkeep is paid; the six primary cards remain.
    Economy: The player submits the appropriate research or other player-level orders.
    Recruitment: No relevant orders.
    Movement: No relevant orders.
    Combat: No relevant orders.
    Building: The player assigns the relevant primary cards to their permitted subtypes when paying for eligible orders.
    End of year: Remaining cards disappear.
The exploit: The primary card preserves a choice between its two subtypes, allowing the player to avoid committing their entire economy to one specialization prematurely.
Why skimmers miss it: They treat primary cards as fixed denominations rather than flexible representations.
Counter: Force the player to choose between competing orders within the same yearly budget.
Engine test: Verify that each primary card can be assigned to either permitted subtype, but never both.
Unresolved implementation detail: The exact commitment moment should be recorded. If the engine chooses the subtype at order submission, the player cannot reassign it later.
8. Poverty-Trap Escape Through Disbandment
Deliberate gap
Relevant engine rules
    Upkeep is paid first from Gold, then Physical.
    Unpaid units become idle, beginning with the most expensive.
    Idle units ignore unit orders.
    Idle status does not prevent disbandment.
    Disbandment occurs in Economy.
    Disbanded units are removed without battle loss.
Test scenario
Player A has:
    1 Gold card.
    1 Physical card.
    1 expensive Dragon.
    1 Infantry.
    Dragon upkeep requires 2 cards.
    Infantry upkeep requires 1 card.
The player has insufficient budget for both.
Player A has submitted a disband order for the Dragon.
Resolution trace
    Economy: The available cards are used for upkeep, Gold first and then Physical.
    Economy: The Dragon is unaffordable and becomes idle.
    Economy: Its submitted disband order is still valid because IDLE does not prevent disbandment.
    Economy: Dragon is removed without battle loss.
    Recruitment: Recruitment is no longer blocked by the Dragon's idle status, subject to the player-level recruitment rule and available budget.
    Movement: The remaining Infantry may move normally if active.
    End of year: Surviving units heal.
The exploit: A player can deliberately overextend their army, then remove the most expensive idle unit without sacrificing it in battle.
Why skimmers miss it: They assume idle status means the unit cannot be interacted with through any order.
Counter: Attack the player before the disbandment resolves, or deny the economic recovery that would let them recruit again.
Engine test: Make the Dragon idle, submit its disband order, and verify that it disappears during Economy.
Part B — Four additional interactions discovered from the engine answers
9. The Idle Unit Opens Its Own Recruitment Square
Deliberate gap
Relevant engine rules
    Idle units ignore unit orders.
    Disbandment is permitted even for idle units.
    Disbandment happens in Economy.
    Recruitment happens immediately afterward.
    Recruitment requires a free orthogonal neighbour.
Test scenario
Player A owns a tower at (80,80).
Its neighbouring squares are:
Position
Occupant
(80,79)
Idle Heavy Infantry
(80,81)
Friendly Infantry
(79,80)
Friendly Infantry
(81,80)
Friendly Infantry
A completed Infantry recruit is waiting at the tower.
Player A has insufficient upkeep to maintain the Heavy Infantry and has submitted its disband order.
Resolution trace
    Economy: Player A pays upkeep.
    Economy: Heavy Infantry becomes idle.
    Economy: The disband order executes despite the Heavy's idle status.
    Economy: Heavy Infantry is removed from (80,79).
    Recruitment: The completed Infantry recruit checks its four orthogonal neighbours.
    (80,79) is now free.
    Recruitment: The new Infantry appears at (80,79).
    Movement: The new Infantry can receive orders only if its normal order eligibility permits it; it was not present when recruitment occurred.
Cards: The new recruit was queued in a previous year. No new recruitment expenditure is required in this trace.
The exploit: A player can turn an economically unaffordable unit into a recruitment-placement opportunity.
Why skimmers miss it: They see idle status as a restriction but overlook the disband exception and the exact phase ordering.
Counter: Occupy other recruitment squares and force the opponent to maintain expensive garrisons.
Engine test: Confirm that disbandment frees the square before completed recruitment checks placement.
10. The Overheight Siege Network
Deliberate gap
Relevant engine rules
    Three or more orthogonal same-owner tower neighbours provide a height bonus based on their minimum level count.
    The bonus is recomputed dynamically.
    Existing levels are never demolished when the bonus disappears.
    Siege damages the top level, with 2 structural damage when the attacker has Siegecraft.
    A Dragon perched on a tower that falls below height 3 dies.
Test scenario
Player A owns:
Tower
Position
Levels
A
(90,90)
7
B
(90,89)
3
C
(90,91)
3
D
(89,90)
3
Tower A has a maximum of 8 under the shared-height rule.
A Dragon is perched on Tower A.
Player B has a Siege unit positioned to attack Tower A.
Resolution trace
    Economy: Both players pay upkeep.
    Recruitment: No relevant orders.
    Movement: The Siege unit reaches its valid firing or siege position.
    Combat: Ordinary strikes resolve.
    Siege: Player B damages Tower A's top level.
    If the level reaches zero, it falls.
    Tower A's height becomes 6.
    Its shared-height maximum is recalculated. If the support towers remain unchanged, the maximum is still 8.
    The Dragon survives because the tower remains at least height 3.
    In a later year, siege can reduce the tower further. If it falls below height 3, the Dragon dies.
The exploit: The shared-height bonus enables construction of a tall tower, but the tower retains existing levels after its supporting network is damaged. This creates a structure that can remain taller than its current permitted growth maximum.
Why skimmers miss it: They assume that losing the shared-height bonus automatically removes excess levels.
Counter: Siege the tower itself rather than relying solely on destroying its supporting towers. The network bonus cannot be used as a substitute for structural defence.
Engine test: Build an overheight tower, destroy a supporting tower, and verify that the overheight structure remains but cannot grow.
Additional interaction to test: Submit multiple siege orders against a tower in one year. Confirm that each order targets the current top level and that structural damage is applied in the defined sequence.
11. The Rotating Tower Seizure
Deliberate gap
Relevant engine rules
    Ground movement resolves in lockstep.
    Enemy units entering the same square collide and clash.
    An empty enemy tower is seized only by a unit that actually reaches its base.
    When two friendly units attempt to seize an empty enemy tower, the first in resolution order gets it.
    Player resolution order rotates annually.
Test scenario
A neutral enemy tower is at (100,100).
Two allied players, A and B, belong to the same team.
    A's Infantry starts at (100,99).
    B's Infantry starts at (100,101).
Neither square is occupied by an enemy.
Both players submit orders to enter (100,100).
Resolution trace — Year 1
    Economy: Both teams pay upkeep.
    Recruitment: No relevant orders.
    Movement: A is first in the rotating resolution order.
    A's Infantry reaches the tower base.
    The empty tower is seized by A.
    B's Infantry encounters a now-occupied friendly tower base. Its movement cannot complete as originally intended.
Resolution trace — Year 2
If the same situation is recreated and B becomes first in the initiative rotation:
    Economy: Both players pay upkeep.
    Recruitment: No relevant orders.
    Movement: B resolves first.
    B's Infantry reaches the empty tower base.
    B seizes it before A's movement resolves.
Cards: No special expenditure beyond the already funded movement orders.
The exploit: Initiative rotation changes which allied player receives the tower's ownership credit.
Why skimmers miss it: They assume that two friendly orders are equivalent because they serve the same team.
Counter: Coordinate allied orders before submission, or agree which player is entitled to seize the structure.
Engine test: Repeat the same allied movement orders in consecutive years with reversed initiative and verify that the first eligible unit seizes the tower.
This is especially important if tower ownership determines individual Honour, points, or faction-specific objectives.
12. The Monk Returns to an Unprotected Position
Deliberate timing gap
Relevant engine rules
    Priest protection is evaluated during Combat.
    The Priest protects friendly units within two squares, Chebyshev distance.
    A Monk that strikes withdraws after siege orders.
    Withdrawal is exactly the number of squares advanced.
Test scenario
Player A:
    Priest at (110,110).
    Monk at (110,111).
    Enemy Infantry at (113,111).
The Monk advances two squares east:
(110,111) → (111,111) → (112,111)
The Priest is now three Chebyshev squares away from the Monk.
Resolution trace
    Economy: Priest is active.
    Recruitment: No relevant orders.
    Movement: Monk advances to (112,111).
    Combat: The Priest's protection is evaluated. The Monk is outside the Priest's radius.
    The Monk strikes the enemy Infantry.
    Siege: Siege orders resolve.
    Monk withdrawal: The Monk returns exactly two squares to (110,111).
    The Monk is now within the Priest's radius, but Combat has already finished.
    The Priest's protection cannot retroactively prevent hits received during that Combat phase.
Cards: No special card expenditure.
The exploit: A player might believe the Priest protects a square or that returning to its radius grants protection for the attack already resolved.
It does neither.
The protection follows the Priest's actual position and is evaluated during Combat.
Why skimmers miss it: They confuse a unit's final position with its position when the relevant combat rule is evaluated.
Counter: Keep the Priest close enough to the Monk's advanced position, not merely its starting position.
Engine test: Attack the Monk while it is outside Priest range, then return it to range. Verify that the Priest's protection does not apply retroactively.
This is a timing trap rather than a loophole that creates an additional action. It is still worth documenting because it changes how players should plan Monk attacks.
3. Consolidated test matrix
#
Interaction
Verdict
Primary engine test
1
Living Tower Network
Deliberate gap
Dynamic minimum-neighbour bonus
2
Arcane Conversion Timing
Deliberate gap
Upkeep before Building
3
Dragon's Two Entry Requirements
Deliberate gap
Recruitment versus flight
4
Priest's Moving Protection
Deliberate gap
Per-unit protection
5
Monk's Exact-Return Failure
Bug to fix
Blocked withdrawal
6
Runic Gauntlets
Deliberate gap
Heavy void exception
7
Primary Card Flexibility
Deliberate gap
Subtype assignment
8
Poverty-Trap Disbandment
Deliberate gap
Idle unit can disband
9
Idle Recruitment-Square Opening
Deliberate gap
Economy before Recruitment
10
Overheight Siege Network
Deliberate gap
Lost bonus without demolition
11
Rotating Tower Seizure
Deliberate gap
Allied initiative priority
12
Monk's Return and Priest Range
Deliberate timing interaction
Combat before withdrawal
Priority testing: 1, 5, 9, 10 and 11. These are the most likely to expose discrepancies between intended engine behaviour and player interpretation.
TASK 2 — FINAL RULES TEXT
The following is written as proposed rulebook text, not brainstorming. Each subsystem is self-contained so it can be implemented separately.
4. Vacant Throne
Proposed final text
VT-1. Elimination. When a player's fortress is held by an enemy through the required full year, that player is eliminated at End of Year.
VT-2. Structures. All towers, fortresses, levels and attached structures belonging to the eliminated player remain on the board and become neutral. No player inherits them automatically.
VT-3. Units. All surviving units become Ruin Garrisons. They remain in their current positions, occupy their squares and require no upkeep. They cannot receive orders, move, attack, siege, recruit or build. They can be attacked and destroyed normally.
VT-4. Resources. The eliminated player's cards, unspent budget and incomplete research are lost. Completed research remains recorded but has no owner.
VT-5. Nodes. Resource nodes previously controlled by the eliminated player become unclaimed. They can be gathered from under the normal gathering rules. Neutral structures generate no usable income for any player.
VT-6. Strategic points. Points controlled by the eliminated player become unclaimed and cease contributing to their former side's score. Normal control rules determine subsequent ownership.
VT-7. Team games. Elimination removes one player's seat, not the entire team, provided another teammate remains active. The eliminated player's structures and units become neutral exactly as described above. A team is eliminated only when none of its players remain active.
VT-8. Neutral remnants. Ruin Garrisons and neutral structures can block movement, recruitment placement and access to territory. They do not count toward any player's victory conditions.
5. Last Testament
LT-1. Eligibility. Upon elimination through the fortress rule, a player receives one Last Testament. A player who voluntarily yields does not receive one.
LT-2. Selection. The eliminated player secretly selects exactly one surviving unit and submits one final order for it: Move, Strike, Siege or Disband.
LT-3. Resolution. The order resolves in its normal phase during the following year, using ordinary movement, combat, terrain and siege rules. It receives no special priority over active players.
LT-4. Restrictions. The testament cannot order recruitment, research, Arcane conversion, construction, resource transfer or control changes. It cannot be modified after submission.
LT-5. Failure. If the selected unit no longer exists or cannot legally perform its order when resolution occurs, the testament has no effect.
LT-6. Completion. After resolving its order, a surviving selected unit becomes a Ruin Garrison. All other surviving units of the eliminated player are already Ruin Garrisons.
LT-7. Team games. An eliminated teammate may use their Last Testament but cannot issue orders for another teammate, transfer resources or structures, or alter team ownership. The testament cannot be used to circumvent the elimination of an entire side.
LT-8. Limit. Each eliminated player receives one Last Testament, regardless of the number of surviving units.
6. Yield — Honourable Surrender
YD-1. Declaration. During order submission, an active player may submit one YIELD order naming an active player belonging to another side. Yielding to a teammate is prohibited.
YD-2. Commitment. Yield is irreversible once orders are revealed. It resolves at the beginning of Economy, before ordinary orders.
YD-3. Elimination. The yielding player immediately relinquishes their seat. Their structures and towers become neutral, their units become Ruin Garrisons, their nodes and strategic points become unclaimed, and their cards and incomplete research are lost.
YD-4. Recognition. The named recipient receives one Honour Mark. Honour Marks are public, permanent, non-transferable and cannot pay any cost.
YD-5. Victory. Honour Marks break ties between players satisfying the same victory condition simultaneously. In team games, the marks of active and honourably recognized members are added to the team's tie-break total.
YD-6. Restrictions. Yield transfers no territory, units, cards, research or structures to the recipient. A yielding player cannot submit a Last Testament.
YD-7. Team games. A player may not yield to a member of their own team. Yielding removes only the individual player; their teammates continue playing.
YD-8. Recognition limit. A player may receive no more than one Honour Mark from the same opponent.
YD-9. Scenario exceptions. A scenario may modify Honour's victory significance, but ordinary games use Honour exclusively as a tie-breaker.
TASK 3 — SIX SCENARIOS
These scenarios use the existing engine. Any scenario-specific victory condition overrides the ordinary victory condition only where explicitly stated.
7. Scenario I — The Race to the Spire
Dark Fortress Under Stormy Skies - AI Wallpapers
Players: 2–4 | Type: Construction race
The players begin around a central region containing a highland square suitable for a monumental tower. Each faction must establish a network of at least three orthogonally adjacent towers of its own ownership, develop their shared height bonus, and construct a central Spire. The objective is to build one tower to its maximum currently permitted height, including all applicable highland and shared-neighbour bonuses. The first player to reach that height and hold the Spire through the following End of Year wins. Siege, resource denial and destruction of supporting towers are permitted. Existing excess levels remain intact if the supporting network collapses, but further construction becomes impossible until the maximum permits it again.
8. Scenario II — The Hunt of the First Dragon
AI Generated Gothicspire Photos and Artwork | Deep Dream Generator
Players: 2–6 | Type: Military competition
An ancient Dragon begins on a central qualifying tower, with surrounding territory containing several highland positions and resource nodes. Players compete to control the approaches, establish qualifying towers and eventually bring the Dragon under their control through the scenario's specified capture condition. The Dragon is governed by a deterministic scenario order rather than dice: its movement and target selection are published before the game begins. Players must balance the danger of approaching it against the opportunity to exploit its tower-landing abilities. The winner is the first faction to capture the Dragon and hold it on an eligible tower for one complete year.
9. Scenario III — The Siege of the Last Nave
Voidborn Prints – Grimdark 3D‑Printed Terrain for 28–32 mm Wargames
Players: 2–5 | Type: Asymmetric siege
One player controls the Last Nave, a heavily fortified cathedral with multiple tower levels and a limited garrison. The remaining players begin outside its defensive perimeter and must coordinate or compete to breach its structure. The cathedral contains the scenario's principal strategic point. Attackers must reduce its tower levels through siege, overcome the garrison and hold the fortress for the required full year. The defender wins by surviving the specified number of years without losing the Nave. Forest approaches restrict Cavalry and Siege, while open terrain permits conventional siege formations. The scenario particularly rewards careful sequencing of strikes, structural damage and recruitment.
10. Scenario IV — The Drowned Kingdoms
Steam 上的 Tenebris Pictura
Players: 3–6 | Type: Territorial control
Aurelia's drowned provinces form a fragmented landscape of islands, narrow land corridors and deep-water barriers. Rock and deep water divide the board into separate territories, while surviving highlands provide valuable construction opportunities. Players begin with small settlements and compete for the remaining strategic points and resource nodes. Movement routes are limited, making tower placement and control of accessible squares exceptionally important. A player wins by controlling more than half of the strategic points for two consecutive years. The scenario emphasizes territorial denial rather than unrestricted expansion.
11. Scenario V — The Three Ashen Passes
MiniWarGaming - Warhammer 40k | Age of Sigmar | Battle Reports | Narrative Campaigns
Players: 2–4 | Type: Strategic positioning
Three highland passes divide the battlefield, each containing a valuable resource node and construction opportunities. The highland terrain increases the maximum permitted height of towers, making these positions particularly valuable. Forests restrict Cavalry and Siege, while rock creates impassable barriers around the passes. Players must decide whether to concentrate their forces on one pass or distribute them across all three. The scenario ends when one faction controls two passes for two consecutive years, or when the ordinary elimination condition is met. Tall defensive towers and carefully positioned Priests are central to the scenario.
12. Scenario VI — The Council of Broken Crowns
禁言长老版型 | Melbourne Masters
Players: 3–8 | Type: Political and honour scenario
The remaining factions gather around the ruins of Aurelia's former political centre. Each begins with a defensible territory and access to several strategic points. The objective is not necessarily to eliminate every rival: players compete for territorial influence, but can also recognize another faction's superiority through Honourable Yield. Honour Marks break victory ties under the normal rules. In this scenario, a Balanced Peace is also possible: if no player achieves a normal victory for three consecutive years, the remaining players may unanimously agree to end the conflict. The result is recorded as a collective standstill rather than an individual conquest. A player who yields voluntarily acknowledges another faction without transferring their kingdom to it.
CHANGELOG — IDEAS v2 → IDEAS v3
Area
Change
Shared tower height
Implemented exact minimum-neighbour formula, including overlapping networks and dynamic recalculation
Overheight towers
Established that lost bonuses prevent further growth but never demolish existing levels
Arcane conversion
Corrected timing: conversion occurs after upkeep and recruitment
Dragon recruitment
Distinguished mandatory recruitment perch from unrestricted qualifying flight destinations
Priest
Established position-dependent, per-unit protection
Monk
Identified exact-return blockage as a genuine unresolved movement case
Heavy
Confirmed Runic Gauntlets bypass the Heavy hit void
Primary cards
Documented subtype flexibility
Upkeep
Confirmed idle units can still be disbanded
Recruitment
Added the disband-before-recruitment interaction
Siege
Added overheight structure interactions
Initiative
Documented rotating priority in allied tower seizure
Vacant Throne
Converted concept into numbered rules
Last Testament
Restricted to one final unit order
Yield
Established Honour Marks, restrictions and team handling
Scenarios
Six scenario formats using actual terrain and tower mechanics
Components
Retained four physical component systems
Outstanding implementation decisions
There are three things I would deliberately leave open rather than silently invent:
    Neutral tower ownership: The normal empty-enemy-tower seizure rule does not explicitly say whether neutral towers can be seized by entry.
    Ruin Garrison targeting: The combat rules need to explicitly establish whether every active faction may attack a neutral Ruin Garrison.
    Monk withdrawal: The exact behaviour when no legal withdrawal path exists needs to be implemented and documented.
These are genuine rulebook-engine alignment issues.
Five questions for IDEAS v4
1. Can a neutral tower be seized simply by entering its base?
This becomes important after Vacant Throne. If neutral structures remain neutral indefinitely unless besieged or otherwise captured, they could become permanent obstacles. I would favour allowing any active player to seize an empty neutral tower by reaching its base.
2. Can Ruin Garrisons be attacked by every active faction, including factions that were previously allied with the eliminated player?
I would favour universal attack eligibility. Otherwise, remnants could become selectively invulnerable political obstacles.
3. Does a tower's shared-height calculation include neutral towers after a player's elimination?
The implemented formula requires neighbouring towers of the same owner. If the eliminated player's towers all become neutral, they might still qualify as neighbours of one another, but cannot support an active player's tower. This needs explicit ownership semantics.
4. Should the Spire Race require the maximum height to be reached through a stable tower network, or is reaching the maximum even temporarily sufficient?
My preference: the tower must reach its current maximum and remain at that height through one complete End of Year. This makes the victory condition defensible and prevents a single construction-phase achievement from ending the game immediately.
5. Should scenarios be allowed to introduce new deterministic behaviour for neutral units, or must every unit always belong to a player?
This is especially important for the Dragon Hunt. A deterministic neutral Dragon would open the door to much richer scenarios, including autonomous fortresses, ancient guardians and abandoned military constructs.
Version 3 design direction: The Tower Game is developing a particularly interesting identity around three interacting systems: dynamic architecture, simultaneous military orders, and political recognition. I would preserve those as the three pillars rather than expanding the unit roster prematurely.
As this conversation gets longer, ChatGPT may lose track of details from earlier in the chat. Upgrade for more context in every conversation.
