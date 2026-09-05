# Replacement artwork drop zone

Place new event artwork here before asking an agent to wire it into the app. Files inside `public/` are bundled for offline use and are available at runtime under `/assets/...`.

Recommended structure and names:

```text
public/assets/
├── branding/
│   ├── sukkot-mark.svg
│   └── almond-house-mark.svg
└── houses/
    ├── judah-banner.png
    ├── israel-banner.png
    └── levi-banner.png
```

SVG, PNG, and WebP are suitable. Prefer wide house artwork around a 2:1 aspect ratio with the important crest centered. House names are rendered separately by the interface, so replacement artwork does not need to include text.

Do not delete the current files in `public/banners/` until replacements have been checked in both light and dark modes at desktop and mobile sizes.
