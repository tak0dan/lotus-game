# ChatGPT persistent chat — maps — round 1 answer (2026-11-10)

_Verbatim; lines that look like stray web-image captions (e.g. 'Pin on concept', site names) leaked into the answer and are ignored. Round 2 corrections are in the next file when it lands._

MAPS v1".
…
THE TOWER GAME — MAPS v1
Aurelia · Landscape architecture · Regional map generation · 10 November 2026
0. Design principles
The central change from the existing noise-based generator is this:
A large map should not be one continuous landscape generated from noise. It should be a collection of deliberately designed geographical regions, assembled into a coherent continent.
Each region needs three things:
    Geographical identity: a recognisable silhouette, geological history and visual character.
    Strategic identity: a reason to fight over it, avoid it, defend it or cross it.
    Mechanical identity: terrain, resource distribution, movement restrictions and building opportunities.
I propose a three-layer generation system:
Layer
Responsibility
Generation method
Continental skeleton
Seas, mountain ranges, chasms, major barriers
Hand-designed templates
Regional geography
Forests, plains, ruins, highlands, wetlands
Regional biome library
Strategic placement
Nodes, points, roads, passes, bridges
Constraint-based placement
The continental skeleton must come first. Noise should decorate geography, not determine the geography itself.
Important symmetry constraint
There is one mathematical issue worth resolving before implementation.
A square grid supports exact 2-fold and 4-fold rotational symmetry, but not exact 6-fold or 8-fold symmetry as a rotation group of the square lattice. Eight-player maps can use 90-degree rotational symmetry with two players per quarter. Six-player maps require either approximate 60-degree raster symmetry or a different symmetry convention.
For this version:
    4 players: exact 4-fold symmetry.
    6 players: geometrically designed 6-sector layout, rasterised with at most one-cell boundary discrepancies.
    8 players: exact 4-fold symmetry, with two player sectors per quadrant.
This preserves the intended geographical equality without pretending that a square grid can do something mathematically impossible.
1. Landscape library
The following 12 regional types are intended to be reusable building blocks. They are not mutually exclusive: for example, a drowned cathedral can sit inside an inland sea region, while a mountain pass can contain a ruined fortress.
1.1 Regional biomes
Terrain notation: P = Plain · F = Forest · H = Highland · R = Rock · W = Deep water. Rock and deep water are impassable.
Atlas of the Ashen Realms — Forged by Flame
01. The Ashen Expanse
Open terrain
    Terrain: P, occasional H.
    Resources: Gold and Iron, remnants of abandoned settlements and exposed deposits.
    Movement: Unrestricted. Cavalry excels; siege engines have excellent access.
    Building: Excellent tower-building ground, but little natural protection.
    Dragons: Excellent landing and approach territory; towers are exposed.
    Strategic point: Ruined crossroads, old military mustering grounds.
Purpose: The default battlefield. Large enough to manoeuvre armies and difficult to defend without investment.
BLOOMVERSE INTERACTIVE PTE. LTD
02. The Blackwood
Dense forest
    Terrain: F, occasional P clearings.
    Resources: Soul and Faith near ancient shrines; Iron in exposed deposits.
    Movement: Infantry and Monks/Priests can pass. Cavalry and Siege cannot enter.
    Building: Towers can be built in clearings; forest itself does not provide a building bonus.
    Dragons: Can cross by tower-to-tower movement, but cannot use the forest as a landing surface.
    Strategic point: Hidden shrine or forest watchtower.
Purpose: Infantry territory. Protects spiritual resource production and creates natural defensive pockets.
Tsolenka Pass
03. The Iron Crown
Impassable barrier
    Terrain: R, H.
    Resources: Iron and Gold in mountain foothills; Aether around high-altitude deposits.
    Movement: Rock is impassable. Highland is traversable.
    Building: Highland grants +1 tower level. Rock cannot be occupied.
    Dragons: Can bypass the wall only through a connected tower route.
    Strategic point: Mountain gate, elevated watchtower on a pass approach.
Purpose: Separates entire theatres of war. A mountain wall should be a continental feature, not a decorative strip of rock.
The Sinking City 2 News & Updates | TSC2 Wiki
04. The Drowned Basin
Impassable barrier
    Terrain: W, occasional P islands.
    Resources: Gold on islands; Soul around submerged temples; Aether near strange underwater ruins.
    Movement: Deep water is impassable to ordinary units.
    Building: Islands provide limited tower locations.
    Dragons: Cannot land on water; can cross only through connected towers on islands.
    Strategic point: Island citadel or a tower overlooking an ancient submerged city.
