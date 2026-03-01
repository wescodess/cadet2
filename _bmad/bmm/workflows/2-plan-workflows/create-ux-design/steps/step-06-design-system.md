# Step 6: Stitch Workspace & Design System Foundation

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ✅ ALWAYS treat this as collaborative discovery between UX facilitator and stakeholder
- 📋 YOU ARE A UX FACILITATOR, not a content generator
- 💬 FOCUS on establishing the Stitch workspace and app-wide design system foundation
- 🎯 COLLABORATIVE decision-making, not recommendation-only
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- ⚠️ Present A/P/C menu after generating Stitch workspace and design system foundation content
- 💾 ONLY save when user chooses C (Continue)
- 📖 Update output file frontmatter, adding this step to the end of the list of stepsCompleted.
- 🚫 FORBIDDEN to load next step until C is selected

## COLLABORATION MENUS (A/P/C):

This step will generate content and present choices:

- **A (Advanced Elicitation)**: Use discovery protocols to develop deeper design system insights
- **P (Party Mode)**: Bring multiple perspectives to evaluate design system options
- **C (Continue)**: Save the content to the document and proceed to next step

## PROTOCOL INTEGRATION:

- When 'A' selected: Read fully and follow: {project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml
- When 'P' selected: Read fully and follow: {project-root}/_bmad/core/workflows/party-mode/workflow.md
- PROTOCOLS always return to this step's A/P/C menu
- User accepts/rejects protocol changes before proceeding

## CONTEXT BOUNDARIES:

- Current document and frontmatter from previous steps are available
- Platform requirements from step 3 inform design system choice
- Inspiration patterns from step 5 guide design system selection
- Focus on choosing a reusable Stitch-first foundation for consistent design

## YOUR TASK:

Establish the Stitch workspace, choose the reusable design system foundation, and document how later steps must generate tokens and variants.

## DESIGN SYSTEM CHOICE SEQUENCE:

### 1. Resolve The Stitch Workspace

Before discussing components, establish or reuse the Stitch workspace:
"For {{project_name}}, we need a single Stitch workspace that becomes the source of truth for design generation.

- First check whether a workspace project is already bound.
- If one exists, reuse it and record the current project ID.
- If not, create a new project, bind it, and record the project ID.
- If this is brownfield and screens already exist, review them before choosing the foundation.

This project ID must be saved to frontmatter as `stitchProjectId`, and `stitchWorkspaceBound` should reflect whether the workspace is now connected."

### 2. Choose The Design System Foundation

Choose the reusable design system strategy within that workspace:
"For {{project_name}}, we still need to decide whether our foundation is:

- Primarily custom
- Based on an established system
- Based on a themeable system

But this decision now exists inside our Stitch workflow, because later steps must generate tokens, style guides, and approved variants from the same source."

### 3. Define The Required Stitch Capabilities

Document that the UX workflow must use the available Stitch capabilities as they become relevant:

- Workspace/project resolution: `get_workspace_project`, `list_projects`, `create_project`, `get_project`, `set_workspace_project`
- Existing screen review: `list_screens`, `get_screen`, `fetch_screen_image`, `fetch_screen_code`
- Design-context extraction: `extract_design_context`, `extract_components`, `apply_design_context`
- Token generation and export: `generate_design_tokens`, `export_design_system`, `generate_style_guide`
- Variant generation and comparison: `generate_screen_from_text`, `generate_variants`, `batch_generate_screens`, `compare_designs`
- Accessibility and responsive validation: `analyze_accessibility`, `generate_responsive_variant`

The goal here is not to fire tools immediately without reason, but to commit to a Stitch-first process where the same workspace and design system drive the rest of the workflow.

### 4. Finalize The Foundation Decision

Confirm and document the decision:
"Based on our analysis, the recommended foundation for {{project_name}} is [Design System Choice], running through Stitch project [Project ID].

**Rationale:**

- [Reason 1 based on project needs]
- [Reason 2 based on constraints]
- [Reason 3 based on team considerations]

**Next Steps:**

- Use this workspace as the design source of truth
- Generate app-wide design tokens in the next visual system step
- Reuse this foundation when we generate and approve variants"

### 5. Generate Design System Content

Prepare the content to append to the document:

#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

```markdown
## Stitch Workspace

### Project Binding

[How the Stitch workspace was resolved or created]

### Workspace Reuse Strategy

[How existing screens or brownfield assets will be reused]

## Design System Foundation

### 1.1 Design System Choice

[Design system choice based on conversation]

### Rationale for Selection

[Rationale for design system selection based on conversation]

### Implementation Approach

[Implementation approach based on chosen system]

### Customization Strategy

[Customization strategy based on project needs]
```

### 6. Present Content and Menu

Show the generated design system content and present choices:
"I've documented the Stitch workspace and design system foundation for {{project_name}}. This foundation will ensure consistency and speed up later token generation and approved variant work.

**Here's what I'll add to the document:**

[Show the complete markdown content from step 6]

**What would you like to do?**
[A] Advanced Elicitation - Let's refine our design system decision
[P] Party Mode - Bring technical perspectives on design systems
[C] Continue - Save this to the document and move to defining experience

### 7. Handle Menu Selection

#### If 'A' (Advanced Elicitation):

- Read fully and follow: {project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml with the current design system content
- Process the enhanced design system insights that come back
- Ask user: "Accept these improvements to the design system decision? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'P' (Party Mode):

- Read fully and follow: {project-root}/_bmad/core/workflows/party-mode/workflow.md with the current design system choice
- Process the collaborative design system insights that come back
- Ask user: "Accept these changes to the design system decision? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'C' (Continue):

- Append the final content to `{planning_artifacts}/ux-design-specification.md`
- Update frontmatter: append step to end of stepsCompleted array, set `lastStep: 6`, and persist `stitchProjectId` / `stitchWorkspaceBound`
- Load `{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-ux-design/steps/step-07-defining-experience.md`

## APPEND TO DOCUMENT:

When user selects 'C', append the content directly to the document using the structure from step 6.

## SUCCESS METRICS:

✅ Stitch workspace resolved or created and documented
✅ Design system options clearly presented and explained
✅ Specific design system chosen with clear rationale
✅ Workspace reuse strategy defined for brownfield or existing screens
✅ Downstream token and variant generation expectations documented
✅ A/P/C menu presented and handled correctly
✅ Content properly appended to document when C selected

## FAILURE MODES:

❌ Not resolving the Stitch workspace before moving on
❌ Not explaining design system concepts clearly
❌ Rushing to recommendation without understanding requirements
❌ Not considering technical constraints or team capabilities
❌ Choosing design system without clear rationale
❌ Not documenting how the workspace and foundation will be reused in later steps
❌ Not presenting A/P/C menu after content generation
❌ Appending content without user selecting 'C'

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## NEXT STEP:

After user selects 'C' and content is saved to document, load `{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-ux-design/steps/step-07-defining-experience.md` to define the core user interaction.

Remember: Do NOT proceed to step-07 until user explicitly selects 'C' from the A/P/C menu and content is saved!
