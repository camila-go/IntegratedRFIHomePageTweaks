const SPECIALIZATIONS = {
  business: ['Accounting', 'Business Administration', 'Human Resource Management', 'Marketing'],
  counseling: ['Clinical Mental Health Counseling', 'School Counseling'],
  education: ['Curriculum and Instruction', 'Educational Leadership', 'Special Education'],
  'health-sciences': ['Health Administration', 'Public Health'],
  nursing: ['RN-to-BSN', 'MSN', 'Doctor of Nursing Practice'],
  psychology: ['Applied Behavior Analysis', 'Clinical Psychology', 'Industrial/Organizational Psychology'],
  technology: ['Information Assurance', 'Information Technology', 'Software Development'],
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initCarousel() {
  const track = document.querySelector('.carousel__track');
  const viewport = document.querySelector('.carousel__viewport');
  const slides = document.querySelectorAll('.carousel__slide');
  const dots = document.querySelectorAll('.carousel__dot');

  if (!track || !viewport || !slides.length || !dots.length) return;

  const lastIndex = slides.length - 1;
  let activeIndex = 0;
  let carouselSeen = false;

  // Mark a slide's card as revealed. The card itself slides in (scroll-driven,
  // see initCardScroll); its inner text does NOT animate, so there are no
  // per-element transitions to reset here any more.
  function revealSlide(slide) {
    if (!slide) return;
    const card = slide.querySelector('.carousel-reveal');
    if (card) card.classList.add('is-visible');
  }

  function getStep() {
    const slide = slides[0];
    if (!slide) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 24;
    return slide.offsetWidth + gap;
  }

  function setOffset(px, animate) {
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(${px}px)`;
  }

  function goTo(index, animate = true) {
    activeIndex = Math.max(0, Math.min(index, lastIndex));
    setOffset(-activeIndex * getStep(), animate);

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('carousel__slide--active', slideIndex === activeIndex);
    });

    dots.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === activeIndex;
      button.classList.toggle('carousel__dot--active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    // Re-animate the card text on real navigation (not the initial/resize
    // layout calls, which pass animate=false), once the carousel is in view.
    if (animate && carouselSeen) revealSlide(slides[activeIndex]);
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => goTo(index));
  });

  // --- Drag / swipe to scroll ---
  let dragging = false;
  let horizontal = null; // null = undecided, true/false once intent is known
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let baseOffset = 0;
  let delta = 0;
  let moved = false;

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true;
    horizontal = null;
    moved = false;
    delta = 0;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    baseOffset = -activeIndex * getStep();
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (horizontal === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      horizontal = Math.abs(dx) > Math.abs(dy);
      if (horizontal) {
        viewport.setPointerCapture(pointerId);
        track.classList.add('is-dragging');
      } else {
        dragging = false; // vertical intent -> let the page scroll
        return;
      }
    }

    delta = dx;
    if (Math.abs(dx) > 4) moved = true;

    const min = -lastIndex * getStep();
    let offset = baseOffset + dx;
    if (offset > 0) offset *= 0.35; // rubber-band past the first slide
    else if (offset < min) offset = min + (offset - min) * 0.35; // past the last
    setOffset(offset, false);
    event.preventDefault();
  }

  function endDrag(event) {
    if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) return;
    dragging = false;
    track.classList.remove('is-dragging');

    if (horizontal) {
      const threshold = Math.min(getStep() * 0.2, 80);
      if (delta <= -threshold) goTo(activeIndex + 1);
      else if (delta >= threshold) goTo(activeIndex - 1);
      else goTo(activeIndex);
    }
    pointerId = null;
  }

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  // Suppress the click that follows a real drag (so links/buttons don't fire).
  viewport.addEventListener(
    'click',
    (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    },
    true
  );

  // Native image drag-ghost gets in the way of pointer dragging.
  viewport.querySelectorAll('img').forEach((img) => {
    img.addEventListener('dragstart', (event) => event.preventDefault());
  });

  // Keyboard support. A focusable element needs a role and a name or it
  // announces as nothing; the surrounding <section> is labelled, but focus
  // lands here, not there. See `.carousel__viewport:focus-visible` for the
  // indicator this element is required to show.
  viewport.setAttribute('tabindex', '0');
  viewport.setAttribute('role', 'group');
  viewport.setAttribute('aria-label', 'Featured stories, use arrow keys to change slide');
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      goTo(activeIndex + 1);
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      goTo(activeIndex - 1);
      event.preventDefault();
    }
  });

  window.addEventListener('resize', () => goTo(activeIndex, false));

  goTo(0, false);

  // Slide the active card in from the right the first time the carousel scrolls
  // into view. Reduced-motion users get it shown immediately (CSS keeps it
  // visible). Cards start hidden (opacity 0), so a safety timeout reveals the
  // active card even if the observer never fires — the card must never get
  // stuck invisible.
  if (prefersReducedMotion) {
    carouselSeen = true;
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          carouselSeen = true;
          revealSlide(slides[activeIndex]);
          revealObserver.disconnect();
        });
      },
      { threshold: 0.25 }
    );
    revealObserver.observe(viewport);

    window.setTimeout(() => {
      if (!carouselSeen) {
        carouselSeen = true;
        revealSlide(slides[activeIndex]);
      }
    }, 2500);
  }
}

// Hero RFI. Owns four things:
//  1. the step 1 <-> step 2 swap and the stepper's current-step state;
//  2. the area-of-study -> specialization cascade, off SPECIALIZATIONS (the
//     same source the program finder uses, so the two can't drift apart);
//  3. the conditional step-1 follow-ups — RN licence (nursing only) and
//     learning format (GuidedPath/FlexPath programs only) — plus the
//     nursing-without-a-licence dead end;
//  4. per-field error/success states, matching the design system's states for
//     the Dropdown and Input field components.
function initHeroRfi() {
  const form = document.getElementById('rfi-form');
  if (!form) return;

  const hero = form.closest('.hero');
  const status = form.querySelector('[data-rfi-status]');
  const panels = [...form.querySelectorAll('[data-rfi-panel]')];
  const steps = [...form.querySelectorAll('[data-rfi-step]')];
  const next = form.querySelector('[data-rfi-next]');
  const back = form.querySelector('[data-rfi-back]');
  const degreeSelect = document.getElementById('rfi-degree');
  const areaSelect = document.getElementById('rfi-area');
  const specSelect = document.getElementById('rfi-specialization');
  const benefitsGroup = form.querySelector('[data-rfi-benefits]');
  const followups = form.querySelector('[data-rfi-followups]');
  const rnGroup = form.querySelector('[data-rfi-rn]');
  const formatsGroup = form.querySelector('[data-rfi-formats]');
  const disqualifier = form.querySelector('[data-rfi-disqualifier]');
  if (!panels.length || !steps.length) return;

  // --- field state helpers -------------------------------------------------
  // `error` and `success` are the design system's states (see .rfi-field--error
  // / --success). A field can be neither, but never both.
  const fieldOf = (control) => control.closest('[data-rfi-field]');

  function setError(control, on) {
    const field = fieldOf(control);
    if (!field) return;
    field.classList.toggle('rfi-field--error', on);
    if (on) field.classList.remove('rfi-field--success');
    const bar = field.querySelector('.rfi-field__error');
    if (bar) bar.hidden = !on;
    control.setAttribute('aria-invalid', String(on));
  }

  function setSuccess(control, on) {
    const field = fieldOf(control);
    if (!field || field.classList.contains('rfi-field--error')) return;
    field.classList.toggle('rfi-field--success', on);
  }

  // --- conditional follow-ups ---------------------------------------------
  // Figma annotates the RN question "Only shows if nursing is selected" and the
  // whole row "GuidedPath/FlexPath programs only".
  // ⚠️ FORMAT_AREAS is a stand-in. The real gate is per-PROGRAM, not per-area —
  // it belongs on the program record in the CMS. Listing areas here keeps the
  // conditional honest and visible instead of hiding a guess in a boolean.
  const FORMAT_AREAS = new Set([
    'business',
    'education',
    'health-sciences',
    'nursing',
    'psychology',
    'technology',
  ]);

  const rnAnswer = () => form.querySelector('input[name="rnLicense"]:checked')?.value || '';
  const isNursing = () => areaSelect?.value === 'nursing';
  // Nursing without an unrestricted RN licence is a dead end, not a validation
  // error — the copy tells them to pick a different area of study.
  const isDisqualified = () => isNursing() && rnAnswer() === 'no';

  function syncFollowups() {
    if (!followups) return;
    const showRn = isNursing();
    const showFormats = Boolean(specSelect?.value) && FORMAT_AREAS.has(areaSelect?.value);

    if (rnGroup) rnGroup.hidden = !showRn;
    if (formatsGroup) formatsGroup.hidden = !showFormats;
    followups.hidden = !showRn && !showFormats;

    // Leaving nursing clears the RN answer, so a stale "No" can't keep the
    // disqualifier (and the block on step 2) alive for a different area.
    if (!showRn) {
      form.querySelectorAll('input[name="rnLicense"]').forEach((radio) => {
        radio.checked = false;
      });
    }
    if (!showFormats) {
      form.querySelectorAll('input[name="format"]').forEach((radio) => {
        radio.checked = false;
      });
    }
    if (disqualifier) disqualifier.hidden = !isDisqualified();
  }

  // --- step 1 gate ---------------------------------------------------------
  // The form is `novalidate` so "Learn program details" (a next, not a submit)
  // doesn't fire browser bubbles; step 1 reports its own problems instead.
  function step1Complete() {
    let complete = true;
    [degreeSelect, areaSelect, specSelect].forEach((select) => {
      if (!select) return;
      const missing = !select.value;
      if (missing) complete = false;
      // Only mark what the user can actually act on. A gated link in the chain
      // is empty *because* the one before it is — painting it red would point
      // at a control they can't use and hide the field that really needs them.
      setError(select, missing && !select.disabled);
    });

    // A visible radio group is required; a hidden one is not.
    if (rnGroup && !rnGroup.hidden && !rnAnswer()) complete = false;
    if (formatsGroup && !formatsGroup.hidden && !form.querySelector('input[name="format"]:checked')) {
      complete = false;
    }
    if (isDisqualified()) complete = false;
    return complete;
  }

  // --- the hero hugs the form, and glides between sizes --------------------
  // This replaces the old reservation, which pinned BOTH panels to the tallest
  // state's height so the hero never resized. That held the photo still, but it
  // made step 1 pay for step 2 everywhere: at 1280x800 the hero sat at 783px in
  // every state when step 1 needs 672 — 111px of dark, empty panel, pushed
  // below the fold, on the step most people never leave. At 900x800 it was
  // 1035 against a needed 672, which is 363px.
  //
  // So the hero is now left to hug whatever the current state actually needs.
  // That brings back the thing the reservation was there to prevent — the photo
  // is `object-fit: cover`, so its crop is a function of the container's
  // aspect, and a hero that resizes re-crops it (§5c measured the subject
  // sliding 321 source px at 1280x800). The answer here is not to freeze the
  // height but to ANIMATE it: settleHeroHeight() eases the hero from its old
  // height to its new one, so the re-crop plays out as a slow push rather than
  // a jump cut. The subject still moves; she just moves at 450ms instead of in
  // a single frame.
  //
  // ⚠️ The alternative — pinning the photo's own box to the tallest state so
  // the crop can't change at all, and letting the hero clip it — was tried and
  // rejected. It holds the subject perfectly still, but it frames every short
  // state for a tall one: at 900x800 step 1 rendered the top two-thirds of a
  // 1035px-tall crop, which turns the composition into a headshot. Constant
  // framing is not worth the wrong framing.

  // Animate the hero from the height it is currently rendered at to the height
  // its new content wants. The height is only pinned for the length of the
  // transition — at rest the hero is back to `auto` under its CSS min-height,
  // so nothing here can go stale against a resize or a font swap.
  let settleFallback = null;
  let heightBefore = null;

  // ⚠️ The outgoing height has to be sampled BEFORE the DOM changes, and every
  // caller of settleHeroHeight() runs *after* it: showStep() has already
  // swapped the panels, and the delegated `change` listener is by definition
  // downstream of the handlers that open and close the conditionals. Sampling
  // inside settleHeroHeight() therefore reads the new height as the old one,
  // `from === to`, and the transition silently never runs (it didn't, first
  // time round). These two listeners are on the CAPTURE phase, so they fire
  // ahead of the control's own handlers and catch the pre-change height.
  function markHeroHeight() {
    heightBefore = hero ? hero.offsetHeight : null;
  }

  form.addEventListener('change', markHeroHeight, true);
  form.addEventListener('click', markHeroHeight, true);

  function releaseHeroHeight() {
    window.clearTimeout(settleFallback);
    heightBefore = null;
    if (!hero) return;
    hero.style.height = '';
    hero.classList.remove('is-resizing');
    syncPhotoFade();
  }

  function settleHeroHeight(animate) {
    if (!hero) return;
    // Mid-transition this is the animated value, which is the right thing to
    // ease from when a second change interrupts the first.
    const from = heightBefore ?? hero.offsetHeight;
    heightBefore = null;
    // Read the target with the lock off, so `to` is the real laid-out height.
    hero.style.height = '';
    const to = hero.offsetHeight;
    if (!animate || prefersReducedMotion || to === from) {
      releaseHeroHeight();
      return;
    }
    // Mobile has no `overflow: hidden` (the form panel sits below the photo
    // band in normal flow), so while the hero is mid-shrink the content that no
    // longer fits would spill over the section below. Clip for the duration.
    hero.classList.add('is-resizing');
    hero.style.height = `${from}px`;
    void hero.offsetHeight; // force the start frame, or there's nothing to ease from
    hero.style.height = `${to}px`;
    // Turn the fade ON eagerly against the TARGET height, so a hero growing
    // past the photo doesn't show a hard edge for the length of the
    // transition. Only ever added here — removing it mid-shrink would expose
    // the same edge on the way back. releaseHeroHeight() does the full sync.
    if (FADE_AT.matches && heroPhoto && heroPhoto.offsetHeight < to - 1) {
      hero.classList.add('hero--photo-short');
    }
    // transitionend is the real release; this only covers the case where the
    // transition never fires (interrupted, tab backgrounded, height clamped).
    window.clearTimeout(settleFallback);
    settleFallback = window.setTimeout(releaseHeroHeight, 1000);
  }

  hero?.addEventListener('transitionend', (event) => {
    if (event.target !== hero || event.propertyName !== 'height') return;
    releaseHeroHeight();
  });

  // The photo is pinned to the hero's height CAP, not to the hero (see
  // `.hero__bg-image`), so once the form pushes the hero past that cap the
  // photo stops short of the hero's bottom edge. Flag that state; CSS fades
  // the photo's last 120px into the wall red for it, because a hard horizontal
  // edge across her skirt reads as a rendering fault. Checked against the
  // rendered boxes rather than recomputing the cap, so it can't drift from
  // whatever the CSS actually resolved.
  const heroPhoto = hero?.querySelector('.hero__bg-image');
  // Below 769 the photo is a fixed 568px band with the form stacked underneath
  // in flow, so it is ALWAYS shorter than the hero and the comparison below
  // would be permanently true. The fade is desktop-only in CSS; keep the class
  // desktop-only too rather than leaving a lie in the DOM on mobile.
  const FADE_AT = window.matchMedia('(min-width: 769px)');

  function syncPhotoFade() {
    if (!hero || !heroPhoto) return;
    // 1px of slack: at rest the cap and the hero's height are the same computed
    // value, and sub-pixel rounding can make the photo look short.
    const short = FADE_AT.matches && heroPhoto.offsetHeight < hero.offsetHeight - 1;
    hero.classList.toggle('hero--photo-short', short);
  }

  // --- keep the copy clear of her face -------------------------------------
  // Her face is a fixed slice of the source frame: x 0.7312–0.8211 of
  // hero-rfi-desktop.webp, measured by sampling skin pixels off the asset and
  // taking the TOPMOST contiguous run. (A plain column histogram picks out her
  // neck and chest instead — they carry far more skin — which reads ~3%
  // further right and licenses copy that does overlap her face. That mistake
  // shipped once.)
  //
  // This is MEASURED rather than expressed as a vw formula because the crop
  // depends on the hero's height cap as well as its width, and that cap is
  // `100svh`-derived — so her face moves with the window's HEIGHT too. A 1440
  // window 900 tall and a 1440 window 1919 tall put her 60px apart, and no
  // width-only rule can track both.
  //
  // It can only be measured safely because the photo is pinned to the viewport
  // cap (see `.hero__bg-image`): the crop no longer depends on how tall the
  // content is, so the cap this derives can't feed back into its own input.
  const heroContent = hero?.querySelector('.hero__content');
  const FACE_LEFT_FRAC = 0.7312;
  const FACE_GUTTER = 24; // breathing room between the longest line and her face

  function fitHeroCopy() {
    if (!hero || !heroPhoto || !heroContent) return;
    if (!FADE_AT.matches || !heroPhoto.naturalWidth) {
      // Mobile stacks the copy under the photo band — nothing to clear. The
      // CSS fallback covers the pre-decode and no-JS cases.
      hero.style.removeProperty('--hero-copy-max');
      return;
    }
    const lw = heroPhoto.offsetWidth;
    const lh = heroPhoto.offsetHeight;
    const cover = Math.max(lw / heroPhoto.naturalWidth, lh / heroPhoto.naturalHeight);
    const drawnW = heroPhoto.naturalWidth * cover;
    // `object-position: right top` pins the right edge, so the overflow hangs
    // off the left.
    const faceInBox = lw - drawnW + FACE_LEFT_FRAC * drawnW;
    // ⚠️ The box's UNtransformed left edge. `.hero__bg-photo` carries a
    // `scale()` for the parallax's travel room, so getBoundingClientRect()
    // returns the scaled box and would overstate the room by lw*(scale-1)/2 —
    // 36px at 1440. The photo is `inset: 0` inside a background that is
    // `inset: 0` inside the hero, so the hero's own left edge is the right
    // reference. The parallax itself uses `translate` and moves her vertically,
    // so it can't affect this.
    // `none` under prefers-reduced-motion. Chrome's DOMMatrix happens to
    // accept that string and hand back an identity matrix; the spec wants a
    // <transform-list>, so don't rely on it.
    const transform = getComputedStyle(heroPhoto).transform;
    const scale = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).a || 1 : 1;
    const faceX = hero.getBoundingClientRect().left + lw / 2 + (faceInBox - lw / 2) * scale;

    const room = faceX - heroContent.getBoundingClientRect().left - FACE_GUTTER;
    // Never cap below the longest unbreakable word, or the headline overflows
    // its box and lands on her anyway — clipped, which looks worse than tight.
    const words = [...hero.querySelectorAll('.hero__title .word')];
    const widest = words.length ? Math.max(...words.map((w) => Math.ceil(w.getBoundingClientRect().width))) : 0;
    hero.style.setProperty('--hero-copy-max', `${Math.max(Math.floor(room), widest)}px`);
  }

  function showStep(step, animate = false) {
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.rfiPanel !== String(step);
    });
    steps.forEach((item) => {
      const isCurrent = item.dataset.rfiStep === String(step);
      item.classList.toggle('rfi__step--current', isCurrent);
      // aria-current is the non-visual half of what the white rule conveys.
      if (isCurrent) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    // Announce the change. Only on a real step change, never on the initial
    // showStep(1) — an announcement on page load is noise. Writing the text
    // (rather than un-hiding it) is what makes a live region fire.
    if (animate && status) {
      const heading = panels
        .find((p) => !p.hidden)
        ?.querySelector('.rfi__prompt-title')
        ?.textContent.trim();
      status.textContent = `Step ${step} of ${steps.length}${heading ? `, ${heading}` : ''}`;
    }
    settleHeroHeight(animate);
  }

  // --- degree -> area -> specialization chain ------------------------------
  // Each link is disabled until the one before it is answered, so the three
  // dropdowns can only be worked left to right. Clearing a link back to its
  // placeholder tears down everything downstream of it — otherwise a stale
  // specialisation could be submitted for an area that no longer applies.
  function setDisabled(select, disabled) {
    if (!select) return;
    select.disabled = disabled;
    // Drives the dimming; see `.rfi-field--disabled`.
    select.closest('[data-rfi-field]')?.classList.toggle('rfi-field--disabled', disabled);
  }

  function syncChain() {
    const hasDegree = Boolean(degreeSelect?.value);
    if (areaSelect) {
      setDisabled(areaSelect, !hasDegree);
      if (!hasDegree && areaSelect.value) {
        areaSelect.value = '';
        setError(areaSelect, false);
      }
    }

    const hasArea = Boolean(areaSelect?.value);
    if (specSelect) {
      const options = hasArea ? SPECIALIZATIONS[areaSelect.value] : null;
      // Rebuild only when the option set actually changes, so simply re-running
      // this (which happens on every change event) can't wipe a valid choice.
      if (specSelect.dataset.forArea !== (hasArea ? areaSelect.value : '')) {
        specSelect.dataset.forArea = hasArea ? areaSelect.value : '';
        specSelect.innerHTML = '<option value="">Specialization selection</option>';
        (options || []).forEach((label) => {
          const option = document.createElement('option');
          option.value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          option.textContent = label;
          specSelect.appendChild(option);
        });
        setError(specSelect, false);
      }
      setDisabled(specSelect, !options?.length);
    }
  }

  // One listener for all three: keep the chain in sync, clear the field's error
  // once it's filled, then re-run the conditionals (specialisation gates the
  // learning-format question).
  form.querySelectorAll('.rfi-field__select').forEach((select) => {
    select.addEventListener('change', () => {
      syncChain();
      if (select.value) setError(select, false);
      syncFollowups();
    });
  });

  // Picking an RN answer can open or close the dead end.
  form.querySelectorAll('input[name="rnLicense"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (disqualifier) disqualifier.hidden = !isDisqualified();
    });
  });

  // --- step 2: military benefits follow-up ---------------------------------
  // Only applies to someone who is military-associated, so it follows the
  // first question's answer. "No" (the default) keeps it closed.
  function syncBenefits() {
    if (!benefitsGroup) return;
    const show = form.querySelector('input[name="military"]:checked')?.value === 'yes';
    benefitsGroup.hidden = !show;
    // Switching back to "No" clears the answer, so a stale "Yes" can't be
    // submitted for someone who isn't military-associated.
    if (!show) {
      form.querySelectorAll('input[name="militaryBenefits"]').forEach((radio) => {
        radio.checked = false;
      });
    }
  }

  form.querySelectorAll('input[name="military"]').forEach((radio) => {
    radio.addEventListener('change', syncBenefits);
  });

  // --- step 2 field states -------------------------------------------------
  // Validate on blur, not on every keystroke: marking a half-typed email as an
  // error is noise. Success shows the same way, so a field the user completed
  // reads as done.
  //
  // ⚠️ Once a submit has flagged a field, an EMPTY value has to keep the error.
  // The rule below used to be "empty means no state", unconditionally, which
  // meant the submit painted every empty field red and then the first click
  // elsewhere wiped the error off whichever one you had just been in — the
  // field you were most likely to be looking at. Blur fired, the value was
  // still empty, and the error cleared itself.
  //
  // "Empty means no state" is still right BEFORE a submit: someone tabbing
  // through the form should not be shouted at for fields they haven't reached.
  // After a submit it is wrong, because the form has already told them the
  // field is required. `submitted` is that distinction.
  const submitted = new WeakSet();

  form.querySelectorAll('.rfi-field__input').forEach((input) => {
    const evaluate = () => {
      // Untouched by a submit and empty: stay neutral.
      if (!input.value && !submitted.has(input)) {
        setError(input, false);
        setSuccess(input, false);
        return;
      }
      // Otherwise let validity decide. Every one of these inputs is
      // `required`, so an empty value fails and the error persists until it is
      // actually filled in.
      const valid = input.checkValidity();
      setError(input, !valid);
      setSuccess(input, valid);
    };

    input.addEventListener('blur', evaluate);
    // Autofill never fires `blur` — the browser fills the field without it ever
    // being focused — so a blur-only check left autofilled fields with no state
    // at all, no success tick on a valid value and no error on a bad one, until
    // the user happened to click into and out of them. Chrome/Safari do fire
    // `change` when they autofill, so this covers it.
    input.addEventListener('change', evaluate);

    // Typing clears a standing error as soon as the value becomes valid, so the
    // red bar doesn't sit there while they fix it.
    input.addEventListener('input', () => {
      if (fieldOf(input)?.classList.contains('rfi-field--error') && input.checkValidity()) {
        setError(input, false);
        setSuccess(input, true);
      }
    });
  });

  // preventScroll on every step focus: the panels are different heights, so a
  // default focus() scrolls the page to chase the field and drags the headline
  // off screen — you'd land on step 2 with the hero's top half gone.

  // Forward is gated; backward never is. Both the action buttons and the
  // stepper labels go through these two, so there is exactly one definition of
  // what "advance" means — a second copy of the gate on the stepper is how you
  // end up with a back door into step 2.
  function goToStep2() {
    if (!step1Complete()) {
      const firstProblem =
        form.querySelector('.rfi-field--error .rfi-field__control') ||
        (isDisqualified() ? areaSelect : null) ||
        form.querySelector('[data-rfi-rn]:not([hidden]) .rfi-radio__input') ||
        form.querySelector('[data-rfi-formats]:not([hidden]) .rfi-radio__input');
      firstProblem?.focus({ preventScroll: true });
      return false;
    }
    showStep(2, true);
    form.querySelector('#rfi-first')?.focus({ preventScroll: true });
    return true;
  }

  function goToStep1() {
    showStep(1, true);
    degreeSelect?.focus({ preventScroll: true });
  }

  next?.addEventListener('click', goToStep2);
  back?.addEventListener('click', goToStep1);

  // The stepper labels navigate. Clicking the step you're already on is a
  // no-op rather than a re-entry: re-running goToStep2() from step 2 would
  // re-validate a step you can't see and yank focus back to the first field.
  steps.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.rfiStep;
      const current = panels.find((panel) => !panel.hidden)?.dataset.rfiPanel;
      if (target === current) return;
      if (target === '2') goToStep2();
      else goToStep1();
    });
  });

  // No endpoint to post to in this prototype, so keep the page put and mark up
  // whatever step 2 is missing using the same states as step 1.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const step2 = panels.find((panel) => panel.dataset.rfiPanel === '2');
    if (!step2 || step2.hidden) return;
    let firstBad = null;
    step2.querySelectorAll('.rfi-field__input').forEach((input) => {
      // From here on, blurring this field empty keeps the error rather than
      // clearing it — see the `submitted` set above.
      submitted.add(input);
      const valid = input.checkValidity();
      setError(input, !valid);
      setSuccess(input, valid);
      if (!valid && !firstBad) firstBad = input;
    });
    // "*All fields are required" covers the benefits question too, but only
    // while it's on screen.
    if (benefitsGroup && !benefitsGroup.hidden && !form.querySelector('input[name="militaryBenefits"]:checked')) {
      firstBad = firstBad || benefitsGroup.querySelector('.rfi-radio__input');
    }
    firstBad?.focus({ preventScroll: true });
  });

  // Any change inside the form can open or close a conditional, which resizes
  // the hero. One delegated listener covers all of them: `change` fires on the
  // control first, so every handler above (syncChain / syncFollowups /
  // syncBenefits) has already run by the time this bubbles up to the form.
  form.addEventListener('change', () => settleHeroHeight(true));

  syncChain();
  syncFollowups();
  syncBenefits();
  showStep(1);
  syncPhotoFade();
  fitHeroCopy();

  // Both depend on the photo, which may not have decoded yet, and on the
  // webfonts — Typekit's acumin swap changes the headline's word widths, which
  // is the floor fitHeroCopy() clamps to.
  document.fonts?.ready.then(fitHeroCopy);
  window.addEventListener(
    'load',
    () => {
      syncPhotoFade();
      fitHeroCopy();
    },
    { once: true }
  );
  heroPhoto?.addEventListener('load', fitHeroCopy);

  // A resize relays the hero out from scratch, so drop any height left pinned
  // by a transition the resize interrupted — otherwise the hero would hold a
  // height measured at the old viewport width until the next step change.
  // releaseHeroHeight() re-syncs the photo fade on the way through.
  //
  // ⚠️ The copy cap has to be recomputed on HEIGHT changes too, not just width:
  // the photo is pinned to a `100svh`-derived cap, so a shorter or taller
  // window re-crops it and moves her face sideways.
  window.addEventListener(
    'resize',
    () => {
      releaseHeroHeight();
      fitHeroCopy();
    },
    { passive: true }
  );
}

function initRevealAnimations() {
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const delay = Number(entry.target.dataset.revealDelay || 0) * 80;
        window.setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, delay);

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach((el) => observer.observe(el));
}

// Headings that get the masked, word-by-word rise-in-on-scroll effect.
// Deliberately short: the tiles, accreditation, action-CTA and carousel
// headings were all removed from this list by request — add back only if
// asked. (The program finder was on it too, until that section was removed.)
const TEXT_REVEAL_SELECTORS = [
  '.hero__title',
  '.stats-section__title',
];

// Wrap every word of an element in a clip-masked span so it can slide up from
// behind its own line box. Preserves <br> line breaks and inter-word spacing.
function splitWords(el) {
  const fragment = document.createDocumentFragment();
  let wordIndex = 0;

  const pushWord = (text) => {
    const word = document.createElement('span');
    word.className = 'word';
    const inner = document.createElement('span');
    inner.className = 'word__inner';
    inner.textContent = text;
    inner.style.setProperty('--word-index', String(wordIndex));
    word.appendChild(inner);
    fragment.appendChild(word);
    wordIndex += 1;
  };

  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(' '));
        } else {
          pushWord(part);
        }
      });
    } else if (node.nodeName === 'BR') {
      fragment.appendChild(node.cloneNode());
    } else {
      // Unknown inline element — keep it intact so nothing is lost.
      fragment.appendChild(node.cloneNode(true));
    }
  });

  el.textContent = '';
  el.appendChild(fragment);
  el.classList.add('reveal-text');
}

function initTextReveal() {
  const targets = document.querySelectorAll(TEXT_REVEAL_SELECTORS.join(','));
  if (!targets.length) return;

  if (prefersReducedMotion) {
    targets.forEach((el) => el.classList.add('reveal-text', 'is-visible'));
    return;
  }

  targets.forEach((el) => splitWords(el));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

// Browser-accurate cubic-bezier easing solver (Newton-Raphson + bisection fallback).
function cubicBezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x) => {
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const dx = sampleX(t);
      if (Math.abs(dx - x) < 1e-6) break;
      if (x > dx) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solveX(t)));
}

function initCountUp() {
  const els = document.querySelectorAll('.stats-section__value');
  if (!els.length) return;

  const ease = cubicBezier(0.1, 1, 0.1, 1);

  const items = Array.from(els).map((el) => {
    const raw = el.textContent.trim();
    const match = raw.match(/[\d,]*\.?\d+/);
    const numStr = match ? match[0] : '0';
    const start = match ? match.index : 0;
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
    return {
      el,
      raw,
      prefix: raw.slice(0, start),
      suffix: raw.slice(start + numStr.length),
      target: parseFloat(numStr.replace(/,/g, '')) || 0,
      grouped: numStr.includes(',') || decimals > 0,
      decimals,
      duration: Number(el.dataset.countDuration) || 1900,
      startTime: 0,
    };
  });

  const format = (item, value) =>
    `${item.prefix}${
      item.grouped
        ? value.toLocaleString('en-US', {
            minimumFractionDigits: item.decimals,
            maximumFractionDigits: item.decimals,
          })
        : String(Math.round(value))
    }${item.suffix}`;

  if (prefersReducedMotion) return;

  items.forEach((item) => {
    item.el.textContent = format(item, 0);
  });

  // One shared rAF loop drives every active counter (write-only, no layout reads).
  const active = new Set();
  let rafId = null;

  const tick = (now) => {
    active.forEach((item) => {
      if (!item.startTime) item.startTime = now;
      const progress = Math.min((now - item.startTime) / item.duration, 1);
      item.el.textContent =
        progress >= 1 ? item.raw : format(item, item.target * ease(progress));
      if (progress >= 1) active.delete(item);
    });
    rafId = active.size ? requestAnimationFrame(tick) : null;
  };

  const start = (item) => {
    active.add(item);
    if (rafId === null) rafId = requestAnimationFrame(tick);
  };

  // Single observer auto-handles each target; cascade them for an elegant stagger.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = items.find((it) => it.el === entry.target);
        observer.unobserve(entry.target);
        if (item) window.setTimeout(() => start(item), items.indexOf(item) * 130);
      });
    },
    { threshold: 0.4 }
  );

  items.forEach((item) => observer.observe(item.el));
}

function initParallax() {
  if (prefersReducedMotion) return;

  const band = document.querySelector('.content-band');
  const img = document.querySelector('.content-band__bg-image');
  if (!band || !img) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const rect = band.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom < 0 || rect.top > vh) return; // off-screen, skip work

    // progress goes -1 → 1 as the band transits from bottom to top of viewport.
    const t = (vh - rect.top) / (vh + rect.height);
    const progress = Math.min(Math.max(t, 0), 1) * 2 - 1;
    // Amplitude stays under the 8% CSS overshoot so no edge is ever exposed.
    const shift = -progress * rect.height * 0.06;
    img.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

// Subtle parallax on the hero photo. This used to move a separate red-wall
// layer while a people cutout stayed put; the Figma RFI hero is a single frame,
// so the whole photo drifts together.
function initHeroParallax() {
  if (prefersReducedMotion) return;

  const hero = document.querySelector('.hero');
  const photo = document.querySelector('.hero__bg-photo');
  if (!hero || !photo) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0) return; // hero fully scrolled past — skip work

    // Driven straight off scroll position (the hero is the first section) so the
    // wall starts drifting from the very first pixel of scroll — not only after
    // the hero clears the ~128px sticky header, which read as "no parallax".
    const scrolled = window.scrollY || window.pageYOffset || 0;
    // The photo drifts down as you scroll, lagging the page for depth. Uses the
    // `translate` property so it composes with (doesn't clobber) the CSS
    // `transform: scale()` on .hero__bg-photo.
    //
    // The 8px cap is set by the TOP edge. `object-position: ... top` pins the
    // image's top to the container's, so the only room above it is the scale's
    // own overshoot — (1.05-1)/2 = 2.38% of the container height, i.e. ~13.5px
    // on the 568px mobile band, which is the shortest container this runs on and
    // the one with zero cover slack (its aspect matches the crop exactly). 12px
    // left barely 2px of margin there; 8px leaves ~6px. Drifting DOWN only ever
    // increases coverage at the bottom, so that edge is never the constraint.
    const shift = Math.min(scrolled * 0.08, 8);
    photo.style.translate = `0 ${shift.toFixed(2)}px`;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

// Scroll-driven slide-in for the featured-story cards: the card's horizontal
// offset tracks how far the carousel has scrolled up the viewport, so it scrubs
// in from the right as you scroll (not a fixed-duration transition). Spread over
// a large scroll range so it's slow. The inner text keeps its own triggered
// stagger (see the reveal in initCarousel).
function initCardScroll() {
  if (prefersReducedMotion) return; // cards sit in place (no inline translate)

  const carousel = document.querySelector('.carousel');
  const cards = document.querySelectorAll('.carousel__card');
  if (!carousel || !cards.length) return;

  const START_OFFSET = 45; // % of card width — where the card starts, off-right

  // Ratchet: once the card has slid in this far, never let it slide back out
  // again on an upward scroll. Only forward (scrolling down) progress counts.
  let revealed = START_OFFSET;

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = carousel.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    let x;
    if (rect.top >= vh) {
      x = START_OFFSET; // still below the fold — parked off to the right
    } else if (rect.bottom <= 0) {
      x = 0; // scrolled well past — settled
    } else {
      // 0 when the carousel top is at the bottom of the viewport, 1 once it has
      // risen ~90% of a viewport height. The wide range makes the slide slow.
      const e = Math.min(Math.max((vh - rect.top) / (vh * 0.9), 0), 1);
      x = (1 - e) * START_OFFSET;
    }
    revealed = Math.min(revealed, x); // ratchet: only ever move toward 0
    const value = `${revealed.toFixed(2)}% 0`;
    cards.forEach((c) => {
      c.style.translate = value;
    });
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

// Scroll-driven upward parallax for the hero copy: as you scroll down it moves
// up, layering above the people.
//
// ⚠️ This is inert on this page, and that is expected. The hero copy only
// floats when the hero is purely decorative; with the RFI form in the hero it
// must NOT, because the copy would slide up away from a form that stays put
// (the form is deliberately excluded — drifting selects and inputs are
// miserable to use), leaving a growing gap between a heading and the fields it
// introduces. So `heroContent` is null here and the function returns
// immediately. It is kept for a hero without the form.
//
// The program finder used to be the other half of this, and it carried all the
// complexity: the finder drifted up over the hero's bottom edge, which holds
// the RFI's action buttons, so its travel had to be capped on the clearance
// below the form and re-measured every frame (a ResizeObserver could not see a
// step change, and a conditional reveal moved the buttons without resizing
// anything). That section was removed, and `measureFinderRoom()`, the
// observer, and the `rfi:stepchange` event that existed only to re-run it went
// with it.
function initContentParallax() {
  if (prefersReducedMotion) return;

  const hasHeroForm = Boolean(document.querySelector('.hero__rfi'));
  const heroContent = hasHeroForm ? null : document.querySelector('.hero__content');
  if (!heroContent) return;

  // Driven off window.scrollY, NOT the element's viewport position. Deriving
  // the offset from `vh - rect.top` is non-zero the moment an element is on
  // screen, so at scrollY 0 the copy started ~100px above where it was laid
  // out — the headline rode up off the torsos. Keyed to scrollY it sits
  // exactly where it is laid out at the top of the page.
  const HERO_FACTOR = 0.6;
  const HERO_MAX = 260;

  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    // The hero has `overflow: hidden`, so cap the travel at the content's own
    // laid-out distance from the hero's top edge (less a little breathing
    // room). Without this the headline clips against the hero's top on short
    // heroes — the mobile hero only leaves ~110px of room, versus ~290 on
    // desktop. offsetTop is a layout value, so `translate` doesn't skew it.
    const room = Math.max(0, heroContent.offsetTop - 16);
    const offset = Math.min(y * HERO_FACTOR, room, HERO_MAX);
    heroContent.style.translate = `0 ${-offset.toFixed(2)}px`;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

function initNavScroll() {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  // Hysteresis (enter above 40px, exit below 16px) so hovering near a single
  // threshold — trackpad momentum, rubber-banding — can't flicker the class
  // on/off. The CSS transition on .main-nav / .main-nav__bar smooths the
  // height change itself; this stops it from being retriggered rapidly.
  let ticking = false;
  const update = () => {
    ticking = false;
    const scrolled = nav.classList.contains('main-nav--scrolled');
    if (!scrolled && window.scrollY > 40) {
      nav.classList.add('main-nav--scrolled');
    } else if (scrolled && window.scrollY < 16) {
      nav.classList.remove('main-nav--scrolled');
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// Third level of the Degrees megamenu: area of study → programs, mirroring
// capella.edu (where an area is a toggle, not a link, and swaps the right-hand
// column for its programs). Kept in JS rather than markup because it's ~50
// extra links that only ever appear on demand.
const MEGA_PROGRAMS = {
  'area-bachelors': {
    Business: ['BS in Business'],
    'Health Sciences': ['BS in Health Care Administration'],
    'Information Technology': ['BS in Computer Science', 'BS in Information Technology'],
    Nursing: ['BSN (Prelicensure)', 'RN-to-BSN'],
    Psychology: ['BS in Psychology', 'BS in Psychology Pre-Counseling & Therapy'],
    'Social Work': ['BSW - Bachelor of Social Work'],
  },
  'area-masters': {
    Business: ['MBA - Master of Business Administration', 'MS in Human Resource Management'],
    'Counseling & Therapy': [
      'MS in Marriage & Family Therapy',
      'MS in Clinical Mental Health Counseling',
      'MS in School Counseling',
    ],
    Education: ['MS in Education'],
    'Health Sciences': ['MHA - Master of Health Administration', 'MPH - Master of Public Health'],
    'Information Technology': [
      'MS in Analytics',
      'MS in Cybersecurity and Applied AI',
      'MS in Information Technology',
    ],
    Nursing: [
      'MSN - Master of Science in Nursing',
      'MSN NP - Master of Science in Nursing, Nurse Practitioner',
    ],
    Psychology: [
      'MS in Applied Behavior Analysis',
      'MS in Clinical Psychology',
      'MS in Psychology',
      'MS in School Psychology',
    ],
    'Social Work': ['MSW - Master of Social Work', 'MSW - Master of Social Work Advanced Standing'],
  },
  'area-doctoral': {
    Business: ['DBA - Doctor of Business Administration'],
    Education: ['EdD - Doctor of Education'],
    'Health Sciences': ['DHA - Health Administration', 'DrPH - Doctor of Public Health'],
    'Information Technology': ['DIT - Doctor of Information Technology'],
    Nursing: ['DNP - Doctor of Nursing Practice'],
    Psychology: [
      'EdS in School Psychology',
      'PhD in Behavior Analysis',
      'PhD in Psychology',
      'PsyD in Clinical Psychology',
    ],
    'Social Work': ['DSW - Doctor of Social Work'],
  },
  'area-certificates': {
    Business: ['Graduate Certificate in Human Resource Management'],
    'Counseling & Therapy': ['Counseling Certificates'],
    'Health Sciences': ['Graduate Certificate in Public Health'],
    Nursing: ['Post-Master’s Nursing Certificates'],
    Psychology: ['Graduate Certificate in Applied Behavior Analysis'],
  },
  // Individual Courses has no third level — its rows are the final links.
};

// Desktop megamenus. Click (not hover) opens, matching how capella.edu's nav
// behaves and avoiding a menu that fires when the pointer merely crosses the
// bar. Only one is open at a time.
function initMegaMenu() {
  // These are <button>s now, not links: they open a menu rather than
  // navigating, and as links they only responded to Enter — Space, which
  // every user expects of a menu trigger, did nothing.
  //
  // ⚠️ The child combinator is load-bearing. `a[aria-controls]` used to scope
  // this on its own; now that the triggers are buttons, a descendant selector
  // also sweeps up the five `.megamenu__level` rail tabs INSIDE the panels,
  // which carry `aria-controls` of their own and have their own handler below.
  // Only the direct children of `.main-nav__item` are top-level triggers.
  const triggers = [...document.querySelectorAll('.main-nav__item > [aria-controls]')];
  if (!triggers.length) return;

  const panelFor = (t) => document.getElementById(t.getAttribute('aria-controls'));

  function close(trigger) {
    const panel = panelFor(trigger);
    trigger.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  }

  function closeAll(except) {
    triggers.forEach((t) => {
      if (t !== except) close(t);
    });
  }

  // The wide menu starts at the nav CONTAINER's left edge, not under its
  // trigger (the narrow menus do anchor to their trigger). `.main-nav__item` is
  // `relative` for those, so shift this one back by the difference.
  // Measured on every open rather than only on resize: the bar also changes
  // size when `.main-nav--scrolled` kicks in and when webfonts land, either of
  // which would otherwise leave a stale offset and push the panel off-screen.
  function position(panel, trigger) {
    const nav = document.querySelector('.main-nav');
    const bar = document.querySelector('.main-nav__bar');
    if (!panel || !nav || !bar) return;
    const navRect = nav.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();

    // Every panel hangs from the BAR's bottom edge, so they all open at the
    // same height regardless of which trigger you used.
    panel.style.top = `${barRect.bottom - navRect.top}px`;

    // The wide menu starts at the bar's left edge; the narrow ones are CENTRED
    // under their trigger. The trigger's padding is symmetric, so its box
    // centre is the label's centre.
    let anchor;
    if (panel.classList.contains('megamenu--split')) {
      anchor = barRect.left;
    } else {
      const triggerRect = trigger.getBoundingClientRect();
      // offsetWidth is readable here because open() unhides the panel before
      // calling this.
      const panelWidth = panel.offsetWidth;
      anchor = triggerRect.left + triggerRect.width / 2 - panelWidth / 2;
      // Clamp to the viewport — Admissions sits far enough right that centring
      // alone would hang the panel off the edge on narrower desktops.
      anchor = Math.min(Math.max(anchor, 0), window.innerWidth - panelWidth);
    }
    panel.style.left = `${anchor - navRect.left}px`;
  }

  function open(trigger) {
    closeAll(trigger);
    const panel = panelFor(trigger);
    trigger.setAttribute('aria-expanded', 'true');
    if (panel) {
      panel.hidden = false;
      // Measured on open, not just on resize: the bar also changes size when
      // `.main-nav--scrolled` kicks in and when webfonts land, either of which
      // would otherwise leave a stale offset.
      position(panel, trigger);
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) close(trigger);
      else open(trigger);
    });
  });

  // Degree-level rail switches the area panel beside it.
  document.querySelectorAll('.megamenu__level-list').forEach((list) => {
    const tabs = [...list.querySelectorAll('.megamenu__level')];
    tabs.forEach((tab) => {
      const select = () => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', String(on));
          const p = document.getElementById(t.getAttribute('aria-controls'));
          if (p) p.hidden = !on;
        });
      };
      // ⚠️ Click ONLY — deliberately no `mouseenter`. Hover-to-select meant
      // simply moving the pointer across the rail toward the areas column
      // swapped the panel out from under you. The live site requires a click.
      tab.addEventListener('click', select);
    });
  });

  // --- Third level: area of study -> its programs --------------------------
  // capella.edu CASCADES: clicking an area opens a third column beside the
  // areas rather than replacing them, so the trail (level > area) stays
  // visible. Built with DOM APIs, not innerHTML: several program names contain
  // "&" and a curly apostrophe.
  const programCol = document.getElementById('degrees-programs-col');

  function clearPrograms() {
    if (!programCol) return;
    programCol.hidden = true;
    programCol.replaceChildren();
    document
      .querySelectorAll('.megamenu__area-list a[aria-current]')
      .forEach((a) => a.removeAttribute('aria-current'));
  }

  document.querySelectorAll('.megamenu__panel').forEach((panel) => {
    const map = MEGA_PROGRAMS[panel.id];
    if (!map || !programCol) return;

    panel.querySelectorAll('.megamenu__area-list a').forEach((link) => {
      const area = link.textContent.trim();
      const programs = map[area];
      if (!programs) return; // leaf row - nothing deeper to show

      link.addEventListener('click', (e) => {
        e.preventDefault();
        programCol.replaceChildren();

        const heading = document.createElement('h3');
        heading.className = 'megamenu__programs-title';
        heading.textContent = area;
        programCol.appendChild(heading);

        const ul = document.createElement('ul');
        ul.className = 'megamenu__area-list';
        programs.forEach((name) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = '#';
          a.textContent = name;
          li.appendChild(a);
          ul.appendChild(li);
        });
        programCol.appendChild(ul);
        programCol.hidden = false;

        panel
          .querySelectorAll('.megamenu__area-list a')
          .forEach((x) => x.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
      });
    });
  });

  // Changing degree level drops the third column - it belonged to the level
  // you just left.
  document.querySelectorAll('.megamenu__level').forEach((tab) => {
    tab.addEventListener('click', clearPrograms);
  });

  // Dismissal: click outside, or Escape (which returns focus to the trigger).
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.main-nav__item')) {
      closeAll();
      clearPrograms();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openTrigger = triggers.find((t) => t.getAttribute('aria-expanded') === 'true');
    if (!openTrigger) return;
    close(openTrigger);
    openTrigger.focus();
  });
}

// Mobile navigation: a STACK of full-screen views that slide in from the right,
// each with a "« Back" to pop — mirroring capella.edu's mobile nav. Not an
// accordion: an earlier inline-expand version looked nothing like it and grew
// taller than the viewport. The tree is derived from the megamenu DOM so the
// desktop and mobile navs can't drift apart.
function initMobileMenuTree() {
  const panel = document.getElementById('mobile-nav-panel');
  if (!panel) return;

  // --- Derive the tree from the desktop megamenus -------------------------
  const roots = [];
  document.querySelectorAll('.main-nav__links > .main-nav__item').forEach((item) => {
    const trigger = item.querySelector('a[aria-controls]');
    if (!trigger) return;
    const menu = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!menu) return;
    const label = trigger.textContent.trim();

    if (menu.classList.contains('megamenu--split')) {
      const levels = [...menu.querySelectorAll('.megamenu__level')].map((lvl) => {
        const areaPanel = document.getElementById(lvl.getAttribute('aria-controls'));
        const levelLabel = lvl.textContent.replace('\u203A', '').trim();
        const programs = MEGA_PROGRAMS[areaPanel.id] || {};
        const areas = [...areaPanel.querySelectorAll('.megamenu__area-list a')].map((a) => {
          const areaLabel = a.textContent.trim();
          const list = programs[areaLabel];
          return list
            ? { label: areaLabel, heading: areaLabel, children: list.map((n) => ({ label: n })) }
            : { label: areaLabel };
        });
        return { label: levelLabel, heading: levelLabel, children: areas };
      });
      roots.push({ label, children: levels });
    } else {
      const groups = [...menu.querySelectorAll('.megamenu__group')].map((g) => ({
        heading: g.querySelector('.megamenu__group-title').textContent.trim(),
        items: [...g.querySelectorAll('.megamenu__area-list a')].map((a) => ({
          label: a.textContent.trim(),
        })),
      }));
      roots.push({ label, groups });
    }
  });
  if (!roots.length) return;

  // --- View rendering ------------------------------------------------------
  const viewport = document.createElement('div');
  viewport.className = 'mobile-menu__viewport';

  const footer = document.createElement('div');
  footer.className = 'mobile-menu__footer';
  ['Apply now', 'Request info'].forEach((t) => {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = t;
    footer.appendChild(a);
  });

  panel.replaceChildren(viewport, footer);

  const stack = [];

  function row(node, opts = {}) {
    // `groups` counts as having children too — the Experience/Financing/
    // Admissions menus are grouped lists, not a flat `children` array, and
    // checking only `children` left them without a chevron or a tap target.
    const hasChildren = !!(
      (node.children && node.children.length) ||
      (node.groups && node.groups.length)
    );
    const el = document.createElement(hasChildren ? 'button' : 'a');
    if (hasChildren) el.type = 'button';
    else el.href = '#';
    el.className = 'mobile-menu__row' + (opts.strong ? ' mobile-menu__row--strong' : '');
    el.append(node.label);

    // Unlike the desktop menu, EVERY mobile row carries a chevron \u2014 including
    // leaf program links, which is what the live mobile nav does (there the
    // chevron reads as "goes somewhere", not "opens a level").
    const chev = document.createElement('span');
    chev.className = 'mobile-menu__chev';
    chev.setAttribute('aria-hidden', 'true');
    chev.textContent = '\u203A';
    el.appendChild(chev);

    if (hasChildren) {
      el.addEventListener('click', () => push(node));
    }
    return el;
  }

  function makeView(node, isRoot) {
    const view = document.createElement('div');
    view.className = 'mobile-menu__view';

    if (!isRoot) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'mobile-menu__back';
      back.textContent = '\u00AB Back';
      back.addEventListener('click', pop);
      view.appendChild(back);
    }

    if (node.heading) {
      const h = document.createElement('p');
      h.className = 'mobile-menu__heading';
      h.textContent = node.heading;
      view.appendChild(h);
    }

    if (node.groups) {
      node.groups.forEach((g) => {
        const h = document.createElement('p');
        h.className = 'mobile-menu__group';
        h.textContent = g.heading;
        view.appendChild(h);
        g.items.forEach((child) => view.appendChild(row(child)));
      });
    } else {
      (node.children || []).forEach((child) => view.appendChild(row(child, { strong: isRoot })));
    }
    return view;
  }

  function push(node) {
    const view = makeView(node, false);
    viewport.appendChild(view);
    // Force a reflow so the browser sees the off-screen start position before
    // the class flips it in — otherwise it jumps rather than slides.
    void view.offsetWidth;
    view.classList.add('is-current');
    stack.push(view);
  }

  function pop() {
    const view = stack.pop();
    if (!view) return;
    view.classList.remove('is-current');
    const done = () => view.remove();
    if (prefersReducedMotion) done();
    else view.addEventListener('transitionend', done, { once: true });
  }

  function reset() {
    while (stack.length) stack.pop().remove();
  }

  const rootView = makeView({ children: roots }, true);
  rootView.classList.add('is-current', 'mobile-menu__view--root');
  viewport.appendChild(rootView);

  // Closing the menu returns it to the top level, so it never reopens deep
  // inside a branch you already left.
  document.querySelector('.main-nav__menu-btn')?.addEventListener('click', () => {
    if (panel.hidden) reset();
  });
}

function initMobileNav() {
  const button = document.querySelector('.main-nav__menu-btn');
  const panel = document.getElementById('mobile-nav-panel');
  if (!button || !panel) return;

  // ⚠️ The panel is `position: fixed` and MUST be a direct child of <body>.
  // Authored inside `.main-nav` it kept collapsing to a 3px sliver once you
  // scrolled: `.main-nav--scrolled` applies (and transitions) `backdrop-filter`,
  // and a backdrop-filter — like transform/filter/will-change/contain — makes
  // the element the CONTAINING BLOCK for fixed descendants. `top/bottom` then
  // resolved against the ~67px header instead of the viewport, so the menu
  // "opened" onto the page below it. Reparenting once, here, makes the panel
  // immune to whatever effects the header picks up later.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);

  // Anchor to the header's real bottom rather than a hardcoded offset: the
  // utility bar and nav are separately sticky and the bar's padding changes in
  // the scrolled state, so the seam moves. Measured on open (and on resize
  // while open) it always meets the nav bar exactly, at any scroll position.
  function anchor() {
    const nav = document.querySelector('.main-nav');
    if (nav) panel.style.top = `${Math.round(nav.getBoundingClientRect().bottom)}px`;
  }

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    button.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    if (!isOpen) anchor();
    panel.hidden = isOpen;
  });

  // The header shrinks as you scroll, so keep the seam honest while open.
  window.addEventListener('resize', () => {
    if (!panel.hidden) anchor();
  });
  window.addEventListener('scroll', () => {
    if (!panel.hidden) anchor();
  }, { passive: true });

  panel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open menu');
      panel.hidden = true;
    });
  });
}

// Lazy-load the CTA background video: with preload="none" + no autoplay
// attribute, nothing downloads until we call play() as the section nears the
// viewport. Pause when it leaves to save CPU/battery. Reduced-motion users
// never load it (the poster frame stands in instead).
function initCtaVideos() {
  const section = document.querySelector('.action-cta');
  if (!section) return;

  const videos = [...section.querySelectorAll('.action-cta__video')];
  if (!videos.length || prefersReducedMotion) return;

  // Three encodes, picked by viewport:
  //   ≤768   portrait 374x686 (1.5MB) — the section is portrait here, so this is
  //          a purpose-shot crop, not the landscape master squeezed by `cover`
  //   ≤1024  landscape 960-wide (2.2MB) — still landscape, but a big viewport's
  //          worth of pixels is wasted on a tablet
  //   else   landscape 1440 master (5.3MB)
  //
  // Done in JS rather than `media` on <source>, which not every browser honours —
  // getting that wrong would serve the smallest file to desktops. Safe to rewrite
  // srcs here because `preload="none"` means nothing has been requested yet.
  const tier = window.matchMedia('(max-width: 768px)').matches
    ? 'Portrait'
    : window.matchMedia('(max-width: 1024px)').matches
      ? 'Sm'
      : null;

  if (tier) {
    videos.forEach((video) => {
      const webm = video.dataset[`srcWebm${tier}`];
      const mp4 = video.dataset[`srcMp4${tier}`];
      const mp4Type = video.dataset[`typeMp4${tier}`];
      if (!webm && !mp4) return;
      video.querySelectorAll('source').forEach((source) => {
        // startsWith, not ===: the types carry codec strings.
        if (source.type.startsWith('video/webm')) {
          if (webm) source.src = webm;
        } else if (mp4) {
          source.src = mp4;
          // Each encode is a different H.264 level, so the codec string differs —
          // leaving the 1440 one here would misdeclare the file.
          if (mp4Type) source.type = mp4Type;
        }
      });
      // The portrait clip needs its own poster; the landscape one would letterbox.
      if (tier === 'Portrait' && video.dataset.posterPortrait) {
        video.poster = video.dataset.posterPortrait;
      }
      video.load();
    });
  }

  // --- pause control (WCAG 2.2.2) -----------------------------------------
  // The clip auto-starts, loops and runs 45s beside other content, so it needs
  // a stop. Only revealed here, inside the branch that actually plays: under
  // reduced motion this function has already returned and nothing ever moves,
  // so a pause button would be a control for nothing.
  const toggle = section.querySelector('[data-cta-playpause]');
  const toggleLabel = section.querySelector('[data-cta-playpause-label]');
  // Set by the user, and it outranks the observer from then on — scrolling
  // away and back must not quietly restart something they stopped.
  let userPaused = false;

  function syncToggle() {
    if (!toggle) return;
    toggle.classList.toggle('is-paused', userPaused);
    toggle.setAttribute('aria-pressed', String(userPaused));
    if (toggleLabel) {
      toggleLabel.textContent = userPaused ? 'Play background video' : 'Pause background video';
    }
  }

  if (toggle) {
    toggle.hidden = false;
    syncToggle();
    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      videos.forEach((video) => {
        if (userPaused) video.pause();
        else if (video.offsetParent !== null) video.play().catch(() => {});
      });
      syncToggle();
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        videos.forEach((video) => {
          if (video.offsetParent === null) return; // display:none (e.g. mobile)
          if (entry.isIntersecting) {
            if (video.paused && !userPaused) video.play().catch(() => {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      });
    },
    { rootMargin: '200px 0px', threshold: 0.01 }
  );

  observer.observe(section);
}

// Footer partner carousel. Mirrors the live site: manual arrows only (no
// autoplay), paging by a whole view. `--per-view` lives in CSS so the
// breakpoints own the responsive behaviour and this only has to read it back.
function initFooterPartners() {
  const root = document.querySelector('.footer__partners');
  if (!root) return;

  const track = root.querySelector('.footer__partners-track');
  const items = [...root.querySelectorAll('.footer__partners-item')];
  const prev = root.querySelector('.footer__partners-arrow--prev');
  const next = root.querySelector('.footer__partners-arrow--next');
  if (!track || !items.length || !prev || !next) return;

  let index = 0;

  const perView = () => {
    const raw = parseInt(getComputedStyle(root).getPropertyValue('--per-view'), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  };
  // Last valid start index — never scroll past the final full view, or the
  // track would leave empty space on the right.
  const maxIndex = () => Math.max(0, items.length - perView());

  function render() {
    index = Math.min(index, maxIndex());
    track.style.transform = `translateX(${(-index * 100) / perView()}%)`;
    // Disabled (not hidden) at the ends so the viewport width never changes.
    prev.disabled = index <= 0;
    next.disabled = index >= maxIndex();
    items.forEach((item, i) => {
      const visible = i >= index && i < index + perView();
      item.setAttribute('aria-hidden', String(!visible));
      const link = item.querySelector('a');
      if (link) link.tabIndex = visible ? 0 : -1;
    });
  }

  prev.addEventListener('click', () => {
    index = Math.max(0, index - perView());
    render();
  });
  next.addEventListener('click', () => {
    index = Math.min(maxIndex(), index + perView());
    render();
  });

  // per-view changes with the breakpoint, so re-clamp on resize.
  let raf = null;
  window.addEventListener('resize', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      render();
    });
  });

  render();
}

// Password gate for the unlisted prototype.
//
// ⚠️ READ THIS BEFORE TRUSTING IT. This is a DETERRENT, not access control.
// The entire page is served to anyone who requests it — `curl` returns it in
// full, and devtools shows it without typing anything. All this does is stop
// the prototype being casually browsed or stumbled into. If the content
// genuinely must not be readable by the public, the HOST has to refuse the
// request (HTTP Basic Auth, or the hosting platform's own password
// protection). ACCESS.md spells out the options.
//
// The password is stored as a SHA-256 hash rather than in plain text. That is
// worth the three lines — it stops the password itself leaking to anyone who
// opens the bundle, which matters if it is reused elsewhere — but it is NOT
// what makes this weak-or-strong. A short dictionary word falls to an offline
// guess instantly, and the content is readable without the password anyway.
const GATE_KEY = 'cu-proto-gate';
const GATE_HASH = 'e91c254ad58860a02c788dfb5c1a65d6a8846ab1dc649631c7db16fef4af2dec';

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function initPasswordGate() {
  const gate = document.querySelector('[data-pw-gate]');
  const form = document.querySelector('[data-pw-form]');
  if (!gate || !form) return;

  const input = form.querySelector('#pw-gate-input');
  const error = form.querySelector('#pw-gate-error');
  const locked = () => document.documentElement.classList.contains('is-locked');

  function unlock() {
    try {
      sessionStorage.setItem(GATE_KEY, 'unlocked');
    } catch (e) {
      // Private mode: they'll be asked again next load. Still unlock now.
    }
    document.documentElement.classList.remove('is-locked');
    // The page was `display: none` a moment ago, so nothing in it has been
    // laid out. Anything that measured itself on DOMContentLoaded read zeros.
    // A resize event is what the hero, carousel and parallax all already
    // listen to for a re-measure, so reuse it rather than inventing a hook.
    window.dispatchEvent(new Event('resize'));
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }

  if (!locked()) return;

  // ⚠️ `crypto.subtle` is undefined on insecure origins — it needs HTTPS or
  // localhost. On plain http:// over a LAN the hash can't be computed, so
  // fail CLOSED and say why rather than silently letting everyone in.
  if (!window.crypto?.subtle) {
    error.textContent = 'This preview needs to be served over HTTPS to unlock.';
    error.hidden = false;
    input.disabled = true;
    return;
  }

  input.focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ok = (await sha256Hex(input.value)) === GATE_HASH;
    if (ok) {
      unlock();
      return;
    }
    gate.classList.add('pw-gate--error');
    error.hidden = false;
    input.select();
  });

  // Clear the error as soon as they start correcting it.
  input.addEventListener('input', () => {
    gate.classList.remove('pw-gate--error');
    error.hidden = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initPasswordGate();
  initCarousel();
  initHeroRfi();
  initTextReveal();
  initRevealAnimations();
  initCountUp();
  initParallax();
  initHeroParallax();
  initCardScroll();
  initContentParallax();
  initNavScroll();
  initMegaMenu();
  initMobileMenuTree();
  initMobileNav();
  initCtaVideos();
  initFooterPartners();
});