Purpose: Creates a geographical divide. Islands become disproportionately important because they provide the only ground-based crossings.
Arcane Art Style: Illustrated Story Backgrounds Midjourney Prompt - promptsideas.com
05. The Godless Rift
Impassable barrier
    Terrain: R, W-like abyss represented by impassable rock.
    Resources: Aether and Soul at the edges, where reality is unstable.
    Movement: Impassable except at designed crossings.
    Building: Towers can be placed on the rim, never inside the chasm.
    Dragons: Can cross only if the tower network supports a valid landing sequence.
    Strategic point: Ancient bridgehead, rift observatory.
Purpose: A narrow, dangerous geographical divide that creates highly concentrated military objectives.
Grimdark Fantasy AI 아트 생성기 | PromeAI
06. The Broken Highlands
Elevated terrain
    Terrain: H, P, occasional R.
    Resources: Iron, Aether and Gold.
    Movement: Highland is traversable; rock is not.
    Building: +1 tower level. Particularly valuable defensive positions.
    Dragons: Excellent tower-perching territory.
    Strategic point: Elevated citadel, ruined observatory.
Purpose: Tower-building territory. Whoever controls its geography can establish disproportionately strong defensive networks.
70 Folk Horror Writing Prompts: Rituals, Isolated Villages & Ancient Dread — Ink & Insights
07. The Mourning Fen
Wetland
    Terrain: P, F, occasional W.
    Resources: Soul and Faith, remnants of forgotten burial grounds.
    Movement: Forest restrictions apply in wooded patches; open ground remains passable.
    Building: Towers favour dry clearings.
    Dragons: Limited landing opportunities; towers must be carefully positioned.
    Strategic point: Sunken monastery, burial mound.
Purpose: Spiritual resource territory with awkward approaches and limited building sites.
파괴 된 성당 - 여파 세계의 일러스트 레이터 벽지시사 | 10wallpaper.com
08. The Cathedral Graveyard
Ruined urban region
    Terrain: P, F, H.
    Resources: Faith, Soul and Gold.
    Movement: Streets remain open; overgrown blocks become forest.
    Building: Ruined foundations provide ordinary tower sites.
    Dragons: Rooftop and tower networks make this region particularly useful.
    Strategic point: Cathedral square, bishop's tower, ruined basilica.
Purpose: High-density strategic geography. A memorable landmark region that naturally attracts battles.
Demonic Terrain | Tabletop Terrain | Wargaming & RPGs
09. The Ember Marches
Volcanic region
    Terrain: P, H, R.
    Resources: Ember and Iron, with occasional Gold.
    Movement: Rock is impassable; other terrain follows normal rules.
    Building: Highland provides elevated tower positions.
    Dragons: Strong tower network potential, but exposed approaches.
    Strategic point: Forge fortress, volcanic watchtower.
Purpose: Industrial and military resource concentration.
SHARDRIFT: AI-Powered Web3 Action RPG | Join Closed Beta
10. The Aether Scar
Arcane region
    Terrain: P, H, occasional R.
    Resources: Aether, with some Soul.
    Movement: Generally open, but rocky formations create impassable pockets.
    Building: Arcane Towers have especially valuable locations.
    Dragons: Arcane Towers cannot be landed on, creating an important exception to normal dragon mobility.
    Strategic point: Ancient observatory, arcane convergence.
Purpose: A region where magical infrastructure matters more than conventional military positioning.
Let's speculate way too much about the Elden Ring expansion image | PC Gamer
11. The Hollow Granaries
Agricultural ruins
    Terrain: P, occasional F.
    Resources: Gold and Iron, with scattered Faith nodes around abandoned villages.
    Movement: Mostly unrestricted.
    Building: Excellent for towers and siege deployment.
    Dragons: Easy landing and tower connectivity.
    Strategic point: Old granary, fortified village, ruined trade square.
Purpose: Economically valuable open territory. A natural place for cavalry manoeuvres and large battles.
Marsh bridge, Patrik Pulkkinen on ArtStation at https://www.artstation.com/artwork/XBEN0D | Fantasy art landscapes, Fantasy landscape, Fantasy places
12. The Imperial Causeways
Movement corridor
    Terrain: P, W, R.
    Resources: Gold and Iron near old toll stations; Faith at abandoned roadside shrines.
    Movement: Designed road corridors cross otherwise impassable terrain.
    Building: Tower sites at junctions, bridges and toll stations.
    Dragons: Bridges and their towers create natural flight-network anchors.
    Strategic point: Toll fortress, bridgehead, imperial crossroads.
