# Models — The Tower Game miniatures

One `.glb` per unit and per tower module. Edit any one in Blender, export over the file, reload (or open `tools/viewer.html?model=mage`).
Style reference: `reference/style-notes.md` (carved, matte, faceted figurines on stone plinths; slate-blue vs rust armies).

| Rule | Detail |
|---|---|
| Scale | 1 unit = 1 board square. Figures stay inside ~0.75 x 0.75 on their plinth; towers fill ~0.95 x 0.95 |
| Origin / facing | Origin at the base centre. Figures face **+Z** |
| Paint | Any material **named `owner`** is re-tinted slate blue / rust per player |
| Animated nodes | `wing_L`, `wing_R` (flap) · `flag` (ripples) · `orb` (pulses) |
| Tower | NOT one model: stack `tower_foundation` + N x (`tower_level` or `tower_level_reinforced`). Heights come from `models.json` (`top`) |
| Missing file | The game falls back to the built-in procedural model |
