# Design System: cadet2 UX App Foundation
**Project ID:** 6257021077077987630
**Approved Direction:** Comparison Workspace (Desktop + Mobile Pairing)
**Reference Screens:** Desktop `3a4bf4f2083e46d89b219ab72563bf1a`, Mobile `2d7501846dd44d8a8bc52b9742494a71`, Tablet `dc826e99abc34ba29c8a985158de51e9`

## 1. Visual Theme & Atmosphere

cadet2 should feel like a calm decision-support workspace built for high-stakes planning. The visual tone is measured, trustworthy, and structured rather than flashy, bureaucratic, or overly clinical.

The atmosphere should read as:
airy but not sparse,
analytical but not intimidating,
and supportive without becoming soft or vague.

The interface should give users the sense that the system is helping them organize a consequential decision into a sequence they can understand and act on. Dense information is acceptable, but only when it is grouped clearly and introduced in layers.

Desktop should feel like a composed planning console with room for comparison, rationale, and next actions. Mobile should feel like the same system translated into a stacked, guided sequence rather than a cut-down afterthought.

## 2. Color Palette & Roles

- **Trust Navy (#234c76):** The core brand and action color. Use for primary actions, active navigation, and the most important recommendation framing.
- **Supportive Sage (#4d7a72):** The constructive progress and confidence color. Use for progress states, successful completion, and high-confidence signals.
- **Measured Sand (#c89b52):** The caution-without-panic accent. Use for warnings, guidance banners, and non-critical urgency cues.
- **Deep Charcoal Slate (#18232d):** The principal dark text and structural grounding color. Use for headings, dense body text, and dark supporting panels.
- **Cool Advisory Gray (#66737f):** The secondary information color. Use for metadata, helper text, and lower-emphasis support copy.
- **Cloud Surface (#f7f8fa):** The primary app background in light mode. Use for the default page canvas and low-friction neutral surfaces.
- **Pure Planning White (#ffffff):** The elevated light surface. Use for cards, panels, and modules that need stronger separation.
- **Night Surface (#14191e):** The primary dark-mode background. Use as the main dark canvas without dropping into pure black.
- **Raised Night Panel (#1b232c):** The dark elevated surface. Use for cards and content groups in dark mode.
- **Quiet Border Mist (#d9dfe5):** The light-mode border and separator tone. Use for dividers, card edges, and low-contrast structure.
- **Dark Border Steel (#2c3742):** The dark-mode border and separator tone. Use to preserve visible structure in dense dark layouts.
- **Reserved Destructive Clay (#bf5f52):** The destructive state color. Use only for true error, invalid action, or consequential removal states.

## 3. Typography Rules

The primary typeface is **Public Sans**. It should be used across interface, body, and data-heavy screens because it stays legible under density and retains a dependable, modern character.

Typography should feel:
precise,
clear,
and operationally trustworthy.

Use strong hierarchy, but avoid editorial drama. Headings should frame decisions and sections, not act as brand decoration.

- **Display:** Strong, controlled framing for key page-level moments and summary bands.
- **H1:** Primary page heading for major workspaces and top-level surfaces.
- **H2:** Section framing for primary content groups such as recommendations, evidence, and action modules.
- **H3:** Subsection framing for cards, panels, and grouped decision units.
- **Body:** Comfortable default reading size for instructions, explanations, and primary descriptive content.
- **Secondary Body:** Slightly reduced emphasis for evidence notes, timestamps, and low-priority explanatory text.
- **Caption / Metadata:** Compact but readable text for labels, helper copy, and supporting detail.
- **Data Labels:** Tight, legible labels for score indicators, confidence badges, and structured comparison metrics.

Line height should favor readability over compression. Muted text should never become so small or low-contrast that meaning is lost.

## 4. Component Stylings

* **Buttons:** Use a clear hierarchy. Primary buttons are solid Trust Navy with light text. Secondary buttons are quieter, often bordered or lightly tinted. Tertiary actions should read as low-friction text actions. Keep corners subtly rounded to gently rounded, never sharp or playful. Loading and disabled states must remain explicit.

* **Cards / Containers:** Use clean white surfaces in light mode and raised dark panels in dark mode. Cards should have subtly rounded to gently rounded corners, restrained borders, and whisper-soft depth. Use cards to create scannable, bounded decision units rather than decorative boxes.

* **Inputs / Forms:** Inputs should feel structured and calm. Use clear labels, visible boundaries, and inline explanatory help where the answer affects recommendation quality. Validation should appear close to the field and preserve trust by explaining what is wrong and why it matters.

* **Comparison Modules:** Treat comparison areas as composed decision surfaces, not raw data grids. Use visible hierarchy between top recommendation framing, pathway cards or rows, blockers, and evidence context. Keep the logic of "available now," "blocked but close," and "longer-horizon path" visually separable.

* **Evidence / Guidance Panels:** Use clearly bounded supporting panels that can hold confidence, assumptions, freshness, and caveats without competing with the primary recommendation surface. These panels should feel informative and stabilizing, not noisy.

* **Action Queues:** Present next actions as practical, user-owned steps. Use strong ordering, clear urgency labels, and obvious completion states. These modules should make the product feel like a planning companion, not just an evaluator.

## 5. Layout Principles

Use an 8px spacing system as the structural base. The layout should feel ordered and breathable, with enough space to prevent overload while still supporting dense, information-rich decision making.

Core layout rules:

- Group related decisions together in clearly bounded regions.
- Show one layer of complexity at a time.
- Keep recommendation rationale close to recommendation choice.
- Preserve orientation through persistent headers, progress framing, and return-to-context patterns.

**Desktop**
Use multi-column layouts for richer comparison and contextual support. Desktop should support:
side navigation,
summary bands,
comparison surfaces,
and adjacent evidence or action panels.

**Tablet**
Use split-review layouts with touch-friendly spacing. Tablet should reduce concurrent density compared with desktop while preserving the same information architecture.

**Mobile**
Use stacked sections with progressive disclosure. Mobile should preserve the same content logic as desktop, but the order must prioritize:
top recommendation clarity,
blockers,
trust context,
and immediate next actions.

Across all breakpoints, the product should feel like the same planning system. The composition changes by device, but the hierarchy, semantics, and trust signals remain consistent.
