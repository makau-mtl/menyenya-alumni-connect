# Brand: mhs.alumni

Chosen by the product owner on 16 October 2026, "for now" (it can be revisited with the officials).

## The logo

**mhs.alumni**: "mhs" in Nunito Sans Black, a gold full stop, "alumni" in Nunito Sans Regular, all lowercase.
Short enough to work as a social media handle and a WhatsApp profile name.

| File (`public/brand/`) | Use |
|---|---|
| `mhs-alumni-logo.svg` / `.png` | On light backgrounds: documents, letters, the website |
| `mhs-alumni-logo-white.svg` / `.png` | On navy or photos |
| `mhs-alumni-icon.svg` | App icon (rounded square) |
| `mhs-alumni-profile-1080.png` | Profile picture for WhatsApp, Facebook, LinkedIn, X (crops to a circle cleanly) |

Website icons: `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico` (the browser tab shows "m" at tiny sizes).

The SVG files are outlined shapes, so they print exactly without the font installed. Printers prefer the SVG.

## Colours

| Name | Hex | Use |
|---|---|---|
| Navy | `#17283B` | Logo, text, dark backgrounds |
| Gold | `#E9A94B` | The full stop in the logo; Donate buttons and progress |
| Tea green | `#2E6B4F` | Buttons and links |
| Paper | `#F7F7F4` | Light backgrounds; the logo on navy |

## Type

- Nunito Sans: logo, body text, buttons.
- Domine: headings on the website.

Both are free (SIL Open Font License) from Google Fonts.

## Do and don't

- Keep it lowercase, with the gold full stop.
- Leave space around it: at least the height of the "h" on every side.
- Don't stretch it, add effects, or put it on busy photos without a navy band behind it.
- Under the logo, "Menyenya SDA High School" may appear in small text where people may not know "mhs".

## Regenerating the files

The SVGs are built from the font by a script (fontTools); ask the developer to regenerate if the
colours or letters change.
