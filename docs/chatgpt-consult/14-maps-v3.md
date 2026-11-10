# ChatGPT maps chat — round 3 (MAPS v3)


…
Worked for 27s
THE TOWER GAME — MAPS v3
Aurelia · Revised continental geometry · 10 November 2026
0. Changes to the design approach
The first rasterisation exposed an important problem: a map can satisfy its numerical placement requirements and still feel geographically empty.
MAPS v3 changes the placement philosophy:
Every region must have a geographical purpose, including open plains.
The revised architecture has five layers:
    Continental skeleton.
    Regional biome geometry.
    Landmark and micro-terrain placement.
    Resource and strategic-point distribution.
    Movement, foundation and recruitment validation.
New placement rules
Element
MAPS v3 rule
Rock + water
Target 19%; acceptable 18–20%; absolute maximum 25%
Plain
Open battlefield, populated with landmarks
Starting economy
8 nodes within 8–14 grid squares of each fortress
Starting resources
3 Gold, 3 Iron, 2 mixed
Mid ring
12 nodes per player
Far ring
20 nodes per player
Strategic points
36 per player, distributed across three rings
Aether
Dangerous Architect ruins near barriers
Faith and Soul
Shrines, cathedrals, graveyards and burial grounds
Marsh
Prevents tower foundations
Recruitment
Every fortress must retain sufficient free orthogonal recruitment squares
Hub
Ruined cathedral footprints, natural chokepoints and multiple approaches
One important technical distinction: the coverage figures below are design targets, not claims of a completed raster simulation. Exact percentages and shortest-path distances depend on the rasteriser's polygon-fill, overlap-priority, width-rounding and movement rules. I will distinguish target figures from measurements rather than invent validation results.
1. MAP 1 — The Drowned Testament
4 players
 237 × 237 · 4-fold rotational symmetry
1.1 Revised sector architecture
The western sector now has three geographical rings.
Three-ring architecture
START — Fortress hinterland
8 nodes / player
    Granaries and iron deposits.
    Small standing-stone formations.
    Marsh pockets around the fortress.
    No tower foundations in the immediate marsh belt.
MID — Provincial frontier
12 nodes / player
    Blackwood, broken highlands and ruined villages.
    Minor roads and abandoned causeways.
    First contested resource landmarks.
    Several strategically useful tower sites.
FAR — Imperial ruins
20 nodes / player
    Architect ruins and Aether concentrations.
    Major cathedrals and burial grounds.
    Mountain and water crossings.
    Central hub approaches.
Starting economy
The eight starting nodes are allocated exactly:
Resource
Count
Gold
3
Iron
3
Aether
0
Ember
0
Faith
1
Soul
1
Total
8
The starting economy is deliberately conventional. Aether and Ember should not be immediately available without expansion into more dangerous territory.
Mid and far economies
Resource
Mid
Far
Total
Gold
3
4
10
Iron
3
4
10
Aether
1
5
6
Ember
1
3
4
Faith
2
2
5
Soul
2
2
5
Total
12
20
40
This gives every player the same resource composition while making the dangerous outer territory more attractive to magical and military expansion.
1.2 Revised geographical geometry
The previous forest ellipses should be reduced and separated. They were unintentionally acting as resource containers.
The revised western sector uses these features:
Region
Approximate coordinates
Feature
Fortress hinterland
(0.08–0.22, 0.40–0.60)
Open granaries and small marsh pockets
Northern forest
(0.04–0.20, 0.23–0.36)
Broken woodland
Southern forest
(0.04–0.20, 0.64–0.77)
Broken woodland
Northern mountain ridge
(0.24–0.39, 0.08–0.28)
Rock and highland
Southern mountain ridge
(0.24–0.39, 0.72–0.92)
Rock and highland
Northern Architect ruins
(0.34–0.42, 0.36–0.44)
Aether deposits
Southern Architect ruins
(0.34–0.42, 0.56–0.64)
Aether deposits
Cathedral district
(0.36–0.46, 0.44–0.56)
Faith and Soul
Western standing stones
(0.20–0.28, 0.44–0.56)
Plain landmark
Northern causeway
(0.26–0.38, 0.30–0.36)
Ruined road
Southern causeway
(0.26–0.38, 0.64–0.70)
Ruined road
The open plains receive additional landmarks:
    Isolated highland mounds with tower foundations.
    Circular standing-stone formations.
    Abandoned imperial milestones.
    Ruined aqueduct segments.
    Small patches of highland interrupting otherwise flat ground.
    Broken roads terminating at old settlements.
