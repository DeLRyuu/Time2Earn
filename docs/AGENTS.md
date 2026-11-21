# Time2Earn: full UI redesign instructions

You are redesigning the **look and layout** of Time2Earn, an internet-cafe rewards site where players pay for PC sessions, earn rewards, rank up and redeem prizes.

**Reference design:** `ui-ux-reference/time2earn-redesign.html` (open it in the editor and in a browser). It is the source of truth for layout, colors, fonts, spacing and behavior. When this file and the reference disagree, follow the reference and tell me.

The `ui-ux-reference/` folder is **read-only reference material**. Never edit it, never import from it, and never ship it as part of the app. Read it, then rebuild the design in the real source files.

## 0. Ground rules (read first)

1. **Presentation only.** Do not change backend logic, API routes, auth, database schema, or business rules. Keep every existing route, form field and handler working.
2. **Detect the stack first.** Read `package.json`, the folder structure and the existing styles, then say which framework and styling approach you found. Rebuild the reference in that stack. Do not paste the reference HTML in as-is, and do not add a new framework.
3. **Work in small steps.** Order: design tokens, app shell, shared components, then pages one at a time. After each step the app must still run. Commit after each step if I use git.
4. **Never invent data.** The reference uses sample numbers. Wire every number, name and list to the real data the site already has.
5. **Ask before** renaming database fields, deleting a page, or changing what a button does on the server.
6. **Credits are now called Tokens in the UI.** Change every visible label. Do not rename database columns or API fields without asking me.

## 1. Look and feel: "chunky arcade cabinet"

Toy-like and tactile, not glowing neon. The signs are thick dark outlines, hard offset shadows (no blur), buttons that press down, and bright primary colors on deep indigo.

