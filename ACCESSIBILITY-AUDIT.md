# Accessibility Audit — Capella Homepage (Integrated RFI)

**Standard:** WCAG 2.1 AA
**Date:** 2026-09-22
**Scope:** the whole homepage, with emphasis on the hero and the integrated RFI form
**Commit audited:** the `hero-copy-clearance` branch (hero hug + pinned photo + clickable stepper)

> See also: [`HANDOFF.md`](HANDOFF.md) for how the hero and RFI are built, and
> [`DEBUGGING.md`](DEBUGGING.md) for symptom-first troubleshooting.

---

## How this was measured

Everything below is computed against the **live page**, not read off the source:

- Rendered at **320, 375, 769, 1024, 1440 and 2560px** wide, and at viewport
  heights from 512 to 1919 (the hero's crop depends on both — see
  [§ Contrast](#color-contrast)).
- Contrast for anything sitting on the hero photo is **sampled from the actual
  image pixels**, mapped through the `object-fit: cover` crop and composited
  with the radial scrim, then measured per line of text.
- Focus behaviour read from the CSSOM (which selectors define
  `:focus-visible`, which set `outline: none`) and cross-referenced against
  every focusable element on the page.
- Keyboard behaviour driven with real key events.

⚠️ **An off-the-shelf contrast checker will report every hero text element as
passing at 21:1.** It walks up the DOM for a background colour, finds a black
ancestor, and never sees the photograph. That is wrong, and it is how the two
real contrast failures below went unnoticed. Any future check of this page has
to sample pixels.

⚠️ **Not a substitute for assistive-technology testing.** Nothing here was run
through VoiceOver or NVDA. Finding 12 in particular (live-region announcement)
can only really be settled with a screen reader.

---

## Summary

**Issues found: 12** — 🔴 1 critical · 🟡 5 major · 🟢 6 minor

### What is already correct

Worth stating, because it is most of the page:

| Check | Result |
| --- | --- |
| Alt text | 34 images, all with `alt`; decorative ones correctly `alt=""` **and** `aria-hidden` |
| Accessible names | 44 interactive controls, **zero** unnamed; zero nameless links |
| Form labels | Every input/select has a real `<label for>`; every radio group is a `<fieldset>` with a `<legend>` |
| Error association | Every field has `aria-describedby` → an existing error element; all 8 resolve |
| Heading structure | One `<h1>`, 28 headings, **no** level jumps |
| Landmarks | `header`, `nav` ×2, `main`, `footer` all present |
| Duplicate IDs | None |
| `lang` | `en` |
| Reflow @320px | **No** horizontal scroll, no content loss |
| Reduced motion | Honoured in 11 CSS blocks and 10 JS guards, including suppressing the CTA video entirely |
| Megamenu keyboard | Enter opens, Escape closes **and returns focus to the trigger** |

---

## Findings

### 🔴 Critical

#### 1. The carousel viewport is focusable with no visible focus indicator

`.carousel__viewport` carries `tabindex="0"` **and** `outline: none`, with no
`role` and no accessible name. A keyboard user tabs into it and receives no
indication whatsoever of where they are.

- **Criterion:** 2.4.7 Focus Visible (AA); also 4.1.2 Name, Role, Value
- **Where:** `css/styles.css` — `.carousel__viewport { … outline: none }`
- **Fix:** drop `outline: none`, or give it a `:focus-visible` style using the
  existing `--nav-focus-ring` token. Add `role="region"` and
  `aria-label="Featured stories"` so it announces as something.

```css
.carousel__viewport:focus-visible {
  outline: var(--nav-focus-ring);
  outline-offset: var(--nav-focus-offset);
}
```

---

### 🟡 Major

#### 2. The RFI field focus ring fails non-text contrast over the photo

`--field-focus-ring: #0f7bd9` measures **2.26:1** against the hero's wall red
(`#811f1d`). The RFI fields sit directly on the photograph, so this is the
adjacent colour that matters.

- **Criterion:** 1.4.11 Non-text Contrast (needs **3:1**)
- **Impact:** every keyboard user filling in the form — the page's conversion path
- **Fix:** use white, which the rest of the page already uses for focus
  (`--nav-focus-ring: 2px solid #ffffff`). White against that red is 7.5:1.

#### 3. Mobile hero subtitle drops to 3.59:1

At 375px the subtitle's **fourth line** crosses her shoulder (sampled pixel
`rgb(157,129,121)`), giving **3.59:1** against white text.

- **Criterion:** 1.4.3 Contrast (Minimum) — needs **4.5:1** at 16px
- **Measured per line:** 5.40 / 5.65 / 4.59 / **3.59** / 6.28
- **Fix:** extend or strengthen the mobile gradient scrim so it covers the full
  copy block, rather than being anchored near the band's bottom.

#### 4. "*All fields are required" fails at 769px

The 12px required note measures **4.41:1** at a 769px viewport — 0.09 short.

- **Criterion:** 1.4.3 (needs 4.5:1)
- **Note:** passes at 1024 (4.59) and above. It is the 769–800 crop that puts a
  brighter part of the wall behind it.
- **Fix:** same scrim change as #3, or nudge the note into the darker column.

#### 5. Carousel dots are 16×16

- **Criterion:** 2.5.8 Target Size Minimum (**WCAG 2.2** AA, 24×24). Under
  **2.1** this is only 2.5.5 at AAA, so it is not a 2.1 AA failure — flagged
  because it fails the moment the target moves to 2.2.
- **Fix:** keep the 16px visual, pad the button to a ≥24×24 hit area.

#### 6. RFI error text is 8px

`.rfi-field__error` computes to **8px** with a 12px line-height. This is the
text that tells someone their form submission failed.

- **Criterion:** none — WCAG sets no minimum font size, so this is **not** a
  conformance failure. Flagged on impact.
- **Fix:** 12px minimum, matching the field hint.

---

### 🟢 Minor

#### 7. No skip link

Nine focus stops sit before `<main>` (more with a megamenu open) and there is no
skip link.

- **Criterion:** 2.4.1 Bypass Blocks (Level A). Arguably satisfied via the
  `<main>` landmark for screen-reader users; sighted keyboard users get nothing.
- **Fix:** a visually-hidden "Skip to main content" link that appears on focus.

#### 8. Carousel dots do not expose the selected state

They have good `aria-label`s ("Slide 2: WNBA partnership") but nothing marks
which is current.

- **Criterion:** 4.1.2 · **Fix:** `aria-current="true"` on the active dot.

#### 9. Megamenu triggers are links, not buttons

`<a href="#">` with `aria-haspopup="true"` and `aria-expanded`. The ARIA is
right, but they do not navigate, and Space does not activate a link.

- **Criterion:** 4.1.2 / 2.1.1 · **Fix:** `<button type="button">`.

#### 10. CTA video autoplays with no pause control

Plays on scroll into view, loops, 45s, muted, no controls.

- **Criterion:** 2.2.2 Pause, Stop, Hide
- **Mitigation:** `prefers-reduced-motion` suppresses playback entirely, which
  covers the users most affected. Strictly the criterion wants an on-page
  control.

#### 11. The step change is not announced

Moving step 1 → 2 swaps panels and moves focus to the first field, which is
reasonable. But nothing announces that the step changed.

- **Criterion:** 4.1.3 Status Messages (AA in 2.1)
- **Fix:** a polite live region — "Step 2 of 2, tell us about yourself".

#### 12. `role="alert"` on elements toggled via `hidden`

Error bars are `role="alert"` and revealed by flipping `hidden`. Screen readers
announce content *inserted* into a live region reliably; un-hiding an existing
node is less consistent across AT.

- **Criterion:** 4.1.3 · **Needs a real screen-reader pass to confirm.**
- **Mitigation:** the step-1 gate already moves focus to the offending field,
  which announces the error via `aria-describedby` regardless.

---

## Color contrast

Sampled from rendered pixels. "Worst" is the lowest ratio found anywhere within
the text's own line boxes.

| Element | Viewport | Worst | Required | Pass |
| --- | --- | --- | --- | --- |
| Hero headline | 1440×900 | 4.38:1 | 3:1 (large) | ✅ |
| Hero headline | 1024×900 | 4.53:1 | 3:1 | ✅ |
| Hero headline | 769×900 | 4.41:1 | 3:1 | ✅ |
| Hero headline | 375×812 | 5.18:1 | 3:1 | ✅ |
| Hero subtitle | 1440×900 | 4.93:1 | 4.5:1 | ✅ |
| Hero subtitle | 1024×900 | 4.86:1 | 4.5:1 | ✅ |
| Hero subtitle | 769×900 | 4.62:1 | 4.5:1 | ✅ |
| **Hero subtitle** | **375×812** | **3.59:1** | 4.5:1 | ❌ |
| RFI title | 1440×900 | 5.46:1 | 3:1 (large) | ✅ |
| RFI prompt title | 1440×900 | 6.10:1 | 3:1 (large) | ✅ |
| Required note (12px) | 1024×900 | 4.59:1 | 4.5:1 | ✅ |
| **Required note (12px)** | **769×900** | **4.41:1** | 4.5:1 | ❌ |
| Stepper — current | 1440×900 | 5.27:1 | 4.5:1 | ✅ |
| Stepper — inactive | 1440×900 | 7.58:1 | 4.5:1 | ✅ |
| Utility bar link | any | 10.37:1 | 4.5:1 | ✅ |
| Nav link | any | 15.81:1 | 4.5:1 | ✅ |
| Field hint (12px) | any | 9.36:1 | 4.5:1 | ✅ |
| Field error text | any | 8.50:1 | 4.5:1 | ✅ |
| Chip | any | 8.19:1 | 3:1 (large) | ✅ |
| **Field focus ring** | hero | **2.26:1** | 3:1 (1.4.11) | ❌ |

The hero numbers move with the viewport because the photo is `cover` anchored
`right top` and pinned to a `100svh`-derived height cap — so both the width
**and the height** of the window change which pixels sit behind the copy.

---

## Keyboard navigation

| Element | Behaviour | Result |
| --- | --- | --- |
| Megamenu trigger | Enter opens (`aria-expanded` → `true`, panel unhidden); Escape closes and returns focus to the trigger | ✅ |
| Megamenu trigger | Space does not activate (it is a link) | 🟢 #9 |
| RFI stepper | Both steps in tab order, before the fields; Enter/Space activate; forward is gated identically to the action button | ✅ |
| RFI fields | Control sets `outline: none`, but `.rfi-field__box:focus-within` moves a visible ring to the shell | ✅ (contrast: #2) |
| RFI radios | Ring on `.rfi-radio__mark` via `:focus-visible` | ✅ |
| Carousel dots | Reachable and operable | ✅ (state: #8) |
| Carousel viewport | Focusable, **no indicator at all** | 🔴 #1 |
| Focus order | Follows visual order throughout | ✅ |

---

## Priority

1. **#1 Carousel focus indicator** — keyboard users disappear into an unmarked
   element. One CSS rule.
2. **#2 Field focus ring contrast** — affects everyone keyboard-navigating the
   RFI. Reuses a token that already exists.
3. **#3 Mobile subtitle scrim** — the worst real contrast on the page.
4. **#6 8px error text** — not a conformance failure, but it is the copy that
   tells someone their form is broken.

Items 7–12 are worth a single follow-up pass together; none of them blocks a
user outright.
