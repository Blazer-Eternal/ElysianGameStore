# Elysian Storefront — Design Contract

Read this before writing any UI. It is enforced in review. The goal is a
storefront that reads as *designed* — editorial commerce discipline — and never
as a generated template.

## Direction

**Editorial commerce.** Print-catalog thinking: a strong grid, confident type,
hairline rules doing the structural work, generous but *consistent* whitespace,
one restrained accent. Reference points: MoMA Design Store, SSENSE, a well-set
hardware catalogue. Not a SaaS landing page.

- **Theme:** dark-first (`html.dark` default), light theme fully supported.
  Both are first-class; every color token exists in both. WCAG AA minimum
  (4.5:1 body, 3:1 large text and UI borders).
- **Type:** Archivo Variable (wdth axis available: `.display-expanded` = 112%,
  `.condensed` = 88%) + IBM Plex Mono for figures, kickers, and metadata.
- **Palette:** warm near-black / warm paper, one accent (vermilion). All tokens
  are CSS variables in `globals.css`. Never hardcode hex in components.

## The banned list (non-negotiable)

| Banned | Instead |
| --- | --- |
| Purple/blue gradients, gradient hero text | Solid stock color, type, rules |
| Gradients of any kind in UI chrome | Flat color, hairlines |
| Emojis in headings or buttons | None. Use type or the icon set |
| Inter, Space Grotesk, Instrument Serif | Archivo + IBM Plex Mono only |
| Colored/neon border cards | Hairline `rule` dividers, `surface` blocks |
| Glassmorphism, blur, backdrop-filter | Opaque surfaces |
| Low-contrast dark mode | Token palette; AA verified |
| "3 icon boxes in a row" feature grids | Asymmetric editorial layouts, real content |
| Badge/pill above headlines ("New", "Beta") | Kicker line, set in mono caps, no container |
| Lucide / generic icon packs | `src/components/ui/icons.tsx` only (hand-drawn SVGs) |
| Untouched default components | Every primitive styled to this system |
| Fade-in on scroll, IntersectionObserver reveals | Content is present at load |
| Cursor beams, spotlight effects, parallax | None |
| Buttons fading on hover (opacity) | Color inversion, underline weight, or rule movement |
| Inconsistent spacing | Spacing tokens only (see below) |
| Em dashes ("—") in copy | Use periods, colons, or commas |
| Buzzword copy ("Supercharge", "seamless", "elevate") | Plain, specific, factual copy |
| Serif italic accents, mixed editorial-font gimmicks | Archivo only; mono for data |
| Grain/noise over gradients | None |

Also: no `backdrop-blur`, no `shadow-*` for depth (a 1px hairline or a solid
surface step instead), no `rounded-full` except where a control is genuinely a
circle (toggle knobs, radios), radius max `2px` anywhere.

## Spacing rhythm

Use the scale, not arbitrary values. Section padding is one of these, chosen
deliberately per breakpoint:

`4 / 8 / 16 / 24 / 40 / 64 / 104px` → Tailwind: `p-1 p-2 p-4 p-6 p-10 p-16 p-26`

Vertical rhythm between major blocks: `p-16` mobile → `p-26` desktop.
Container: `mx-auto w-full max-w-[84rem] px-4 sm:px-6 lg:px-10`.

## Type usage

- Display headlines: `text-display` + `display-expanded`, weight 600–700,
  tracking from the token (already negative). Max 2 lines.
- Section heads: `text-2xl`/`text-xl`, weight 600.
- Kickers: `.kicker` class (mono, 11px, 0.14em tracking, uppercase). Never in
  a pill or badge container. Often paired with a hairline rule.
- Body: `text-base`/`text-sm`. Muted text uses `text-fg-muted` (AA-checked).
- **Prices and all numerals:** `.figure` class (IBM Plex Mono, tabular).
  Format through `paisaToNpr()` from `@/lib/money` — never render raw paisa.

## Component rules

- **Buttons** (`ui/Button`): square, uppercase mono label at `text-xs` with
  tracking, height 44px (touch target). Primary = accent fill; secondary =
  hairline outline that inverts on hover; ghost = underline-weight change.
  Hover never uses opacity.
- **Inputs** (`ui/Input`): square, `surface` fill, hairline border, 44px.
  Labels above in `text-xs` mono caps. Errors in `danger` below the field.
- **Cards/tiles:** no borders-as-decoration. Game tiles: image block + type
  below, separated by grid hairlines (`divide-x`/`divide-y` with `border-line`).
  Image corners square or 2px max.
- **Tables** (order history): hairline rows, mono for numbers, right-aligned.
- **Icons:** only from `src/components/ui/icons.tsx`. If an icon doesn't exist
  there, draw it (24px grid, 1.5px stroke, `currentColor`, square caps) or use
  type instead. Never `lucide-react`.

## Copy rules

- Short, concrete, factual. "Pay with eSewa. Your library unlocks the moment
  the payment clears." — not "Seamlessly pay and unlock your gaming journey."
- No em dashes. No emoji. No exclamation marks in UI chrome.
- Prices in NPR with lakh grouping via `paisaToNpr()` (Rs 1,20,000).
- Nepali-market specifics are a feature: eSewa, Khalti, ConnectIPS, IME Pay,
  VAT shown as "VAT (13%)", age ratings, refund window stated plainly.

## Data / money rules

- All money is **integer paisa** from the API. Convert only at render time
  with `paisaToNpr()`. Never `Math` on money except `discountPercent()`.
- Never trust client-sent prices: the server quotes. The cart/checkout UI
  always renders the quote returned by `POST /orders/quote`.
- Format: `Rs 1,999` / `Rs 1,20,000` (en-IN grouping), paisa only when the
  amount isn't a whole rupee.

## Structure

```
src/
  app/            layout.tsx, error.tsx, not-found.tsx, globals.css
    (public)/     storefront pages (marketing, catalog, game, cart, checkout, orders)
    (auth)/       login, register (own minimal layout)
  components/
    ui/           primitives + icons (Button, Input, Badge-free Tag, etc.)
    layout/       SiteHeader, SiteFooter, containers
  constants/      nav items, sort options, provider labels
  features/       feature-specific composed blocks (catalog/, cart/, checkout/…)
  lib/            api, auth, theme, money
  types/          API types
```

Route groups `(public)` / `(auth)` change layout nesting, not URLs.

## Motion

Sparse and intentional. Allowed: color/underline/rule transitions ≤180ms,
the home ticker (pauses on hover, respects `prefers-reduced-motion`),
skeletons as flat surface blocks (no shimmer gradients). Nothing animates in
on scroll. Nothing follows the cursor.

## Checklist before you call a screen done

1. Tokens only — no raw hex, no arbitrary spacing outside the scale.
2. All numerals in `.figure`, money through `paisaToNpr()`.
3. Hover states change color/underline/rule, never opacity.
4. No banned item from the list above.
5. Copy has no em dashes, emoji, or buzzwords.
6. Both themes readable (check `html:not(.dark)` too).
7. Keyboard: visible focus ring (already global), logical tab order.
