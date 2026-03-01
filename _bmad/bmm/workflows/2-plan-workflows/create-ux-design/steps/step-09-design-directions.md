# Step 9: Approved Variant Directions

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ✅ ALWAYS treat this as collaborative discovery between UX facilitator and stakeholder
- 📋 YOU ARE A UX FACILITATOR, not a content generator
- 💬 FOCUS on generating and evaluating approved variant directions using the locked Stitch-first design foundation
- 🎯 COLLABORATIVE exploration, not assumption-based design
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- ⚠️ Present A/P/C menu after generating design direction content
- 💾 Generate at least 3 variants and require explicit approval before continuing
- 📖 Update output file frontmatter, adding this step to the end of the list of stepsCompleted.
- 🚫 FORBIDDEN to load next step until C is selected

## COLLABORATION MENUS (A/P/C):

This step will generate content and present choices:

- **A (Advanced Elicitation)**: Use discovery protocols to develop deeper design insights
- **P (Party Mode)**: Bring multiple perspectives to evaluate design directions
- **C (Continue)**: Save the content to the document and proceed to next step

## PROTOCOL INTEGRATION:

- When 'A' selected: Read fully and follow: {project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml
- When 'P' selected: Read fully and follow: {project-root}/_bmad/core/workflows/party-mode/workflow.md
- PROTOCOLS always return to this step's A/P/C menu
- User accepts/rejects protocol changes before proceeding

## CONTEXT BOUNDARIES:

- Current document and frontmatter from previous steps are available
- Design token system from step 8 provides the locked visual foundation
- Core experience from step 7 informs layout and interaction design
- Focus on exploring different visual directions while preserving the shared design system

## YOUR TASK:

Generate approved variant directions showing at least 3 different visual approaches for the product while preserving the shared design system and token set.

## DESIGN DIRECTIONS SEQUENCE:

### 1. Determine Variant Scope

Branch based on frontmatter `uxScopeMode`:

- If `uxScopeMode = app-foundation`, generate variants for the full app shell / global layout structure.
- If `uxScopeMode = feature-scope`, generate variants only for the feature surface being designed.

This branch is mandatory because app-level work must approve the shell here, while feature-only work should stay scoped.

### 2. Generate At Least 3 Variants

Create diverse visual explorations:
"I'll generate at least 3 design direction variants exploring:

- Different layout approaches and information hierarchy
- Various interaction patterns and visual weights
- Alternative applications of the already-approved token system
- Different density and spacing approaches
- Various navigation and component arrangements

Each variant will show a complete vision for {{project_name}} with the same shared design system applied."

### 3. Generate Through The Active Stitch Foundation

These variants must be generated through the active Stitch workspace and design-system context, not from ad hoc standalone styling.

Expected generation path:

- Structure prompts with `stitch-enhance-prompt`
- Reuse context with `apply_design_context`
- Generate with `generate_screen_from_text`, `generate_variants`, or `batch_generate_screens`
- Compare with `compare_designs`
- Validate with `analyze_accessibility` and `generate_responsive_variant`

If supporting comparison files are created (HTML, screenshots, exports), record them as part of the artifact registry.

### 4. Present Design Exploration Framework

Guide evaluation criteria:
"As you explore the design directions, look for:

✅ **Token Consistency** - Does the variant preserve our shared design system?
✅ **Layout Intuitiveness** - Which information hierarchy matches your priorities?
✅ **Interaction Style** - Which interaction style fits your core experience?
✅ **Visual Weight** - Which visual density feels right for your brand?
✅ **Navigation Approach** - Which navigation pattern matches user expectations?
✅ **Brand Alignment** - Which direction best supports your emotional goals?

Take your time exploring - this is a crucial decision that will guide all our design work!"

### 5. Facilitate Explicit Variant Approval

Help user choose or combine elements:
"After exploring all the design directions:

**Which approach resonates most with you?**

- Pick a favorite direction as-is
- Combine elements from multiple directions
- Request modifications to any direction
- Use one direction as a base and iterate

**Tell me:**

- Which layout feels most intuitive for your users?
- Which visual weight matches your brand personality?
- Which interaction style supports your core experience?
- Are there elements from different directions you'd like to combine?"

### 6. Document The Approved Direction

Capture the chosen approach:
"Based on your exploration, I'm understanding your design direction preference:

**Chosen Direction:** [Direction number or combination]
**Key Elements:** [Specific elements you liked]
**Modifications Needed:** [Any changes requested]
**Rationale:** [Why this direction works for your product]

This will become our approved direction moving forward. We cannot continue until one direction (or a requested iteration) is explicitly chosen."

### 7. Generate Design Direction Content

Prepare the content to append to the document:

#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

```markdown
## Variant Exploration

### Variants Generated

[Summary of at least 3 generated variants]

## Selected Direction

### Approved Variant

[Approved variant ID / label based on conversation]

### Design Rationale

[Rationale for design direction choice based on conversation]

### Implementation Approach

[Implementation approach based on chosen direction]
```

### 8. Present Content and Menu

Show the generated design direction content and present choices:
"I've documented the approved variant direction for {{project_name}}. This direction will guide all detailed design work and all downstream story creation for related UI surfaces.

**Here's what I'll add to the document:**

[Show the complete markdown content from step 6]

**What would you like to do?**
[A] Advanced Elicitation - Let's refine our design direction
[P] Party Mode - Bring different perspectives on visual choices
[C] Continue - Save this to the document and move to user journey flows

### 9. Handle Menu Selection

#### If 'A' (Advanced Elicitation):

- Read fully and follow: {project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml with the current design direction content
- Process the enhanced design insights that come back
- Ask user: "Accept these improvements to the design direction? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'P' (Party Mode):

- Read fully and follow: {project-root}/_bmad/core/workflows/party-mode/workflow.md with the current design direction
- Process the collaborative design insights that come back
- Ask user: "Accept these changes to the design direction? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'C' (Continue):

- Append the final content to `{planning_artifacts}/ux-design-specification.md`
- Update frontmatter: append step to end of stepsCompleted array, set `lastStep: 9`, and persist `selectedVariantId` / `selectedVariantLabel`
- Load `{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-ux-design/steps/step-10-user-journeys.md`

## APPEND TO DOCUMENT:

When user selects 'C', append the content directly to the document using the structure from step 6.

## SUCCESS METRICS:

✅ At least 3 variants generated for the correct scope
✅ App-foundation runs generate shell/layout variants
✅ Feature-scope runs generate only feature-level variants
✅ Design evaluation criteria clearly established
✅ User able to explore and compare directions effectively
✅ Explicit variant approval captured before continuation
✅ A/P/C menu presented and handled correctly
✅ Content properly appended to document when C selected

## FAILURE MODES:

❌ Generating fewer than 3 variants
❌ Generating the wrong scope (feature vs full app shell)
❌ Design directions not aligned with the locked design-token system
❌ Not providing clear evaluation criteria
❌ Allowing the workflow to continue without explicit approval
❌ Not presenting A/P/C menu after content generation
❌ Appending content without user selecting 'C'

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## NEXT STEP:

After user selects 'C' and content is saved to document, load `{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-ux-design/steps/step-10-user-journeys.md` to design user journey flows.

Remember: Do NOT proceed to step-10 until user explicitly selects 'C' from the A/P/C menu and content is saved!
