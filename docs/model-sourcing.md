# Sourcing better 3D models (2026-11-10)

The procedural miniatures in `src/models_hd.js` are chunky and do not match the reference art (assets/More/*). Routes tried to get better ones:

| Route | Result |
|---|---|
| Hosted image-to-3D (Hugging Face Spaces: microsoft/TRELLIS.2, tencent/Hunyuan3D-2.1, stabilityai/stable-fast-3d) driven from a script | Works in principle (TRELLIS.2 API: preprocess_image -> image_to_3d -> extract_glb) but the anonymous ZeroGPU quota (~180 s per IP per day) is used up by one call; Hunyuan needs 270 s; stable-fast-3d errors server-side. A logged-in/PRO account would lift this. |
| Poly Pizza (CC0 / CC-BY, direct .glb links, searchable with curl) | 123 candidates downloaded and rendered. All are low-poly, mostly T-posed figures; nothing near the reference look. Useful only for props. |
| KayKit Adventurers (CC0, GitHub) | Cute toy-style, wrong tone. |

Not tried yet: Sketchfab (downloads need a login; Zen is logged in on the designer's machine), Meshy/Tripo free credits, asking ChatGPT/Grok for new multi-view reference sheets to feed an image-to-3D service.
