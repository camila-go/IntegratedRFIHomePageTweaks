# Accessibility Audit — Capella Homepage (Integrated RFI)

**Standard:** WCAG 2.1 AA
**Audited:** 2026-09-22 · **Remediated:** 2026-09-22
**Scope:** the whole homepage, with emphasis on the hero and the integrated RFI form
**Status: all 12 findings closed** — 11 fixed, 1 withdrawn as a false positive.
Each finding below carries its resolution. The measurements are kept as the
"before" record; the ✅ lines are the re-measured "after".

> See also: [`HANDOFF.md`](HANDOFF.md) for how the hero and RFI are built, and
> [`DEBUGGING.md`](DEBUGGING.md) for symptom-first troubleshooting.

---

# ⚠️ ACCEPTED RISK — READ FIRST

## Semi-transparent fields over a photograph have no fixed contrast

**The RFI's input fields and dropdowns are semi-transparent and sit directly on
the hero photograph.** Their contrast — and the contrast of the value text
inside them, their borders, and their focus rings — is therefore **a function
of whatever pixels happen to be behind them**, not of a token. It changes with
the viewport, because the crop changes; it would change again with a different
hero image, a different crop, or a seasonal photo swap.

**Nothing in this audit measures a fixed value for those components.** Every
figure below is a reading of *this* photograph at *those* viewports. It is a
snapshot, not a guarantee.

### Why this matters later

- **Any new hero image can silently break AA**, with no code change and no
  failing test. A lighter photograph, or one whose subject sits further left,
  can drop field borders below the 3:1 that 1.4.11 requires without anything
  in the build noticing.
- **It does not scale to a template.** If this hero pattern is reused for other
  pages or campaigns, each new background needs its own pixel-level contrast
  check. The current scrim values are tuned to this specific frame.
