<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: explaincodebasepls
description: Turn any codebase into navigable documentation — instantly.
---

# Design System: explaincodebasepls

## 1. Overview

**Creative North Star: "The Dark Cartographer"**

This is a precision tool for the dark: a developer who doesn't know a codebase yet but needs to. The UI is a frame, not a feature. It should feel like switching on a high-fidelity instrument — everything purposeful, nothing decorative, the output visible at a glance. The aesthetic is deep-dark with one cutting neon accent: not the overexposed cyan-on-black of a hacker movie, but something rarer — a single wavelength that actually carries meaning. Its rarity is its signal value.

Typography is the primary structural force. The pairing of a sharp display face with a monospaced body isn't just aesthetic — it signals that this is a tool built by and for people who read source code. Every label, heading, and body line should feel typeset with intent. Motion is fast and state-driven: the interface doesn't animate to be pretty; it animates to confirm state. Nothing bounces, nothing eases in from oblivion.

This system rejects: the overexposed cyan-on-black hacker aesthetic (too borrowed, not earned), minimal brutalism (wrong energy — this product needs depth and hierarchy), generic SaaS cream (off-white cards, pastel accents, friendly illustrations), and dark navy corporate (GitHub Copilot stiffness).

**Key Characteristics:**
- Deep, slightly chromatic void — never pure black, always faintly hued toward the accent
- One neon accent, used on ≤15% of any screen; its scarcity is its meaning
- Display/mono type pairing — designed authority meets developer-native readability
- State-driven motion only: every animation has a reason, nothing decorates
- Information-rich but never claustrophobic — density with deliberate breathing room
- Zero decoration: the codebase output IS the interface

## 2. Colors

The palette is dark-committed: a deep, slightly chromatic void with a single neon accent used sparingly enough that it functions as signal rather than aesthetic. The accent hue must pass the category-reflex test — it should not be the obvious answer for "developer tool."

### Primary
- **Electric Accent** `[to be resolved during implementation — anchor: vivid amber-orange (~oklch(72% 0.22 55)) or electric violet (~oklch(68% 0.28 295)); avoid cyan-green entirely]`: The one accent color. Active states, primary CTAs, key output highlights. Appears on ≤15% of any screen. When the eye lands here, it means something.

### Neutral
- **Void Surface** `[to be resolved — anchor: very dark, OKLCH lightness ~8–10%, chroma 0.005–0.01 tinted toward accent hue]`: Primary background. Not pure black — a tinted void.
- **Elevated Surface** `[to be resolved — 4–7% lighter than Void Surface, same hue tint]`: Cards, panels, sidebars. One step above the floor.
- **Muted Surface** `[to be resolved — border and divider level, barely distinguishable from Elevated]`: Structural separators, rule elements, idle borders.
- **Body Text** `[to be resolved — OKLCH lightness ~88–92%, slight chroma toward accent; WCAG AA minimum against Void Surface]`: Primary readable text.
- **Muted Text** `[to be resolved — ~55–65% lightness equivalent of Body Text]`: Secondary labels, metadata, timestamps, file path components.

### Named Rules
**The One Signal Rule.** The neon accent is used for one thing at a time. It is not ambient decoration — it is a pointer. When the eye lands on it, it should mean something. If every panel has a neon border, it means nothing.

**The Tinted Void Rule.** The darkest surface is never pure black (`#000000`). It carries a trace of the accent hue at near-zero chroma (OKLCH chroma 0.005–0.01). Invisible at a glance, present enough to prevent the sterile "default dark mode" feel.

**The Category-Reflex Check.** Before finalizing the accent hue: ask if someone could guess it from "developer tool" alone. Cyan-green = fail. Electric blue = borderline. Amber-orange or vivid violet = passes. The accent must be chosen, not inherited.

## 3. Typography

**Display Font:** Sharp, geometric display sans-serif — `[to be chosen at implementation; candidates: Space Grotesk, Monument Grotesk, Neue Haas Grotesk Display, or a condensed technical face]`
**Body / Code Font:** Monospace — `[to be chosen at implementation; candidates: Geist Mono, Berkeley Mono, Commit Mono, JetBrains Mono]`

**Character:** The pairing sets expectation before the user reads a word. Display for headings says "this was designed." Mono for body says "this is a developer's tool." Together they signal precision without cosplay — a tool that takes itself seriously without performing terminal aesthetics.