Purpose: Deliberately engineered connections between separated geographical regions.
1.2 Barrier crossing architecture
The impassable zones must not simply have random holes. Crossings should be designed as geographical events.
Crossing
Appropriate barrier
Placement principle
Strategic consequence
Mountain pass
Iron Crown
Narrowest natural saddle, preferably between two highlands
Defensible land corridor
Mountain tunnel
Iron Crown
Rare, near an existing ruin or fortress
Creates an alternative route
Ford
Drowned Basin / river-like water
Shallow, narrow section with open approaches
Usually more exposed than a bridge
Stone bridge
Drowned Basin / Godless Rift
At a natural bottleneck
Strong siege objective
Causeway
Drowned Basin
Connects islands or opposite shores
Long, predictable movement corridor
Rift crossing
Godless Rift
One or two designed bridges
Creates a theatre-defining choke point
Placement rules:
    A major barrier should separate regions, not randomly interrupt individual movement routes.
    Every player should have at least one viable route to the central hub.
    A barrier between neighbouring sectors should usually have one primary crossing and one secondary crossing.
    Crossings should be separated enough that defending one does not automatically defend the other.
    A crossing must connect traversable ground on both sides.
    Resource nodes should be placed near crossing approaches, not inside impassable terrain.
    Strategic points should reward control of the approaches, not merely ownership of a bridge tile.
One important distinction: a crossing should not automatically become a strategic point. The bridge may be a tactical chokepoint, while its adjacent strategic point represents the surrounding fortified territory.
2. Three continental map designs
The following maps use the same general architecture:
    Fortresses are positioned at radius 0.36 from the board centre.
    The central hub is a shared geographical region, not an individual player's territory.
    Every player has an inner approach, a middle resource region and an outer frontier.
    The outer and lateral boundaries contain designed barriers.
    Strategic points are concentrated around crossings, resource-rich regions and important landmarks.
Coordinates are normalised to the board: (0,0) is the northwest corner, (1,1) is the southeast corner. Coordinates below describe the player 0 sector and its neighbouring contested territory. Other sectors are generated through the relevant symmetry transformation.
MAP A — The Four Kingdoms of Dust
4 players
 237 × 237 · 36 strategic points · approximately 100 resource nodes
Nightfell (Arkhane Asylum Publishing) • Game On Table Top
Crythos World - Revolutionary Dark Fantasy RPG | Investment Opportunity in Gaming Innovation
AI Generated Crumblingarchitecture Photos and Artwork | Deep Dream Generator
Identity
Once the heart of Aurelia's imperial civilisation, the Four Kingdoms are now divided by a massive geological collapse. Four ruined military territories surround a central imperial city, which remains the only practical meeting point between their armies. Mountain ranges and drowned lowlands make direct invasions difficult, but the old imperial roads still provide access. The map should feel like four distinct kingdoms forced to fight over the remains of one capital.
Player 0 — Western sector
Fortress: (0.14, 0.50)
Sector: Western wedge, approximately 90° wide, extending from the western boundary to the central hub.
Feature
Coordinates / extent
Design
Fortress
(0.14, 0.50)
Open ashland, defensible but not naturally elevated
Fortress road
(0.14, 0.50) → (0.50, 0.50)
Three cells wide, uninterrupted
Outer Blackwood
x: 0.02–0.23, y: 0.17–0.36
Forest belt, broken by two clearings
Northern mountain wall
(0.25, 0.03) → (0.39, 0.28)
Iron Crown, one main pass
Southern mountain wall
(0.25, 0.97) → (0.39, 0.72)
Iron Crown, one main pass
Western resource basin
x: 0.04–0.25, y: 0.39–0.61
Ashen Expanse and Hollow Granaries
Northern pass
(0.34, 0.29)
Highland saddle
Southern pass
(0.34, 0.71)
Highland saddle
Inner ruins
(0.37, 0.40) → (0.47, 0.60)
Cathedral Graveyard
Central hub
(0.50, 0.50)
Imperial capital ruins
The northern and southern mountain walls run along the boundaries with the neighbouring kingdoms. Their passes are the principal land routes between the outer sectors.
The resource basin is the most economically accessible region. The inner ruins, however, are more strategically valuable because they connect the western army to the central capital.
Sector resource distribution
Resource
Nodes
Main location
Gold
6
Western basin, abandoned granaries
Iron
5
Mountain foothills
Aether
4
Highland ruins
Ember
3
Scattered volcanic deposits
Faith
4
Cathedral ruins
Soul
3
Blackwood shrines
Total
25
This gives approximately 100 nodes across the four sectors.
Strategic points
9 per sector · 36 total
Cluster
Points
Reason
Fortress approaches
2
Defensive depth and protection
Northern mountain pass
2
Controls access to the northern sector
Southern mountain pass
2
Controls access to the southern sector
Western resource basin
1
Economic control
Cathedral Graveyard
1
Central approach
Imperial capital approach
1
Access to shared hub
The hub itself should contain additional visually important structures, but its strategic-point ownership must follow the same sector allocation rules. No player should receive an extra point simply because their fortress is geometrically closest.
Intended gameplay
This map has three layers of conflict:
    Local expansion around each fortress.
    Competition for the two neighbouring mountain passes.
    A four-sided struggle for the imperial capital.