These decorations do not need to create new strategic points. Their primary purpose is geographical identity and visual readability.
1.3 Hub redesign
Dark Cinematic Medieval City RPG Map - ChatbotsPlace
Inkarnate - Create Fantasy Maps Online
Inkarnate - Create Fantasy Maps Online
The central hub should have four distinct components:
Component
Design
Cathedral of the Last Emperor
Large ruined footprint with multiple entrances
Four broken cloisters
Surrounding ruins, partially enclosed by rock
Imperial square
Open central battlefield
Four approaches
Narrow but equally long approach corridors
The hub should have two chokepoints per approach, rather than a single narrow entrance.
The cathedral footprint should use decorative ruins over traversable terrain, not rock. This allows infantry, cavalry and siege to fight through the ruins without treating the entire cathedral as an impassable object.
The four approaches must have equal path distances and comparable tower-building opportunities.
1.4 Recruitment-space protection
Marsh placement around the fortress needs an additional constraint.
Let F
F be the fortress coordinate and N(F)
N(F) its four orthogonal neighbours.
For every fortress:
∀q∈N(F),q∉Marsh, Rock, Water
∀q∈N(F),q∈/Marsh, Rock, Water
Additionally, reserve at least eight accessible recruitment squares within a small radius of the fortress.
This is deliberately stricter than simply checking the four immediate neighbours. A fortress surrounded by four legal squares but with all nearby expansion blocked is still a poor starting position.
2. MAP 2 — Eight Crowns of Aurelia
8 players
 560 × 560 · 4-fold rotational symmetry
2.1 Continental architecture
The eight-player map consists of four 90-degree wedges, each containing two player territories.
The base wedge is western, centred on the westward radial axis.
Fantasy Map for RPG Campaigns - Hand-Drawn Style | AI Art Generator | Easy-Peasy.AI
Asshai by The Shadow by Anton Ek | Fantasy city, Fantasy landscape, Fantasy places
ArtStation - Minas Ithil, George Rushing | Middle earth art, Middle earth, Fantasy art landscapes
Identity
The Eight Crowns are the remnants of eight provincial powers that once controlled Aurelia's imperial heartland. Each province has its own landscape, but the old imperial road system and the remains of the central cathedral connect them. The continent is divided by mountain chains, drowned territories and ancient industrial scars. Two fortresses occupy each major continental quadrant, sharing a larger geographical region but competing for separate resources and strategic objectives.
2.2 Base wedge — Western quadrant
Fortress positions are:
Player positions
0.167, 0.347
Player 0
Northwestern seat
0.167, 0.653
Player 7
Southwestern seat
Both fortresses sit approximately 0.36 board lengths from the centre.
The wedge has four major geographical layers:
Region
Purpose
Northern outer region
Player 0's economic and defensive territory
Southern outer region
Player 7's economic and defensive territory
Shared middle region
Contested resource territory between the two seats
Inner region
Shared approach to the imperial hub
Per-seat resource allocation
Each seat receives 40 nodes.
Resource
Start
Mid
Far
Total
Gold
3
3
4
10
Iron
3
3
4
10
Aether
0
1
5
6
Ember
0
1
3
4
Faith
1
2
2
5
Soul
1
2
2
5
Total
8
12
20
40
Therefore, each western quadrant contains:
    80 resource nodes.
    72 strategic points.
    Two fortresses.
    Four crossings on each outer neighbouring-sector boundary, with additional internal crossings between the two seats.
The inner shared region should be neutral and should not receive additional player-specific nodes.
2.3 Regional identities
Seat
Home-region skin
Major landmark
Player 0
Drowned imperial province
Sunken cathedral
Player 7
Burned frontier
Imperial forge
The other three quadrants can use:
Quadrant
First seat
Second seat
Northern
Forgotten ecclesiastical province
Shattered industrial province
Eastern
Drowned imperial province
Burned frontier
Southern
Shattered industrial province
Forgotten ecclesiastical province
These are visual assignments only. The mechanical template remains identical.
3. Coverage and balance specification
I need to make a distinction here that matters for your implementation: the following are target coverage values, not measured output from a completed rasterisation. I cannot truthfully report exact path distances or raster percentages without running the same rasteriser and movement validator that produced your previous board.
3.1 MAP 1 — Four-player coverage targets
Terrain
Target coverage
Plain
46%
Forest
17%
Highland
10%
Marsh
8%
Rock
9%
Water
10%
Total
100%
Forest
Highland
Marsh
Plain
Rock
Water
    Plain: 46
    Forest: 17
    Highland: 10
    Marsh: 8
    Rock: 9
    Water: 10