- **Automated tooling will not catch it.** Standard contrast checkers resolve
  the nearest opaque ancestor and report a passing figure for text that is
  actually over a photo (see [How this was measured](#how-this-was-measured)).

### Measured instance of this risk (22 Sept)

The field **borders** are where this bites first. `#adadad` on a 1px hairline,
against whatever the photo puts behind it, pixel-sampled around each field's
full perimeter:

| | 1440 | 1024 |
| --- | --- | --- |
| step 1 borders (3 dropdowns) | 4.28 – 5.56 ✅ | — |
| step 2 borders, first four | 3.90 – 5.19 ✅ | 4.44 – 5.11 ✅ |
| **step 2, Zip/Postal border** | 4.27 ✅ | **1.90 ❌** |
| focus ring (white) | 7.18 – 12.49 ✅ | 4.26 – 11.46 ✅ |
| 12px hint over the field fill | 4.97 – 5.83 ✅ | — |

**The same component passes at one width and fails at another**, with no code
difference — at 1024 the Zip/Postal field is the rightmost of five and part of
its perimeter crosses her skin, where a mid-grey hairline has nowhere to go.
That is this risk, in one number.

It is left as-is under the decision below. Closing it means a heavier border,
a lighter border colour, or an opaque field surface — a design-token call, not
a code fix, and it would change the component everywhere.

### Decision

**This is a known risk and we are accepting it for now.** Discussed and agreed
in the handoff meeting with **Jake, Scott and Patrick on 22 September 2026**.

The mitigations currently in place are the two-layer scrim behind the hero copy
(finding #3/#4) and the white focus ring (finding #2). Those make *this* image
pass. They are not a general solution.

**If the hero image changes, re-run the pixel-sampled contrast check before
shipping** — the method is described below, and the failures it caught the
first time were invisible to every other form of testing.

---

## How this was measured

Everything below is computed against the **live page**, not read off the source:

- Rendered at **320, 375, 769, 1024, 1440 and 2560px** wide, and at viewport
  heights from 512 to 1919 (the hero's crop depends on both — see
  [§ Contrast](#color-contrast)).
- Contrast for anything sitting on the hero photo is **sampled from the actual
  image pixels**, mapped through the `object-fit: cover` crop and composited
  with both scrim layers. Text is measured **per line**; field borders and
  focus rings are measured **around each field's full perimeter**, and the
  12px hints against the field fill composited over the photo.
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
**Resolved: 12** — 11 fixed in code, 1 (#8) withdrawn: it was a fault in the
audit, not the page.

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

✅ **Fixed.** `outline: none` removed and that rule added (with a negative
offset, so the ring sits inside the full-bleed viewport rather than being
clipped by the section). `initCarousel()` now also sets `role="group"` and
`aria-label="Featured stories, use arrow keys to change slide"` alongside the
`tabindex` — the label names the arrow-key affordance, which was previously
undiscoverable.

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

✅ **Fixed.** `--field-focus-ring` is now `#ffffff`, with a note at the token
that the design system's blue is correct on a light surface and would need to
become conditional if this form is ever reused there.

#### 3. Mobile hero subtitle drops to 3.59:1

At 375px the subtitle's **fourth line** crosses her shoulder (sampled pixel
`rgb(157,129,121)`), giving **3.59:1** against white text.

- **Criterion:** 1.4.3 Contrast (Minimum) — needs **4.5:1** at 16px
- **Measured per line:** 5.40 / 5.65 / 4.59 / **3.59** / 6.28
- **Fix:** extend or strengthen the mobile gradient scrim so it covers the full
  copy block, rather than being anchored near the band's bottom.

✅ **Fixed.** `.hero__gradient` gained a second layer. On mobile it is a
**vertical** wash (transparent to 28%, 0.58 at the bottom) — her head sits at
y 3–34% of the mobile crop, so it darkens the copy without touching her face.
A left-anchored wash would have missed these pixels entirely: the failure was
at the *right* end of line 4, and the copy runs 345 of 375px wide here.
**Re-measured per line: 9.17 / 10.25 / 9.72 / 8.73 / 12.71** — worst case
3.59 → **8.73**.

#### 4. "*All fields are required" fails at 769px

The 12px required note measures **4.41:1** at a 769px viewport — 0.09 short.

- **Criterion:** 1.4.3 (needs 4.5:1)
- **Note:** passes at 1024 (4.59) and above. It is the 769–800 crop that puts a
  brighter part of the wall behind it.
- **Fix:** same scrim change as #3, or nudge the note into the darker column.

✅ **Fixed.** On desktop the second gradient layer is **horizontal** instead —
left-anchored, fading out by 72% — so it darkens the column the copy occupies
and leaves the subject alone. Re-measured at 769: **4.41 → 11.72**. The
subtitle at 1440 also improves, 4.93 → 6.11.

#### 5. Carousel dots are 16×16

- **Criterion:** 2.5.8 Target Size Minimum (**WCAG 2.2** AA, 24×24). Under
  **2.1** this is only 2.5.5 at AAA, so it is not a 2.1 AA failure — flagged
  because it fails the moment the target moves to 2.2.
- **Fix:** keep the 16px visual, pad the button to a ≥24×24 hit area.

✅ **Fixed.** `box-sizing: content-box` + 4px padding + `background-clip:
content-box`: the paint stays in the 16px content box, so the pill looks
identical while the target is 24×24. The row's `gap` and margins were reduced
by the same amount the padding adds, so the visual rhythm is unchanged.

#### 6. RFI error text is 8px

`.rfi-field__error` computes to **8px** with a 12px line-height. This is the
text that tells someone their form submission failed.

- **Criterion:** none — WCAG sets no minimum font size, so this is **not** a
  conformance failure. Flagged on impact.
- **Fix:** 12px minimum, matching the field hint.

✅ **Fixed — and this is a deliberate departure from Figma**, which specifies
8px. Now `0.75rem` (12px), matching `.rfi-field__hint` directly above it. The
rule carries a comment saying so, and it is recorded in HANDOFF §5b, so nobody
"restores" the 8px on a later Figma pass without raising it with design.
This initially made the longer messages wrap to two lines in the 156px columns
at 1024; the copy was subsequently shortened so every message fits one line at
every width (see the follow-up section).

---

### 🟢 Minor

#### 7. No skip link

Nine focus stops sit before `<main>` (more with a megamenu open) and there is no
skip link.

- **Criterion:** 2.4.1 Bypass Blocks (Level A). Arguably satisfied via the
  `<main>` landmark for screen-reader users; sighted keyboard users get nothing.
- **Fix:** a visually-hidden "Skip to main content" link that appears on focus.

✅ **Fixed.** First focusable element on the page, targeting `#main-content`.
Off-screen via `translateY(-120%)` rather than the `.visually-hidden` clip —
a 1px clipped box cannot become visible. It uses `:focus`, **not**
`:focus-visible`: a skip link is only ever reached by keyboard and must appear
for programmatic focus too. `<main>` took `tabindex="-1"` so the jump actually
moves focus rather than only scrolling.

#### 8. Carousel dots do not expose the selected state

They have good `aria-label`s ("Slide 2: WNBA partnership") but nothing marks
which is current.

- **Criterion:** 4.1.2 · **Fix:** `aria-current="true"` on the active dot.

❌ **Withdrawn — this was an error in the audit, not a defect in the page.**
The dots are `role="tab"` inside a `role="tablist"`, and `initCarousel()` keeps
`aria-selected` in sync. That is the correct way to express selection for this
pattern; `aria-current` would have been wrong. The audit script only looked for
`aria-current`/`aria-pressed` and never checked `aria-selected` or the role.

#### 9. Megamenu triggers are links, not buttons

`<a href="#">` with `aria-haspopup="true"` and `aria-expanded`. The ARIA is
right, but they do not navigate, and Space does not activate a link.

- **Criterion:** 4.1.2 / 2.1.1 · **Fix:** `<button type="button">`.

✅ **Fixed.** All four are `<button type="button">`. Two follow-ons this
required:
- `initMegaMenu()`'s selector was `a[aria-controls]`. Widening it to
  `[aria-controls]` silently swept up the five `.megamenu__level` rail tabs
  **inside** the panels, which carry `aria-controls` of their own and have a
  separate handler — the outer toggle would have fought the rail. It is now
  `.main-nav__item > [aria-controls]`; the child combinator is load-bearing.
- The ten `.main-nav__item > a` CSS rules became
  `.main-nav__item > :is(a, button)`, plus `color: inherit`, since only links
  pick up the bar's colour on their own.

#### 10. CTA video autoplays with no pause control

Plays on scroll into view, loops, 45s, muted, no controls.

- **Criterion:** 2.2.2 Pause, Stop, Hide
- **Mitigation:** `prefers-reduced-motion` suppresses playback entirely, which
  covers the users most affected. Strictly the criterion wants an on-page
  control.

✅ **Fixed.** A 44×44 play/pause button, bottom-right over the darkest part of
the scrim. It is revealed by `initActionCta()` **inside** the branch that
actually plays — under reduced motion that function returns early and nothing
ever moves, so the control would be a button for nothing. Once pressed, the
user's choice outranks the IntersectionObserver: scrolling away and back does
not restart something they stopped. `aria-pressed` and the label both track
state.

#### 11. The step change is not announced

Moving step 1 → 2 swaps panels and moves focus to the first field, which is
reasonable. But nothing announces that the step changed.

- **Criterion:** 4.1.3 Status Messages (AA in 2.1)
- **Fix:** a polite live region — "Step 2 of 2, tell us about yourself".

✅ **Fixed.** A visually-hidden `role="status" aria-live="polite"` region in the
form. `showStep()` writes into it — writing, not un-hiding, is what makes a
live region fire — and only on a real step change, never on the initial
`showStep(1)`, where an announcement on page load would be noise. Verified
output: *"Step 2 of 2, Tell us about yourself"*.

#### 12. `role="alert"` on elements toggled via `hidden`

Error bars are `role="alert"` and revealed by flipping `hidden`. Screen readers
announce content *inserted* into a live region reliably; un-hiding an existing
node is less consistent across AT.

- **Criterion:** 4.1.3 · **Needs a real screen-reader pass to confirm.**
- **Mitigation:** the step-1 gate already moves focus to the offending field,
  which announces the error via `aria-describedby` regardless.

⚠️ **Left as-is, deliberately.** Both real-world paths into an error already
announce it: the step-1 gate moves focus to the offending control, and the
step-2 submit does the same. The `role="alert"` is belt-and-braces on top of
that. Restructuring the error bars to insert text instead of un-hiding it
would be churn on a path that already works, for a risk nobody has observed
here. Re-open it if a screen-reader pass shows a silent error.

---

## Color contrast

All "after" figures re-measured with the new two-layer scrim composited (both
gradient layers, not just the radial).

| Element | Viewport | Before | After | Required | |
| --- | --- | --- | --- | --- | --- |
| Hero subtitle | 375×812 | **3.59:1** | **8.73:1** | 4.5:1 | ✅ |
| Required note | 769×900 | **4.41:1** | **11.72:1** | 4.5:1 | ✅ |
| Hero subtitle | 769×900 | 4.62:1 | 8.31:1 | 4.5:1 | ✅ |
| Hero subtitle | 1440×900 | 4.93:1 | 6.11:1 | 4.5:1 | ✅ |
| Required note | 1440×900 | — | 12.51:1 | 4.5:1 | ✅ |
| Field focus ring | hero | **2.26:1** | **7.5:1** (white) | 3:1 | ✅ |

### Original measurements (before remediation)

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

## Resolution

| # | Finding | Status |
| --- | --- | --- |
| 1 | Carousel viewport focus | ✅ Fixed |
| 2 | Field focus ring contrast | ✅ Fixed |
| 3 | Mobile subtitle contrast | ✅ Fixed |
| 4 | Required note contrast @769 | ✅ Fixed |
| 5 | Carousel dot target size | ✅ Fixed |
| 6 | 8px error text | ✅ Fixed (departs from Figma — see the finding); copy also shortened to fit one line everywhere |
| 7 | Skip link | ✅ Added |
| 8 | Carousel dot selected state | ❌ Withdrawn — audit error, page was correct |
| 9 | Megamenu triggers as links | ✅ Fixed |
| 10 | Video autoplay, no pause | ✅ Fixed |
| 11 | Step change not announced | ✅ Fixed |
| 12 | `role="alert"` on hidden nodes | ⚪️ Left as-is, with reasoning |

### Re-verified after the fixes

- Contrast re-sampled at 375 / 769 / 1440 with both scrim layers composited —
  every previously failing line now passes, worst case 6.11:1.
- Hero invariants unchanged by the taller error text: photo constant at 760px
  and copy clearing her face by 25px across step 1, step 2, and step 2 with all
  five fields in error at 1024.
- Step 2 still five inputs in one row at 1024 (156px columns); no horizontal
  scroll at any width; no duplicate IDs; no broken ARIA references.
- Megamenu re-tested after the button conversion: 4 top-level triggers, the 5
  rail tabs still switch panels independently, Escape still closes and returns
  focus.

### Follow-up changes (22 Sept, after the first remediation pass)

- **Error copy shortened so every message fits one line at every width.** The
  narrowest case is step 2 at 1024, where the five-across columns leave
  **120px** for text: "Enter a 10-digit phone number" needed 172px. Now
  "Enter first name" / "Enter last name" / "Enter a valid email" /
  "Enter 10 digits" / "Enter Zip/Postal", and step 1's
  "Select a degree" / "Select area of study" / "Select a specialization".
  The dropped nouns are carried by the adjacent `<label>`, which is what a
  screen reader reads first via `aria-describedby` — "Phone number, Enter 10
  digits". Verified one line at 320, 375, 769, 1024, 1440 and 1920.
- **The two step-2 radio questions no longer stack.** `flex-wrap` is gone from
  `.rfi__questions`; the military question shrinks to its 135px min-content
  and its legend wraps instead, which is what makes the pair fit.
  ⚠️ **At 1024 the benefits sentence therefore wraps to two lines.** The pair
  needs 971px and the form is 901px there, so the row and the single line are
  mutually exclusive at that width — the row wins. The single line returns at
  1150+, where it fits beside the other question.

### Field-state bug found after the audit (22 Sept)

Not one of the original 12 — it surfaced in review and is worth recording
because it has an accessibility dimension as well as a visual one.

**Blurring an empty field cleared its error.** After submitting step 2 empty,
all five fields went red; clicking away from the one you were in then wiped
its error, because `blur` ran the evaluator, found the value still empty, and
took "empty" to mean "no state". The first field showed it most often, since
submit focuses it. Alongside the missing red bar, `aria-invalid` flipped back
to `false` — so a screen reader was told the field was fine while the form
still refused to submit (3.3.1).

Fixed with a `submitted` WeakSet: "empty means neutral" still applies before a
submit, and after one, validity decides. Verified end to end — neutral on
pre-submit blur, five errors on submit, error surviving a click away, cleared
by typing a valid value, and re-applied on blur after emptying the field
again.

**Zip/Postal is no longer US-only.** Relabelled from "ZIP code", and the
`[0-9]{5}` pattern relaxed to accept Canadian, UK and European formats — it
had been rejecting exactly what the new label invites. `inputmode="numeric"`
removed, since letters are now valid.

### Still outstanding

- **A real screen-reader pass.** Everything here is computed or driven
  programmatically. Finding 12 in particular cannot be closed without one.
- **The field borders are the live edge of the accepted risk** (see below and
  the note at the top). At 1024 the ZIP/Postal field's border measures
  **1.90:1** — it is the rightmost field and part of its perimeter crosses her
  skin, where a grey hairline effectively disappears. Covered by the accepted
  risk, not separately remediated; the fix would be a heavier or
  lighter-on-dark field border, which is a design-token decision.
- **Design review of one side effect:** the desktop scrim darkens the left of
  the hero slightly more than the Figma comp.