The mountain walls prevent unrestricted cavalry and siege manoeuvres between neighbouring kingdoms. Infantry and towers become especially important around the passes.
MAP B — The Sixfold Sepulchre
6 players
 398 × 398 · 48 strategic points · approximately 160 resource nodes
Inkarnate - Create Fantasy Maps Online
Majestic Mountain City Lake HD Wallpaper by Leon Tukker
Diablo Immortal Upcoming Content Update Sees New Main Questline, New Difficulty and More - GamerBraves
Identity
The Sixfold Sepulchre is the remains of a continent whose central region collapsed into an enormous inland abyss. Six old provinces surround the devastation. Their borders are defined by mountains, broken causeways and drowned territories. The centre is not a conventional capital: it is a graveyard of the old civilisation, where the remains of six monumental structures surround the central hub.
Unlike the Four Kingdoms, this map should have a more fragmented geography. Players have multiple routes towards the centre, but the routes are very different in character.
Player 0 — Western sector
Fortress: (0.14, 0.50)
Sector: Western 60° wedge, extending between the northwestern and southwestern neighbouring sectors.
For the 6-player version, the fortress positions are arranged at 60° intervals around the centre. Rasterisation uses a one-cell tolerance at sector boundaries.
Feature
Coordinates / extent
Design
Fortress
(0.14, 0.50)
Ruined provincial fortress
Main road
Fortress → (0.50, 0.50)
Three cells wide
Northern Blackwood
(0.02, 0.15) → (0.28, 0.35)
Large forest region
Southern Mourning Fen
(0.02, 0.85) → (0.28, 0.65)
Wetland with Soul deposits
Northern Iron Crown
(0.22, 0.04) → (0.43, 0.29)
Mountain boundary
Southern Iron Crown
(0.22, 0.96) → (0.43, 0.71)
Mountain boundary
Northern crossing
(0.34, 0.30)
Mountain pass
Southern crossing
(0.34, 0.70)
Causeway over a drowned ravine
Western plateau
(0.06, 0.37) → (0.29, 0.63)
Broken Highlands
Outer city
(0.30, 0.42) → (0.42, 0.58)
Cathedral Graveyard
Central approach
(0.42, 0.45) → (0.50, 0.55)
Imperial road
The continental centre
The central feature is the Sepulchral Ring.
    A large, irregular chasm occupies approximately x: 0.42–0.58, y: 0.42–0.58.
    The central hub sits at (0.50, 0.50), on an elevated island of traversable ground.
    Six monumental ruins are placed around the hub, one per sector.
    Each ruin has an approach from its respective province.
    The ruins are separated by impassable ground, with only designated causeways connecting them.
