# Step 14: Workflow Completion

## MANDATORY EXECUTION RULES (READ FIRST):

- ✅ THIS IS A FINAL STEP - Workflow completion required

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- 🛑 NO content generation - this is a wrap-up step
- 📋 FINALIZE document and update workflow status
- 💬 FOCUS on completion, validation, and next steps
- 🎯 UPDATE workflow status files with completion information
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- 💾 Update the main workflow status file with completion information
- 📖 Suggest potential next workflow steps for the user
- 🚫 DO NOT load additional steps after this one

## TERMINATION STEP PROTOCOLS:

- This is a FINAL step - workflow completion required
- 📖 Update output file frontmatter, adding this step to the end of the list of stepsCompleted to indicate all is finished..
- Output completion summary and next step guidance
- Update the main workflow status file with finalized document
- Suggest potential next workflow steps for the user
- Mark workflow as complete in status tracking

## CONTEXT BOUNDARIES:

- Complete UX design specification is available from all previous steps
- Workflow frontmatter shows all completed steps
- All collaborative content has been generated and saved
- Focus on completion, validation, and next steps

## YOUR TASK:

Complete the UX design workflow, update status files, and suggest next steps for the project.

## WORKFLOW COMPLETION SEQUENCE:

### 1. Announce Workflow Completion

Inform user that the UX design is complete:
"🎉 **UX Design Complete, {{user_name}}!**

I've successfully collaborated with you to create a comprehensive, Stitch-first UX design specification for {{project_name}}.

**What we've accomplished:**

- ✅ Project understanding and user insights
- ✅ Core experience and emotional response definition
- ✅ UX pattern analysis and inspiration
- ✅ Stitch workspace resolution and design system choice
- ✅ Core interaction definition and experience mechanics
- ✅ Design token system (colors, typography, spacing, motion, and exports)
- ✅ Approved variant directions and visual explorations
- ✅ User journey flows and interaction design
- ✅ Component strategy and custom component specifications
- ✅ UX consistency patterns for common interactions
- ✅ Responsive design and accessibility strategy

**The complete UX design specification is now available at:** `{planning_artifacts}/ux-design-specification.md`

**Supporting Visual Assets:**

- Semantic design system source: `{planning_artifacts}/DESIGN.md`
- Machine-readable tokens: `{planning_artifacts}/design-tokens.json`
- CSS variable tokens: `{planning_artifacts}/design-tokens.css`
- Approved direction artifacts: `{planning_artifacts}/ux-design-directions.html` (if generated)

This specification is now ready to guide visual design, story generation, and downstream implementation."

### 2. Workflow Status Update

Update the main workflow status file:

- Load `{status_file}` from workflow configuration (if exists)
- Update workflow_status["create-ux-design"] = "{default_output_file}"
- Save file, preserving all comments and structure
- Mark current timestamp as completion time

### 3. Suggest Next Steps

UX Design complete. Read fully and follow: `{project-root}/_bmad/core/tasks/help.md`

### 5. Final Completion Confirmation

Congratulate the user on the completion you both completed together of the UX.



## SUCCESS METRICS:

✅ UX design specification contains all required sections
✅ All collaborative content properly saved to document
✅ Workflow status file updated with completion information
✅ Clear next step guidance provided to user
✅ Document quality validation completed
✅ User acknowledges completion and understands next options
✅ Stitch project, token artifacts, and approved direction are captured for downstream workflows

## FAILURE MODES:

❌ Not updating workflow status file with completion information
❌ Missing clear next step guidance for user
❌ Not confirming document completeness with user
❌ Workflow not properly marked as complete in status tracking
❌ User unclear about what happens next
❌ Not surfacing the Stitch artifacts that later story workflows must reuse

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## WORKFLOW COMPLETION CHECKLIST:

### Design Specification Complete:

- [ ] Executive summary and project understanding
- [ ] Core experience and emotional response definition
- [ ] UX pattern analysis and inspiration
- [ ] Design system choice and strategy
- [ ] Stitch workspace binding and reuse strategy
- [ ] Core interaction mechanics definition
- [ ] Design token system and exported artifacts
- [ ] Approved design direction decisions and variants
- [ ] User journey flows and interaction design
- [ ] Component strategy and specifications
- [ ] UX consistency patterns documentation
- [ ] Responsive design and accessibility strategy

### Process Complete:

- [ ] All steps completed with user confirmation
- [ ] All content saved to specification document
- [ ] Frontmatter properly updated with all steps
- [ ] Workflow status file updated with completion
- [ ] Next steps clearly communicated

## NEXT STEPS GUIDANCE:

**Immediate Options:**

1. **Story Creation** - Create frontend stories that reuse the approved design foundation and story-level variant approval gate
2. **Wireframe Generation** - Create low-fidelity layouts based on the approved direction
3. **Interactive Prototype** - Build clickable prototypes for testing
4. **Solution Architecture** - Technical design with UX context
5. **Epic Creation** - Break down UX requirements for development

**Recommended Sequence:**
For design-focused teams: Wireframes → Prototypes → Figma Design → Development
For technical teams: Architecture → Epic Creation → Development

Consider team capacity, timeline, and whether user validation is needed before implementation.

## WORKFLOW FINALIZATION:

- Set `lastStep = 14` in document frontmatter
- Update workflow status file with completion timestamp
- Provide completion summary to user
- Do NOT load any additional steps

## FINAL REMINDER:

This UX design workflow is now complete. The specification serves as the foundation for all visual and development work. All design decisions, patterns, and requirements are documented to ensure consistent, accessible, and user-centered implementation.

**Congratulations on completing the UX Design Specification for {{project_name}}!** 🎉

**Core Deliverables:**

- ✅ UX Design Specification: `{planning_artifacts}/ux-design-specification.md`
- ✅ Semantic Design System: `{planning_artifacts}/DESIGN.md`
- ✅ Design Tokens: `{planning_artifacts}/design-tokens.json`
- ✅ CSS Tokens: `{planning_artifacts}/design-tokens.css`
- ✅ Approved Design Directions: `{planning_artifacts}/ux-design-directions.html` (if generated)