Design targets, not raster measurements.
Nodes per sector
Kind
Start
Mid
Far
Total
Gold
3
3
4
10
Iron
3
3
4
10
Aether
0
1
5
6
Ember
0
1
3
4
Faith
1
2
2
5
Soul
1
2
2
5
Total
8
12
20
40
Strategic points per sector
Ring
Points
Character
Start
8
Defensive settlements, granaries, local roads
Mid
12
Forest shrines, highland sites, regional crossings
Far
16
Architect ruins, cathedrals, hub approaches
Total
36
Crossings and distances
Measurement
Design requirement
Northern neighbouring border
At least 2 crossings
Southern neighbouring border
At least 2 crossings
Total sector crossing allocation
4
Fortress to nearest neighbouring fortress
Must be measured on the final passable-cell graph
Fortress to hub
Must be measured on the final passable-cell graph
Fortress recruitment space
At least 8 reserved legal squares
3.2 MAP 2 — Eight-player coverage targets
The 8-player map uses a different overall terrain composition because it has much more room for distinct continental regions.
Terrain
Target coverage
Plain
43%
Forest
17%
Highland
11%
Marsh
9%
Rock
10%
Water
10%
Total
100%
Forest
Highland
Marsh
Plain
Rock
Water
    Plain: 43
    Forest: 17
    Highland: 11
    Marsh: 9
    Rock: 10
    Water: 10
Design targets, not raster measurements.
Per-seat node distribution
Kind
Start
Mid
Far
Total
Gold
3
3
4
10
Iron
3
3
4
10
Aether
0
1
5
6
Ember
0
1
3
4
Faith
1
2
2
5
Soul
1
2
2
5
Total
8
12
20
40
The base quadrant contains 80 nodes and 72 points.
Strategic points per seat
Ring
Points
Start
8
Mid
12
Far
16
Total
36
Path-distance reporting
The following measurements must be reported by the generator rather than guessed from coordinate distances:
Fortress
Nearest neighbour
Hub
P0 (0.167, 0.347)
P7 (0.167, 0.653)
(0.50, 0.50)
P7 (0.167, 0.653)
P0 (0.167, 0.347)
(0.50, 0.50)
The other six values are obtained by applying the fourfold rotation and evaluating the same path graph.
4. Required JSON schema corrections
There is one practical issue with the requested schema: the original points array has no explicit player ownership, and the eight-player map needs 72 strategic points per quadrant.
I recommend retaining the original objects and adding a seat property:
{
  "at": [0.35, 0.42],
  "nextToNode": 12,
  "ring": "far",
  "seat": 0,
  "note": "Architect observatory"
}
Similarly, nodes should have:
{
  "kind": "aether",
  "at": [0.36, 0.43],
  "biome": "Architect Ruins",
  "ring": "far",
  "seat": 0
}
For the eight-player map, the top-level structure becomes:
{
  "name": "Eight Crowns of Aurelia",
  "players": 8,
  "boardSide": 560,
  "symmetry": {
    "type": "rotation",
    "order": 4,
    "centre": [0.5, 0.5]
  },
  "fortresses": [
    [0.167, 0.347],
    [0.167, 0.653]
  ],
  "terrain": [],
  "crossings": [],
  "nodes": [],
  "points": []
}
This preserves the existing format while making ownership unambiguous.
I am deliberately not presenting these schema fragments as complete replacement JSON files. A complete replacement requires the actual rasterisation conventions to be fixed, particularly because the previous geometry produced 26% impassable coverage. Publishing another set of coordinates with supposedly exact coverage and path distances without executing that rasterisation would repeat the problem MAPS v3 is intended to solve.
5. Changelog — MAPS v2 → MAPS v3
Change
Description
Impassable terrain
Reduced target from 26% to 19%
Plains
Added landmark and micro-terrain distribution
Starting economy
Dedicated eight-node starting ring
Resource rings
Start 8, Mid 12, Far 20
Aether
Concentrated in dangerous Architect ruins
Faith and Soul
Concentrated at spiritual landmarks
Strategic points
Distributed 8 / 12 / 16
Fortress surroundings
Marsh pockets with recruitment-space reservations
Hub
Cathedral footprints and multiple chokepoints
Eight-player architecture
Two fortresses per 90-degree wedge
Sector ownership
Explicit seat property
Coverage
Separate design targets from measured results
6. Five questions for MAPS v4
1. Should the starting ring be guaranteed to contain exactly eight nodes within 8–14 squares, or should eight be a minimum with occasional additional nodes?
2. Should the shared middle region between two fortresses in the eight-player map be neutral, or should it be divided into two equally valuable contested territories?
3. Should ruins have collision effects? For example, should a cathedral footprint permit movement but restrict siege movement, or should ruins be entirely decorative?
4. Should resource nodes have minimum spacing? I suggest a minimum Manhattan distance of 3 squares for ordinary nodes, with exceptions for intentionally designed resource clusters.
5. Should every sector have the same number of Architect ruins, shrines and graveyards, or should only resource counts and strategic value be equal?
The next technical milestone should be a raster-validation pass, not another round of descriptive geography. The most useful input for that is your current rasteriser or the rendered 237×237 board together with its terrain-cell output. That would let the next specification report actual coverage, legal recruitment squares and shortest-path distances rather than estimates.
