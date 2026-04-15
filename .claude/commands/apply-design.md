Apply the Fonz Design System to this project. Follow these steps:

## 1. Install Fonts
Add Bricolage Grotesque (display), Plus Jakarta Sans (body), and Geist Mono to the project:
- Next.js: use `next/font/google` in layout.tsx with CSS variables `--font-display`, `--font-sans`, `--font-mono`
- Other frameworks: add via Google Fonts CDN

## 2. Update Color Tokens
Find the project's global CSS (globals.css, index.css, etc.) and update:
- Primary/accent: `#E54D2E` (light) / `#F0613E` (dark)
- Ring: match accent
- Remove any blue accent colors

## 3. Replace Dark Backgrounds
- Replace all `bg-black`, `bg-[#000]`, `bg-gray-950` → `bg-[#1a1a1a]`
- Replace all `bg-gray-900` in dark sections → `bg-[#1a1a1a]`

## 4. Replace Blue Accents
- Replace all `bg-blue-*`, `text-blue-*`, `border-blue-*` accent usage → coral equivalents (`bg-[#E54D2E]`, `text-[#E54D2E]`)
- Keep functional blues (info alerts, links that should be blue) — only replace brand/accent blues

## 5. Apply Font Classes
- All headings, stat numbers, logo text: add `font-[family-name:var(--font-display)]`
- Body text uses the default sans (Plus Jakarta Sans)

## 6. Light Section Pattern
- Alternating sections: default bg and `bg-[#f5f5f7] dark:bg-[#1d1d1f]`
- Cards on light bg: `bg-white dark:bg-[#2d2d2f]` (borderless)

## 7. Verify
- Run `npx tsc --noEmit` to check for TypeScript errors
- Visually confirm: no pure black, no blue accents, fonts applied
