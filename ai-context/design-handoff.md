# 2026 printed-material design handoff

## Direction

The leaderboard should feel like a digital camp noticeboard derived from the printed 2026 Sukkot materials: ancient/biblical, warm, celebratory, and easy to scan on a projector or phone. It must not look like a generic neon sports dashboard.

Use parchment and dark-linen surfaces, antique-gold rules and restrained ornaments, sparse lulav/palm greenery, pointed-banner geometry, serif display type, and clean sans-serif UI text. Keep data presentation modern and high-contrast inside this themed shell.

## Authoritative tokens

| Token | Value | Role |
| --- | --- | --- |
| canvas | `#F3E8CE` | Main parchment background |
| surface | `#FFF9EA` | Cards and elevated panels |
| surface-dark | `#10203F` | Header, footer, dark mode surface |
| ink | `#18233B` | Primary light-surface text |
| muted | `#657086` | Nonessential secondary text |
| gold | `#D6A92A` | Rules, icons, rank and active accents |
| gold-dark | `#9D7412` | Accessible gold text on light surfaces |
| green | `#596B49` | Botanical/supporting accent |
| israel | `#08247D` | House of Israel |
| israel-light | `#DCE5FF` | Israel tint |
| judah | `#E9D5A6` | House of Judah |
| judah-light | `#FFF1CF` | Judah tint |
| levi | `#9B0032` | House of Levi |
| levi-light | `#F7DCE4` | Levi tint |
| success | `#2F7D52` | Saved/confirmed feedback |
| danger | `#B42318` | Validation and error feedback only |

These exist as CSS custom properties in `src/styles.css` and Tailwind v3 aliases in `tailwind.config.js`. House identity stays in the semantic `TEAMS` theme map; scoring records must never store visual tokens.

## House treatments

- Israel: royal blue header, antique-gold accents/rank, white text, pale-blue tint, Menorah/banner motif.
- Judah: parchment header, dark-gold accent/rank, deep-navy text (never white), warm-gold tint, Lion/banner motif.
- Levi: crimson/wine header, antique-gold accents/rank, white text, pale-rose tint, priestly-service/banner motif.
- The public projector keeps the explicit house label, name, and motif beneath the house-colour header. Supplied cutout house icons are contained in that header, while a restrained, reduced-motion-safe shine highlights only the current leader's coloured header. The shine supports the artwork and must never obscure the rank or score.

Colour must not be the only identifier. Continue to show names, rank labels, distinct offline banner artwork, and motif text/shapes.

## Type and components

- Display/headings: `Georgia, Cambria, "Times New Roman", serif` or a licensed high-contrast serif.
- UI/body: `Inter, ui-sans-serif, system-ui, sans-serif`.
- Scores use bold sans-serif tabular numerals.
- Uppercase is reserved for small labels with restrained tracking.
- Buttons have minimum 44 by 44 pixel targets and a visible 3-pixel gold focus ring.
- Primary buttons use navy/white with gold active or hover treatment. Secondary buttons use surface/ink with a gold border.
- The current leader uses a subtle gold double rule plus a crown; second and third use compact `#2` and `#3` badges.
- Point activity rows retain activity, signed effect, house identity, and time. Positive status green never replaces house colour.

## Layout

The public view contains a dark title/status bar, event summary, three ranked house cards, compact point-story data, and a fixed horizontal recent-activity ticker. Desktop uses three columns. On phones, the leader remains expanded while second and third place become compact horizontal cards.

The dashboard and organizer share the same parchment shell, dark-navy header, cream cards, gold rules, serif headings, and semantic house headers.

## Light and dark modes

Light mode is the default printed-parchment treatment described above. Dark mode is a dark-linen interpretation of the same system, not a separate sports-dashboard theme: near-navy canvas, navy surfaces, parchment text, antique-gold rules, muted botanical green, and unchanged semantic house banners.

Every route exposes the same moon/sun toggle in its header. The choice is stored locally under `sukkot-color-theme`, is applied before React loads to prevent a theme flash, and synchronizes across open browser tabs. Dark-mode team scores use accessible light variants of each identity colour while Judah's light banner continues to use navy ink.

## Texture and restraint

Use only low-opacity CSS linen/paper texture. Botanical and gold ornaments frame the page and must never sit behind important data. Avoid photographic backgrounds, gradients spanning multiple house identities, excessive glow, tiny decorative text, and decorative type on controls/tables/timestamps.

## Accessibility

- Maintain WCAG AA text contrast. In particular, Judah uses deep-navy ink.
- Pair colour with text, icons, patterns, or banner differences.
- Keep visible keyboard focus and at least 44-pixel controls.
- Preserve loading, empty, error, database/offline, and reduced-motion states in the same language.
- Announce the concise score/ranking summary with `aria-live="polite"`; do not make the entire board a live region.

## Stable UI contract

House IDs remain `judah`, `israel`, and `levi`. Resolve labels, colour, tint, foreground, motif, and banner from the central team map in `src/types.ts`. Any future rank-movement field should be a typed semantic value (`up`, `down`, `same`, or `new`), never inferred from colour.

## Rollback checkpoint

Git was initialized before this redesign. Commit `4582acd` is the complete pre-redesign application checkpoint. Use Git diff/revert workflows to compare or restore; do not use destructive reset commands while user work is present.
