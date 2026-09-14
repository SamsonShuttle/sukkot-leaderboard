# Replacement artwork drop zone

Place new event artwork here before asking an agent to wire it into the app. Files inside `public/` are bundled for offline use and are available at runtime under `/assets/...`.

Recommended structure and names:

```text
public/assets/
├── branding/
│   ├── sukkot-mark.svg
│   └── almond-house-mark.svg
├── houses/
    ├── Lion.png
    ├── Menorah.png
    └── Preists.png
└── wheel/
    ├── tithe-10.svg
    ├── turtle-dove.svg
    ├── ram.svg
    ├── ox.svg
    ├── free-pass.svg
    └── spin-again.svg
```

SVG, PNG, and WebP are suitable. Keep the important icon centred; the current house cutouts are displayed with `object-fit: contain` in the projector's semantic-colour header. House names are rendered separately by the interface, so replacement artwork does not need to include text.

Do not delete the current files in `public/banners/` until replacements have been checked in both light and dark modes at desktop and mobile sizes.

The supplied wheel artwork is wired at runtime from the central configuration: `tithe-10-percent.png`, `two-turtle-doves.png`, `three-rams.png`, and `four-oxen.png`. Keep the existing number/percentage callouts visible when imagery is shown so the result remains readable and accessible at a distance.

The active house artwork is `Lion.png`, `Menorah.png`, and `Preists.png`. The existing tall banner PNGs are retained as source artwork but are not used by the live interface.
