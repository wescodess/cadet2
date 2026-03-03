---
name: bmad-bmm-create-story
description: "Creates a dedicated story file with all context needed for implementation, including mandatory Stitch-first frontend packaging when UI work is involved: generate 3 different concept directions per impacted surface, generate desktop+mobile versions for each direction, require explicit user selection of one approved mobile+desktop pair, and embed the approved package for dev-story handoff. Use when the user says \"create the next story\" or \"create story [story identifier]\""
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS - while staying in character as the current agent persona you may have loaded:

<steps CRITICAL="TRUE">
1. Always LOAD the FULL {project-root}/_bmad/core/tasks/workflow.xml
2. READ its entire contents - this is the CORE OS for EXECUTING the specific workflow-config {project-root}/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml
3. Pass the yaml path _bmad/bmm/workflows/4-implementation/create-story/workflow.yaml as 'workflow-config' parameter to the workflow.xml instructions
4. Follow workflow.xml instructions EXACTLY as written to process and follow the specific workflow config and its instructions
5. Save outputs after EACH section when generating any documents from templates
</steps>
