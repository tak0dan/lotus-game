# Unit models

One `.glb` per unit — edit any of them independently, save, and reload the game (or open `tools/viewer.html?model=dragon`).

| Rule | Detail |
|---|---|
| Scale | 1 unit = 1 board tile. Keep the footprint inside ~0.8 × 0.8 |
| Origin / facing | Origin at the feet, centred. Model faces **+Z** (glTF default) |
| Owner colour | Any material **named `owner`** is re-tinted blue/red per player (colour + emissive) |
| Animated nodes | `wing_L`, `wing_R` (flap) · `halo` (spins) · `flag` (ripples). Keep these names on the node |
| Height | Set `top` in `models.json` (tile units) so level pips sit above the head |
| Glow | Optional `glow` block in `models.json` (colour / size / height) |
| Shading | `models.json → flatShading: true` forces the faceted look; set `false` for smooth normals |
| Missing file | The game falls back to the built-in procedural model |

Blender: File → Export → glTF 2.0 (.glb), +Y up, "Apply modifiers" on. Materials: Principled BSDF.
Keep the unit under ~15k triangles; the board shows dozens at once.
