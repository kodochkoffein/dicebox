# Accessibility Improvement Plan

This document outlines the results of a comprehensive accessibility audit of the DiceBox ("Call to Roll") application, and provides a prioritized plan for remediation.

---

## Audit Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 5 | Application unusable for keyboard/screen reader users |
| High | 30+ | Major barriers to assistive technology users |
| Medium | 25+ | Degraded experience for users with disabilities |
| Low | 10+ | Minor issues and best-practice gaps |

---

## Phase 1: Critical - Keyboard Accessibility

The drag-and-drop dice rolling interaction is completely inaccessible to keyboard users. This is the single biggest barrier in the application.

### 1.1 Add keyboard support to DragPickupView

**Files:** `src/features/dice-rolling/strategies/drag-pickup/DragPickupView.js`, `src/features/dice-rolling/strategies/drag-pickup/DragPickupStrategy.js`

The entire dice interaction (drag to pick up, release to roll) only responds to pointer events (`touchstart`, `touchmove`, `touchend`, `mousedown`, `mousemove`, `mouseup`). There are zero `keydown`/`keyup` handlers.

**What to do:**
- Make each die focusable with `tabindex="0"`
- Add `role="button"` and `aria-label` (e.g. "Die 1, value 4, red set") to each die wrapper
- Add `keydown` handler: `Space`/`Enter` toggles a die as "picked up", reflecting the drag interaction
- Add `aria-pressed` to reflect the picked-up state
- Provide a "Roll" action (e.g. a dedicated button or `Enter` on the container) that triggers the roll for all picked dice
- Add `aria-live="polite"` to the hint region so status text changes ("Drag across dice to pick up" / "Rolling..." / "Release to roll") are announced

### 1.2 Add keyboard support to room-code-input

**File:** `src/ui/components/room/room-code-input.js`

The room code dice respond only to pointer events (tap to change color, swipe to change value). No `keydown` handlers exist. Dice are not focusable.

**What to do:**
- Add `tabindex="0"` and `role="spinbutton"` (or `role="button"`) to each die element
- Add `aria-label` describing current state (e.g. "Room code die 1: red 4")
- Add `keydown` handler: `ArrowUp`/`ArrowDown` to change value, `Space`/`Enter` to cycle color
- Announce value/color changes via an `aria-live` region
- Add `role="group"` and `aria-label="Room code"` to the container

### 1.3 Add keyboard support to dice-config

**File:** `src/ui/components/room/dice-config.js`

The color dropdown and action buttons lack keyboard navigation.

**What to do:**
- Add `aria-label` to all icon-only buttons: "-" -> "Decrease dice count", "+" -> "Increase dice count", "x" -> "Remove dice set"
- Add `aria-expanded` and `aria-controls` to the color button that toggles the dropdown
- Add `role="listbox"` to the color dropdown and `role="option"` to each color swatch
- Add arrow key navigation within the color dropdown
- Wrap each dice set config in a `<fieldset>` with a `<legend>` (e.g. "Red dice set")
- Add `aria-live="polite"` to the count display so changes are announced

---

## Phase 2: High - Screen Reader Semantics

### 2.1 Add ARIA landmarks and roles to play page

**Files:** `src/play/index.html`, `src/ui/components/room/room-view.js`

- Add `role="main"` or use `<main>` for the primary content area
- Add `role="region"` with `aria-label` to major sections (dice roller, player list, roll history)

### 2.2 Add `<main>` landmark to static pages

**Files:** `src/about.html`, `src/help.html`, `src/privacy.html`, `src/terms.html`, `src/demo.html`

All static pages wrap content in `<div class="static-page">` instead of `<main>`. Change the wrapper to `<main>` or add `role="main"`.

### 2.3 Add skip navigation links

**Files:** All HTML pages (`src/index.html`, `src/play/index.html`, `src/about.html`, `src/help.html`, `src/privacy.html`, `src/terms.html`)

Add a visually-hidden skip link as the first focusable element on every page:
```html
<a href="#main-content" class="sr-only sr-only-focusable">Skip to main content</a>
```