### Design tokens
Create these as CSS variables (or the stack's theme file) and use them everywhere. **No raw hex values inside components.**

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#14173A` | `#E8EBFF` |
| `--panel` | `#1E2358` | `#FFFFFF` |
| `--panel2` | `#2A3176` | `#F1F2FF` |
| `--line` (outlines + hard shadows) | `#070920` | `#1B1F4B` |
| `--ink` (text) | `#F6F3FF` | `#1B1F4B` |
| `--mute` (secondary text) | `#B4BAEF` | `#4A5190` |
| `--y` yellow (Arcade, XP bar, tokens) | `#FFC93C` | same |
| `--r` red (Prize Shop, alerts, flame) | `#FF5A5F` | same |
| `--g` mint (success, "can claim") | `#36D9A0` | same |
| `--s` sky (you, highlight) | `#5CC8FF` | same |
| `--v` violet (EXP, rank badges) | `#B39CFF` | same |
| `--on` (text on any colored fill) | `#14173A` | same |

- Follow `prefers-color-scheme` for light and dark. Text on colored fills always uses `--on`.
- **Known issue to fix:** in light mode, yellow and violet *text* on white is too faint. Add darker text variants for light mode (for example yellow text `#8A5F00`) so contrast stays at least 4.5:1. Fills can stay bright.

### Typography
- **Headings, big numbers, buttons:** `Lilita One`, weight 400.
- **Body:** `Nunito`, weights 600 and 800.
- Load both from Google Fonts with fallbacks (`Impact, sans-serif` and `system-ui, sans-serif`).
- Scale: h1 `clamp(30px, 4vw, 46px)`, h2 26px, h3 20px, body 16px, minimum text size 13px.
- Sentence case everywhere. **No ALL-CAPS labels, no letter-spaced eyebrow labels, no monospace stat numbers.**

### Shape rules
- Outlines are always `3px solid var(--line)`.
- Cards: radius 20px, shadow `0 6px 0 var(--line)`. Buttons: radius 12px, shadow `0 4px 0 var(--line)`. Chips and badges: pill shape.
- **Press effect:** on `:active`, `transform: translateY(3px)` and the shadow shrinks to `0 1px 0`. Use 0.08s transitions.
- Icons: **inline SVG only** (24px viewBox, 2.2 stroke, round caps, `currentColor`). **No emoji anywhere.** Needed icons: home, joystick, gift, trophy, coin, bolt, lock, flame, crown, gamepad, clock.

## 2. App shell (important)

- **Left sidebar is `position: fixed`, 248px wide, full height. It never scrolls with the page.** The content area has `margin-left: 248px`.
- Sidebar order: logo, Home, **Arcade Zone** (big yellow button), **Prize Shop** (big red button), Rankings, spacer, Staff portal link (only for staff accounts).
- Arcade Zone and Prize Shop are large pressable buttons with a small badge above the corner ("Play now", and "N to claim" that shows how many prizes the player can claim right now). The active page gets a ring outline. This is how players find them quickly, so keep them visually loudest.
- **Top bar** is sticky, with a 3px bottom outline. It shows only the **token balance chip** and the username. **No credits chip and no EXP chip.**
- Content is centered with `max-width: 1180px` and 32px padding.
- **Mobile (max 760px):** the sidebar becomes a fixed bottom bar with icons only (Home, Arcade, Shop, Rankings). Hide the logo, labels and badges. Content gets `margin-bottom: 84px`. Respect `env(safe-area-inset-*)`.

## 3. Pages

### Home
1. **Welcome panel** (one card, three parts): player avatar tile, then "Welcome back, {username}" (the whole name in one color, no accent word) with a segmented XP bar, then the **streak box on the right**.
   - XP bar is segmented (stripes), shows progress inside the current rank only (for example 251 / 1,000 toward Elite), with the rank names at each end.
   - Streak box: flame icon, big day count, "day streak", a Mon to Sun row (done days filled yellow, next day dashed outline), and one line such as "Check in Thursday to reach 4." Below ~700px it drops under the welcome text.
2. **Insert Coin panel** (see section 4).
3. **Two big tiles:** Arcade Zone (yellow) and Prize Shop (red), each with a status badge, a short line, a large faded icon in the corner, and a button-like label. The Shop badge must use the real count of claimable prizes.
- There is **no "latest sessions" list and no stat grid** on Home. Do not add them back.

### Arcade Zone
Grid of game cards: colored screen area with a big icon, game name, reward line (for example "+15 tokens · +20 EXP"), and a "Start game" button. Use the site's real games and rewards.

### Prize Shop
- **Wallet banner** (yellow): token balance and a progress bar toward the next locked prize ("Next unlock: X · N tokens to go").
- **Two shelves:** "Ready to claim" (mint outline, "Claim prize" button) and "Almost yours" (locked: lock icon, grayed icon tile, a progress bar, and "N more tokens to unlock"). Each shelf has a count tag. Hide a shelf if it is empty. Everything is sorted by price.
- Prize card: icon tile, name, price with token icon.
- Claiming shows a toast ("Claimed: {prize}. Show this at the counter.") and then re-sorts the shelves. Use the site's real redemption flow for the actual claim.

### Rankings (Champions board)
- Header with title and a live **round-end countdown** (days, hours, minutes, seconds).
- **Motivation banner** (red): "You're #{rank}. Beat {name} to reach the podium." plus "Earn {n} more EXP and you take {place}." and a progress bar. If the player is #1, switch to a "defend your spot" message with the gap to #2.
- **Two columns. Top 3 on the LEFT** (1st place large and gold with a crown, 2nd and 3rd side by side below). **The player list is on the RIGHT:** the player's own row is first, highlighted in sky blue, slightly enlarged, with the gap to the next place. Other rows show the rank, name, rank badge, EXP, and "You lead by N" where it applies.
- Below ~900px the columns stack (podium first).

### Pages not in the reference (My Profile and Debts, all Admin pages)
Apply the same tokens, shell, card, button, chip and badge styles. Keep their existing content and layout logic. Specific fixes:
- **Admin overview bug:** the link text shows the raw string `$\RIGHTARROW$`. Replace it with real text or an icon (for example "Review sessions").
- Admin uses the same fixed sidebar. Use red for debt and alert states and mint for cleared states. Status pills use the shared badge style.
- Tables: horizontal scroll inside their own container on small screens.

## 4. Insert Coin panel (needs care)

UI: left side has the title "Insert Coin", a slot graphic, a labeled number input "Pesos to insert", and quick buttons (₱20, ₱50, ₱100, ₱200). The right side shows "You'll get N tokens", the rate line (reference uses ₱1 = 1 token), a validation message, the **Insert coin** button (disabled until the amount is valid), and the token balance. On success, play a short coin-drop animation and show the toast "Coin accepted! +N tokens".

**Do not copy the reference's behavior.** The reference changes the balance instantly in the browser. In the real site:
- Make the conversion rate a **config value**, not a hard-coded number.
- Use the existing payment / session approval flow: the click should create the request the way the site already does, and the tokens appear after staff approval. Show a "pending" state in the UI.
- Never update the balance on the client without the server confirming it.

## 5. Behavior and quality bar

- Keyboard: every control reachable, visible focus ring (`3px solid var(--y)`, offset 3px). Never remove focus outlines.
- Touch targets at least 44px high.
- Every input has a visible label (placeholders are not labels). Errors appear next to the field.
- Use `role="progressbar"` with `aria-valuenow` on progress bars. Toasts use `aria-live="polite"`.
- Respect `prefers-reduced-motion` (turn off the coin drop, bar growth and hover lifts).
- Motion is only for responses to the player's action (press, claim, coin drop, bar fill). **No scroll-reveal or fade-in on every card.**
- Use `#hash` or the site's existing router for page switching. Keep deep links working.
- Plain, friendly copy: active verbs, same name for the same action everywhere ("Claim prize" gives "Claimed: ..."), errors say what to do next.

## 6. Avoid these (the old design's problems)

Neon cyan and purple glow on near-black; identical rounded cards for everything; emoji icons; small tracked ALL-CAPS labels; one word of a headline recolored; monospace stat numbers; a row of four identical big-number stat boxes; unclear names like "Spendable Loot" or "View Celebration"; an admin link inside the player menu; raw template strings showing in the UI.

## 7. Finish checklist

- [ ] Tokens defined once; no raw hex in components; light and dark both work
- [ ] Fixed sidebar does not scroll with the page; top bar sticky
- [ ] No "credits" text, no credits or EXP chips in the top bar
- [ ] Arcade Zone and Prize Shop are the loudest items in the sidebar and on Home
- [ ] Shop has "Ready to claim" and "Almost yours" shelves with progress bars
- [ ] Rankings: top 3 on the left, list on the right, banner and countdown work
- [ ] Insert Coin uses the real approval flow and a config rate
- [ ] Checked at 1440px, 900px and 390px widths; no horizontal page scroll
- [ ] Contrast at least 4.5:1 in both themes; focus rings visible; reduced motion respected
- [ ] No emoji, no console errors, existing features still work

When done, give me a short list of files changed and anything you were unsure about.
