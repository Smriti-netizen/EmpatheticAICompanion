# Live2D cat avatars (Phase 2)

Drop Cubism Editor exports here when ready:

```
milo/   milo.model3.json, milo.moc3, textures/
coco/   coco.model3.json, coco.moc3, textures/
ziggy/  ziggy.model3.json, ziggy.moc3, textures/
```

Until those files exist, the app uses **FluidCatAvatar** (original SVG Milo / Coco / Ziggy)
with voice-reactive mouth, blink, breath, and expression gestures.

## Rig parameters to map in Cubism

- `ParamMouthOpenY` — audio amplitude
- `ParamEyeLOpen` / `ParamEyeROpen` — blink
- `ParamBrowLY` / `ParamBrowRY` — expression
- Motions: `idle`, `nod_warm`, `lean_concerned`, `open_hand_attentive`

## Licensing

Live2D Cubism free tier has commercial revenue limits — review before shipping paid product.
Original cat designs only (no third-party IP).