Add a `.sr-only` utility class to CSS:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  margin: 0;
}
```

### 2.4 Add ARIA to dice-history for live updates

**File:** `src/ui/components/room/dice-history.js`

- Add `role="log"` and `aria-live="polite"` to the `.history-list` container so new rolls are announced
- Add `aria-label` to the history region (e.g. "Roll history")

### 2.5 Add ARIA to peer-list

**File:** `src/ui/components/room/peer-list.js`

- Change `.peer-list-content` to a `<ul>` and each peer item to `<li>`
- Add `aria-label` to status indicators (e.g. "Connected", "Reconnecting")
- Add `aria-label` to the dice icon (currently a Unicode die emoji that reads poorly)
- Add `aria-label="Players"` to the peer list region

### 2.6 Add accessible names to Die web component

**File:** `src/ui/components/dice/Die.js`

- Add `role="img"` to the die's shadow DOM root
- Set `aria-label` dynamically (e.g. "d6 showing 4") when value changes in `attributeChangedCallback`

### 2.7 FAQ toggle accessibility

**Files:** `src/help.html`, `src/js/faq-toggle.js`

- Add `aria-expanded="false"` to each FAQ question button
- Add `aria-controls` pointing to the answer element's `id`
- Toggle `aria-expanded` in the JavaScript click handler

### 2.8 Focus management on view transitions

**Files:** `src/ui/components/shared/header-bar.js`, `src/app/main.js`

- When switching between mode-selection, create-view, join-view, and room-view, move focus to the new view's heading or first interactive element
- Announce view changes via an `aria-live` region or by managing focus

---

## Phase 3: Medium - Visual Accessibility

### 3.1 Add `:focus` / `:focus-visible` styles for all interactive elements

**Files:** `src/css/common.css`, `src/css/app.css`, `src/css/landing.css`

Many elements have `:hover` styles but no `:focus` equivalent. Add matching focus styles to all of these:

| Selector | File | Line |
|----------|------|------|
| `.btn-primary:hover` | common.css | ~71 |
| `button:hover` | common.css | ~119 |
| `.btn-secondary:hover` | common.css | ~99 |
| `.qr-icon-btn:hover` | common.css | ~284 |
| `.mode-btn:hover` | app.css | ~190 |
| `.back-to-modes:hover` | app.css | ~272 |
| `.modal-close-btn:hover` | app.css | ~394 |
| `room-join .room-dice:hover` | app.css | ~513 |
| `room-join .btn-join:hover` | app.css | ~564 |
| `dice-config .color-btn:hover` | app.css | ~661 |
| `dice-config .color-option:hover` | app.css | ~705 |
| `peer-list .peer-item.can-drop:hover` | app.css | ~908 |
| `.back-link:hover` | app.css | ~1048 |
| `.faq-question:hover` | app.css | ~1161 |

Recommended approach: duplicate each `:hover` rule with `:focus-visible` so keyboard users see the same visual feedback.

### 3.2 Don't rely on color alone for status indicators

**File:** `src/css/app.css`, `src/ui/components/room/peer-list.js`

- Peer connection status (connected/connecting/reconnecting) uses colored dots only. Add text labels or icons alongside the color.
- Dice set indicators use colored dots only. Add the set name or a pattern.

### 3.3 Fix color contrast issues

| Element | File | Issue |
|---------|------|-------|
| `.site-footer p` (rgba white 70% on navy) | common.css:461 | Increase to 85-100% opacity |
| `.hero-note` (#888 on cream) | landing.css:148 | Darken to #666 or darker |
| `.author-info span` (#888 on white) | landing.css:321 | Darken to #666 or darker |

### 3.4 Fix small font sizes

| Element | File | Current | Target |
|---------|------|---------|--------|
| `.badge` | common.css:505 | 0.7rem (11.2px) | 0.75rem (12px) minimum |

### 3.5 Respect reduced-motion for all animations

**File:** `src/css/app.css`

The global reduced-motion query in `common.css` disables animations broadly, but verify these specific animations are covered:
- `dice-history .history-item` slideIn animation (line ~768)
- `peer-list .peer-status.connecting` pulse (line ~966)
- `peer-list .peer-status.reconnecting` pulse (line ~974)

**File:** `src/js/smooth-scroll.js`

Check `prefers-reduced-motion` before applying smooth scrolling:
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```

### 3.6 Mark decorative elements as aria-hidden

**Files:** `src/index.html`, `src/ui/components/shared/play-frame.js`

- Add `aria-hidden="true"` to decorative dice in the nav logo and hero section
- Add `aria-hidden="true"` to the corner decorations in `play-frame.js`

### 3.7 Improve form validation announcements

**File:** `src/ui/components/shared/username-input.js`

- Set `aria-invalid="true"` on the input when showing an error
- Clear `aria-invalid` when the error is dismissed

---

## Phase 4: Low Priority - Polish

### 4.1 Add `aria-current="page"` to navigation links

**Files:** All pages with nav elements

Mark the current page's navigation link with `aria-current="page"`.

### 4.2 Add print styles

**File:** `src/css/common.css`

Add basic `@media print` styles to hide non-essential UI (navigation, decorative elements) and ensure content is readable when printed.

### 4.3 Add `aria-atomic="true"` to toast container

**File:** `src/ui/components/shared/toast-container.js`

Ensures the entire toast message is re-read when content changes.

### 4.4 Improve back link text

**File:** `src/play/index.html`

Change `← Back` to `← Back to mode selection` for clearer context.

### 4.5 Add `role="log"` to demo event log

**File:** `src/demo.html`

The `#event-log` div should have `role="log"` and `aria-live="polite"`.

---

## Implementation Priority

| Phase | Effort | Impact | Summary |
|-------|--------|--------|---------|
| **Phase 1** | Large | Critical | Keyboard users currently cannot play the game at all |
| **Phase 2** | Medium | High | Screen reader users get no semantic information |
| **Phase 3** | Medium | Medium | Visual accessibility and focus indicators |
| **Phase 4** | Small | Low | Polish and best practices |

Phase 1 should be done first as it represents a complete blocker for keyboard-only users. Phases 2 and 3 can be worked on in parallel. Phase 4 items can be addressed incrementally.

---

## Testing Recommendations

- **Keyboard-only testing:** Tab through the entire app without a mouse. Every interactive element must be reachable and operable.
- **Screen reader testing:** Test with VoiceOver (macOS/iOS), NVDA (Windows), or Orca (Linux). All content and state changes should be announced.
- **Automated testing:** Run axe-core or Lighthouse accessibility audits on each page.
- **Zoom testing:** Zoom to 200% and verify all content remains visible and usable.
- **Reduced motion:** Enable `prefers-reduced-motion` and verify no animations play.
- **Color contrast:** Use browser DevTools or WebAIM contrast checker to validate all text meets WCAG AA (4.5:1 for normal text, 3:1 for large text).