This gives the central region six different approaches rather than six identical straight roads.
The player can reach the hub through their provincial road, but attacking an adjacent player's inner territory requires controlling a different crossing.
Sector resource distribution
Resource
Nodes
Main location
Gold
8
Provincial ruins and old trade roads
Iron
7
Mountain foothills
Aether
6
Broken Highlands
Ember
5
Volcanic deposits
Faith
7
Monasteries and ruined temples
Soul
7
Fen and burial grounds
Total
40
Approximately 240 nodes across six sectors would be too generous relative to the proposed 160-node target. Therefore, the actual design target is 26–27 nodes per sector, giving approximately 160 total. The table above describes the regional distribution weights, not an additional mandatory allocation.
For implementation, use the following exact sector allocation:
Resource
Nodes per sector
Gold
5
Iron
5
Aether
4
Ember
4
Faith
4
Soul
5
Total
27
This produces 162 nodes, close to the intended target.
Strategic points
8 per sector · 48 total
Cluster
Points
Reason
Fortress outer approaches
1
Defensive expansion
Northern mountain crossing
1
Access to northern province
Southern causeway
1
Access to southern province
Western plateau
1
Elevated tower-building ground
Outer city
2
Dense ruins and resource control
Sepulchral Ring approach
2
Control of central access
Intended gameplay
The six-player map introduces an important distinction: the nearest player is not necessarily the easiest player to attack.
A player may have a short geographical distance to an opponent but still need to cross a mountain wall or a drowned ravine. Meanwhile, a more distant opponent may be accessible through an open corridor.
This creates room for diplomacy, opportunistic attacks and defensive alliances.
MAP C — The Eight Crowns of Aurelia
8 players
 560 × 560 · 60 strategic points · approximately 220 resource nodes
Nightfell (Arkhane Asylum Publishing) • Game On Table Top
Obsidian Mountains Geographic Location in Atælon | World Anvil
3D Game Art Show of US — polycount
Identity
The Eight Crowns of Aurelia is the largest and most geographically diverse map. It represents the heartland of the old continent after its collapse. Eight territories surround the remains of the imperial civilisation, but the land itself is broken into distinct geographical regions. Mountain chains divide the provinces, inland seas isolate entire areas, and the Godless Rift cuts through the old capital's outskirts. The imperial roads still connect the fortresses, but controlling those roads is not enough: the surrounding regions contain the resources, tower sites and strategic positions needed to win.
This should be the showcase map of the game. It should not look like eight copies of the same landscape. It should look like one enormous continent with eight different geographical identities.
Player 0 — Western sector
Fortress: (0.14, 0.50)
Sector: Western 45° wedge, from approximately 157.5° to 202.5° around the centre.
The eight fortresses are positioned at 45° intervals. The map uses exact quarter-turn symmetry, with two players in each quadrant.
Continental skeleton
The following features are the defining structures of the map:
Feature
Coordinates / extent
Description
Western fortress
(0.14, 0.50)
Player 0's starting fortress
Northern neighbouring fortress
(0.245, 0.245)
Player 1
Southern neighbouring fortress
(0.245, 0.755)
Player 7
Central hub
(0.50, 0.50)
Imperial capital
Western road
(0.14, 0.50) → (0.50, 0.50)
Three cells wide
Northern mountain chain
(0.25, 0.08) → (0.43, 0.34)
Iron Crown
Southern mountain chain
(0.25, 0.92) → (0.43, 0.66)
Iron Crown
Northern pass
(0.35, 0.32)
Primary crossing
Southern pass
(0.35, 0.68)
Primary crossing
Western Blackwood
x: 0.02–0.25, y: 0.13–0.35
Large forest
Western Ember Marches
x: 0.02–0.25, y: 0.65–0.87
Volcanic territory
Western Granaries
x: 0.02–0.24, y: 0.38–0.62
Open economic territory
Western Cathedral
(0.34, 0.43) → (0.43, 0.57)
Major ruined landmark
Western Aether Scar
(0.29, 0.34) → (0.39, 0.43)
Arcane territory
Western inner approach
(0.40, 0.46) → (0.50, 0.54)
Contested central corridor
The northern and southern mountain chains should not meet in a straight line. They should bend, creating natural-looking mountain ridges with deliberately positioned passes.
The two neighbouring borders
The western sector has two particularly important boundaries.
Northern border — The Blackwood Frontier
This is the border between players 0 and 1.
    Dense forest occupies the outer portion.
    A mountain ridge blocks the direct central route.
    One major mountain pass provides the main land crossing.
    A secondary forest clearing provides infantry access.
    The forest contains several Soul and Faith nodes.
    The main strategic objective is a ruined watchtower overlooking the pass.
This border favours infantry and defensive towers. Cavalry and siege engines cannot simply ride through the forest.
Southern border — The Ember Frontier
This is the border between players 0 and 7.
    Volcanic highlands and ash plains dominate the region.
    A mountain wall divides the neighbouring provinces.
    One main pass connects their outer regions.
    A second crossing is a ruined causeway.
    Ember and Iron nodes are concentrated around the volcanic formations.
    The main strategic objective is a ruined imperial forge.
