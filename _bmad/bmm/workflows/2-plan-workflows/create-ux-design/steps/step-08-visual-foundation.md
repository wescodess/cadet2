# Step 8: Design Tokens & System

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ✅ ALWAYS treat this as collaborative discovery between UX facilitator and stakeholder
- 📋 YOU ARE A UX FACILITATOR, not a content generator
- 💬 FOCUS on establishing the app-wide design tokens and system artifacts (colors, typography, spacing, motion, and output files)
- 🎯 COLLABORATIVE discovery, not assumption-based design
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- ⚠️ Present A/P/C menu after generating visual foundation content
- 💾 ONLY save when user chooses C (Continue)
- 📖 Update output file frontmatter, adding this step to the end of the list of stepsCompleted.
- 🚫 FORBIDDEN to load next step until C is selected

## COLLABORATION MENUS (A/P/C):

This step will generate content and present choices:

- **A (Advanced Elicitation)**: Use discovery protocols to develop deeper visual insights
- **P (Party Mode)**: Bring multiple perspectives to define visual foundation
- **C (Continue)**: Save the content to the document and proceed to next step

## PROTOCOL INTEGRATION:

- When 'A' selected: Read fully and follow: {project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml
- When 'P' selected: Read fully and follow: {project-root}/_bmad/core/workflows/party-mode/workflow.md
- PROTOCOLS always return to this step's A/P/C menu
- User accepts/rejects protocol changes before proceeding

## CONTEXT BOUNDARIES:

- Current document and frontmatter from previous steps are available
- Design system choice from step 6 provides component foundation and the active Stitch workspace
- Emotional response goals from step 4 inform visual decisions
- Focus on colors, typography, spacing, layout, motion, and persisted design-system artifacts

## YOUR TASK:

Establish the concrete design-token system, semantic rules, and exported design artifacts that the rest of the BMAD workflow must reuse.

## VISUAL FOUNDATION SEQUENCE:

### 1. Brand Guidelines And Token Inputs

Check for existing brand requirements:
"Do you have existing brand guidelines or a specific color palette I should follow? (y/n)

If yes, I'll extract and document your brand colors and create semantic color mappings.
If no, I'll generate theme options based on your project's personality and emotional goals from our earlier discussion."

### 2. Define Token Families

Define the token families that will become the source of truth:

- Color
- Typography
- Spacing
- Radius
- Shadow / elevation
- Motion / timing

These are app-wide tokens, not one-off styling notes.

### 3. Define Typography System

Establish the typographic foundation:
"**Typography Questions:**

- What should the overall tone feel like? (Professional, friendly, modern, classic?)
- How much text content will users read? (Headings only? Long-form content?)
- Any accessibility requirements for font sizes or contrast?
- Any brand fonts we must use?

**Typography Strategy:**

- Choose primary and secondary typefaces
- Establish type scale (h1, h2, h3, body, etc.)
- Define line heights and spacing relationships
- Consider readability and accessibility"

### 4. Establish Spacing, Layout, And Motion Foundation

Define the structural foundation:
"**Spacing and Layout Foundation:**

- How should the overall layout feel? (Dense and efficient? Airy and spacious?)
- What spacing unit should we use? (4px, 8px, 12px base?)
- How much white space should be between elements?
- Should we use a grid system? If so, what column structure?

**Layout Principles:**

- [Layout principle 1 based on product type]
- [Layout principle 2 based on user needs]
- [Layout principle 3 based on platform requirements]"

### 5. Generate Persisted Design-System Artifacts

This step must explicitly define the artifacts that will be produced and reused:
"**Design-System Outputs:**"

- `DESIGN.md` as the semantic source of truth
- `design-tokens.json` as the machine-readable token export
- `design-tokens.css` as the implementation-facing CSS variable export
- Optional exported style guide / token registry references tied to the active Stitch workspace

Use the `stitch-design-md` skill to keep `DESIGN.md` aligned with the current Stitch project, and use Stitch token/export capabilities to keep the implementation-facing artifacts aligned with the approved design foundation.

This foundation will ensure consistency across all later UX and story-level work."

### 6. Generate Design Token Content

Prepare the content to append to the document:

#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

```markdown
## Design Tokens & Design System

### Stitch Design System Source of Truth

[How DESIGN.md will describe the design system]

### Token Families

[Color, typography, spacing, radius, shadow, and motion tokens]

### Token Export Artifacts

[Paths and usage for DESIGN.md, design-tokens.json, design-tokens.css, and any related exports]

### Color System

[Color system strategy based on conversation]

### Typography System

[Typography system strategy based on conversation]

### Spacing & Layout Foundation

[Spacing and layout foundation based on conversation]

### Accessibility Considerations

[Accessibility considerations based on conversation]
```

### 7. Present Content and Menu

Show the generated visual foundation content and present choices:
"I've established the design-token system for {{project_name}}. This provides the reusable source of truth for consistent design, approved variants, and frontend implementation.

**Here's what I'll add to the document:**

[Show the complete markdown content from step 6]

**What would you like to do?**
[A] Advanced Elicitation - Let's refine our visual foundation
[P] Party Mode - Bring design perspectives on visual choices
[C] Continue - Save this to the document and move to design directions

### 8. Handle Menu Selection

#### If 'A' (Advanced Elicitation):

- Read fully and follow: {project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml with the current visual foundation content
- Process the enhanced visual insights that come back
- Ask user: "Accept these improvements to the visual foundation? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'P' (Party Mode):

- Read fully and follow: {project-root}/_bmad/core/workflows/party-mode/workflow.md with the current visual foundation
- Process the collaborative visual insights that come back
- Ask user: "Accept these changes to the visual foundation? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'C' (Continue):

- Append the final content to `{planning_artifacts}/ux-design-specification.md`
- Update frontmatter: append step to end of stepsCompleted array, set `lastStep: 8`, and update `designSystemArtifacts` with the token output references
- Load `{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-ux-design/steps/step-09-design-directions.md`

## APPEND TO DOCUMENT:

When user selects 'C', append the content directly to the document using the structure from step 6.

## SUCCESS METRICS:

✅ Brand guidelines assessed and incorporated if available
✅ Concrete token families defined
✅ DESIGN.md and token export artifacts explicitly planned
✅ Color system established with accessibility consideration
✅ Typography system defined with appropriate hierarchy
✅ Spacing, layout, and motion foundations created
✅ Design-system artifact strategy documented
✅ A/P/C menu presented and handled correctly
✅ Content properly appended to document when C selected

## FAILURE MODES:

❌ Not checking for existing brand guidelines first
❌ Not defining reusable token families
❌ Not documenting DESIGN.md or token export artifacts
❌ Color palette not aligned with emotional goals
❌ Typography not suitable for content type or readability needs
❌ Spacing system not appropriate for content density
❌ Missing accessibility considerations
❌ Not presenting A/P/C menu after content generation
❌ Appending content without user selecting 'C'

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## NEXT STEP:

After user selects 'C' and content is saved to document, load `{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-ux-design/steps/step-09-design-directions.md` to generate design direction mockups.

Remember: Do NOT proceed to step-09 until user explicitly selects 'C' from the A/P/C menu and content is saved!
