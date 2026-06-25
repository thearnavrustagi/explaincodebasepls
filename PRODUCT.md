# Product

## Register

product

## Users

Developers encountering an unfamiliar codebase — onboarding to a new repo, auditing a system they didn't build, or picking up work after a long gap. They arrive with questions, not with time. They need orientation fast: what does this thing do, how is it structured, where does the interesting logic live.

## Product Purpose

A tool that generates detailed, navigable documentation from a codebase so developers can understand it deeply without reading every file. The output should feel like a technical deep-dive written by someone who already knows the system — not a surface-level summary. Success means a developer can go from "I've never seen this repo" to "I understand the architecture and could start contributing" without a single senior engineer walkthrough.

## Brand Personality

Sharp, technical, futuristic. Three words: **precise, illuminating, forward**.

The emotional goal is the feeling of a powerful tool that makes you more capable — not a toy, not a dashboard. It should feel like wearing night-vision goggles on an unfamiliar codebase. Energy: quiet confidence, not spectacle.

## Anti-references

- **Cyberpunk cliché**: Cyan-on-black scanline aesthetics, glitch effects, terminal-green rain. The neon is real, but it has to be earned through precision — not borrowed from a 2019 hacker movie.
- **Minimal brutalism**: Deliberately raw, mono-font, stripped-down. Wrong register — this product needs depth and hierarchy, not aesthetic austerity.
- **Generic SaaS cream**: Off-white, rounded cards, pastel accents, friendly illustrations. The antithesis of the target user's expectation.
- **Dark navy corporate**: GitHub Copilot / Atlassian territory. Professional but stiff — signals "enterprise integration" not "sharp tool."

## Design Principles

1. **The codebase is the hero.** The UI exists to surface insight, not to be noticed. Every chrome element competes with the content — cut it unless it earns its place.
2. **Precision over decoration.** Neon color and futuristic aesthetic are used to carry meaning (highlight, state, hierarchy) — never as ambient decoration. Restraint is what makes it feel refined rather than kitsch.
3. **Depth without overwhelm.** Complex outputs (file trees, architecture maps, doc sections) should feel navigable and layered, not flattened into a wall of text or fragmented into too many panels.
4. **Developer respect.** No hand-holding microcopy, no empty-state cartoons. The product assumes the user is technical. Labels, errors, and prompts should read like internal documentation — direct, specific, useful.
5. **Speed as a design value.** Every interaction (loading, navigation, search) should feel instant or close to it. Skeleton states, streaming, and optimistic updates are not nice-to-haves — they're part of what "sharp" means.

## Accessibility & Inclusion

WCAG AA baseline. High-contrast requirements interact with neon palette — all accent colors must be validated against dark backgrounds at AA contrast ratios. Keyboard navigation on all interactive elements. No motion by default; animate only with `prefers-reduced-motion` checks.