This border is more favourable to conventional armies, provided they can control the mountain crossings.
Sector resource distribution
27–28 nodes per sector · approximately 220 total
Resource
Nodes per sector
Regional identity
Gold
5
Granaries and ruined trade settlements
Iron
5
Mountain foothills and volcanic territory
Aether
4
Highlands and arcane ruins
Ember
4
Volcanic territory
Faith
4
Cathedrals and monasteries
Soul
5
Forests and burial grounds
Total
27
A small number of additional nodes can be placed in the central contested regions to reach the target of approximately 220. These should be distributed symmetrically and should not give one sector an additional economic advantage.
Strategic points
7–8 per sector · 60 total
The 60 points should not be distributed as eight identical sets of 7.5. Instead, allocate 60 points across the entire map, with the central region receiving a share.
Cluster
Points per sector
Reason
Fortress approaches
1
Initial defensive territory
Outer regional landmark
1
Regional control
Northern crossing
1
Northern border
Southern crossing
1
Southern border
Resource basin
1
Economic control
Cathedral / major ruins
1
High-value central landmark
Inner approach
1
Access to the imperial capital
Optional regional point
0–1
Depends on sector geography
The central region receives 4 additional strategic points, distributed symmetrically around the hub.
This gives the map 56 points in the eight player sectors and 4 in the central region.
The central points should be exceptionally dangerous to hold, not necessarily exceptionally rewarding. Their importance comes from their position and their contribution to the victory condition.
3. Opening-position analysis — Eight Crowns of Aurelia
3.1 Player adjacency
With eight players arranged around the central hub:
Eight-player arrangement
P2
North
P3
Northeast
P4
East
P1
Northwest
HUB
Imperial capital
P5
Southeast
P0
West
P7
Southwest
P6
South
Clockwise order: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7.
Each player has two immediate neighbours:
Player
Northern / clockwise neighbour
Southern / counterclockwise neighbour
P0
P1
P7
P1
P2
P0
P2
P3
P1
P3
P4
P2
P4
P5
P3
P5
P6
P4
P6
P7
P5
P7
P0
P6
The most important distinction is between three types of neighbours:
    Sector neighbours: Players whose territories share a geographical boundary.
    Hub neighbours: Players whose armies can reach the central region through their respective approaches.
    Distant opponents: Players who are separated by at least one other player's territory or by major geographical barriers.
A player can be a sector neighbour without being an immediately accessible military opponent.
3.2 Natural alliances
The geographical structure creates several possible alliance arrangements.
2v2
The most natural arrangement is adjacent pairs:
    Team A: P0 + P1
    Team B: P4 + P5