### Hierarchy
- **Display** (heavy/black weight, large clamped size, tight line-height ~0.95): Page-level titles and hero headings only. Rare — its scarcity is its weight.
- **Headline** (semibold, ~2rem, line-height ~1.1): Section headers, feature labels, major UI groupings.
- **Title** (medium weight, ~1.25rem, line-height ~1.3): Panel headings, card titles, sidebar section labels.
- **Body** (monospace regular, ~0.875rem, line-height ~1.65): Primary reading text, documentation output, explanations. Line length capped at 70ch.
- **Label** (monospace, ~0.7rem, uppercase, letter-spacing ~0.06em): Metadata, tags, status indicators, file paths, timestamps. These are the nervous system of the UI.

### Named Rules
**The Mono-Body Rule.** Body text is monospaced — not for aesthetic reasons but because the content is code-adjacent. Reading mono documentation about code is native; it prevents the register shift when eyes move between the tool output and the editor.

**The Hierarchy Must Work Rule.** Minimum 1.5× size ratio between adjacent hierarchy levels. At Title (1.25rem) and Body (0.875rem), this is met. Flat type hierarchies are invisible design failures — every level must be distinguishable without color or weight alone.

## 4. Elevation

Flat by default. Depth is expressed through surface tinting (darker = recessed, lighter = elevated), not shadows. Shadow is reserved exclusively for floating elements — tooltips, dropdowns, command palette. Even then: diffuse, large-radius, and color-matched to the dark palette rather than neutral black.

### Shadow Vocabulary
- **Float** `[to be resolved — diffuse box-shadow with large radius (~40px), very low opacity (~0.5), tinted toward accent hue or the dark surface color]`: Command palette, dropdown menus, detached tooltip layers. Used nowhere else.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are tonally differentiated, not shadow-differentiated. The Elevated Surface token lifts panels; shadows appear only for floating elements that break out of the layout plane. This prevents the "always-floating card" aesthetic that makes interfaces feel heavy and fragmented.

## 5. Components

No components documented in seed mode — nothing to extract yet.

Re-run `/impeccable document` once you have buttons, inputs, and layout scaffolding in code. The document pass will extract real tokens and generate the `.impeccable/design.json` sidecar with rendered component previews.

## 6. Do's and Don'ts

### Do:
- **Do** use the neon accent to mark exactly one thing at a time — active state, primary action, or key output highlight. Its scarcity is its meaning.
- **Do** tint every neutral surface toward the accent hue at near-zero OKLCH chroma (0.005–0.01). Pure `#000000` / `#ffffff` are forbidden without exception.
- **Do** validate every text/background pair against WCAG AA (4.5:1 body, 3:1 large text) before shipping. Neon accents on dark backgrounds fail more often than expected — check at implementation, not at polish.
- **Do** use monospace for any text that lives near code output: labels, file paths, identifiers, documentation body.
- **Do** animate only in response to state change. Every transition answers a question the user didn't have to ask.
- **Do** size typography at minimum 1.5× ratio between adjacent hierarchy levels. Flat scales are invisible failures.
- **Do** reference Warp, Raycast, and Zed as the aesthetic register: precision dark UI where the tool gets out of the way.

### Don't:
- **Don't** use cyan-green or electric blue as the neon accent. That palette reads as "hacker movie" before the user reads a word. The accent hue must pass the category-reflex test: it should not be the obvious answer for "developer tool."
- **Don't** add a second or third accent color. One signal, always. Multiple neon colors are noise.
- **Don't** use glassmorphism (backdrop-filter blur + semi-transparent panels) decoratively. It is a substitute for real surface differentiation and reads as 2021-era aesthetic.
- **Don't** animate layout properties — height, width, margin, padding. Transitions belong on `opacity`, `transform`, and `color` only.
- **Don't** use side-stripe borders (a colored `border-left` > 1px on cards or callouts). Rewrite with background tints, full borders, or no border.
- **Don't** apply gradient text (`background-clip: text` with a gradient). Emphasis through weight or size only.
- **Don't** build identical card grids — same-size cards with icon + heading + body text, repeated. Differentiate by hierarchy.
- **Don't** use the hero-metric template (big number, small label, gradient accent). SaaS cliché — wrong register entirely.
- **Don't** make it feel like minimal brutalism: deliberately raw mono-font aesthetics, aggressively stripped-down, ugly by design. This product needs depth and hierarchy.
- **Don't** make it feel like Notion, GitHub Copilot Chat, or any "AI assistant" product. This is a sharp developer tool, not a helpful chatbot.
- **Don't** make the dark navy corporate move: GitHub-adjacent stiff professionalism that signals "enterprise integration" rather than "precision instrument."