Alternatively, P0 + P7 against P3 + P4.
Adjacent allies can coordinate their border defence, concentrate forces on a shared front and avoid having to defend every direction independently.
4v4
There are two particularly interesting arrangements:
Formation
Team A
Team B
Character
Alternating
P0, P2, P4, P6
P1, P3, P5, P7
Four distributed fronts
Continental halves
P0, P1, P2, P3
P4, P5, P6, P7
Two large opposing blocs
The alternating formation creates a more fragmented war. Players must coordinate across the map, and neighbouring enemies can attack from several directions.
The continental-halves formation produces two large fronts, making control of the central hub particularly important.
My preference is to support both formations rather than design one as the intended arrangement.
3.3 Where the Dragon changes the map
Dragon's Rescue | Story.com
The Dragon is potentially the most important geographical unit in the game.
It does not simply ignore terrain. Its mobility depends on the existence of towers of height 3 or greater, and it cannot land on Arcane Towers.
That makes the tower network a second geographical map layered over the physical continent.
Three situations are particularly important:
1. Mountain walls
A player with a developed tower network can potentially cross a mountain barrier without using the ordinary land pass.
However, this requires suitable intermediate landing towers. A mountain wall with no tower network remains an effective barrier.
2. Inland seas and chasms
An island tower or a tower on the opposite rim can turn an otherwise inaccessible region into a viable Dragon route.
This creates an interesting military investment: a player may construct a tower not for resource collection or strategic-point control, but to establish an aerial connection.
3. Arcane territory
Arcane Towers cannot be used as Dragon landing points.
This gives Arcane infrastructure a geographical defensive advantage. An Arcane Tower network can deny the Dragon a convenient landing location, forcing it to find another route.
One important limitation: a Dragon should not be able to treat a tower network as unlimited flight range. The exact number of towers it can traverse per year needs a separate movement rule. Otherwise, the value of long-distance barriers could collapse once one player establishes a sufficiently developed network.
The Dragon's strategic consequences
Region
Without Dragon
With Dragon
Mountain pass
Major military chokepoint
Can potentially be bypassed
Blackwood
Infantry-controlled territory
Tower networks offer aerial access
Inland sea
Island crossings dominate
Island towers become potential flight stations
Cathedral ruins
Dense urban defensive network
Garrison destruction becomes a major threat
Arcane Scar
Magical infrastructure
Potentially denies Dragon landing opportunities
Central hub
Conventional multi-front battle
Tower network may enable rapid reinforcement
My design recommendation: Dragons should change the value of geographical features without making those features irrelevant. The best maps will have some barriers that remain difficult to bypass even with a Dragon, particularly where there are no suitable tower-building sites.
4. Map generation architecture
Before the next version, I would move away from the idea of generating a complete map from a single procedural algorithm.
Instead, use a library of regional templates.
A map should be assembled in this order:
1. Select continental skeleton
Number of players, major barriers, hub shape, continental silhouette
2. Allocate regional biomes
Forests, highlands, wetlands, ruins, volcanic regions
3. Construct barriers and crossings
Mountain walls, chasms, inland seas, passes, bridges, causeways
4. Place fortresses and roads
Equal starting conditions and accessible central hub
5. Place resource nodes
Regional resource distributions and faction access
6. Place strategic points
Crossings, landmarks, regional control and resource adjacency
7. Apply symmetry and validate
Connectivity, equality, point counts, node adjacency and accessibility
The generator should reject a map if it fails any mandatory validation.
Suggested validation rules:
    Every fortress has a three-cell-wide road to the hub.
    Every sector has comparable resource access.
    Every strategic point has an orthogonally adjacent resource node.
    No strategic point occupies a resource node.
    No resource node occupies impassable terrain.
    Every major barrier has its intended crossings.
    No crossing terminates in impassable terrain.
    Every player has comparable access to the required number of strategic points.
    Every player has a viable route to the central contested region.
    Symmetry is preserved after all regional features have been placed.
The last point matters enormously: applying symmetry only to the terrain, then independently generating resources and points, can introduce substantial strategic inequality.
5. Questions for MAPS v2
These are the five decisions that would most significantly affect the next iteration.
1. How absolute should geographical barriers be?
Should a mountain wall or inland sea be completely uncrossable except at designed crossings, or should certain units eventually gain special ways to traverse them? In particular, should Dragons be the only meaningful exception?
2. Can players construct towers anywhere on traversable terrain?
Or should some locations, such as forests, marshes and ruined cities, have restrictions? This changes how we design tower networks and Dragon mobility.
3. Should the central hub be geographically neutral?
Should it be an open battlefield accessible to everybody, or should it contain its own natural barriers, ruins and chokepoints? I favour the latter, provided no player receives an inherent access advantage.
4. How different should individual sectors be?
Should symmetry guarantee identical terrain and resources for every player, with only the visual arrangement changing? Or should sectors have different regional identities while retaining equivalent strategic value?
My preference is different identities with equivalent strategic opportunities.
5. How much of the map should be genuinely inaccessible?
For example, should 20–30% of an eight-player map consist of impassable terrain, creating a continent divided into distinct theatres of war? Or would that make the game too dependent on controlling a handful of bridges and passes?
MAPS v1 — Current design decisions
Version status
Initial proposal
Element
Proposed canon
Regional library
12 reusable types
Major barriers
Mountains, inland seas, chasms
Crossings
Passes, tunnels, fords, bridges, causeways
Map 1
Four Kingdoms of Dust
Map 2
Sixfold Sepulchre
Map 3
Eight Crowns of Aurelia
Generation
Continental skeleton → regions → resources → points
Symmetry
Exact where mathematically possible; raster approximation for six players
Dragon
Tower-network-dependent geographical mobility
The most important design principle established in MAPS v1:
Aurelia should feel like a continent that existed before the players arrived. Its mountains, drowned cities, ancient roads and ruined kingdoms should determine where wars happen. The players should adapt to the geography, rather than the geography being conveniently generated around the players.
That is the difference between a large board and a believable continent.
