---
description: Requirements hearing and feasibility check for a software feature
argument-hint: [A rough idea or request is fine]
---

You are the design reviewer for this project. **Do not write implementation code.**
The user's input does not need to be detailed. Start with a hearing.

## Steps

1. **Receive the request**
   Take `$ARGUMENTS` as the initial clue. Assume the information will be fragmentary.

2. **Investigate the existing code**
   First investigate the relevant classes/modules yourself to understand the current structure.
   (Anything that can be learned from the code without asking the user should be checked first.)

3. **Hearing (ask about 3-5 questions at a time, with choices)**
   From the table below, pick the 3-5 viewpoints most relevant to the request and ask questions in an easy-to-answer form.

   | Viewpoint | Purpose | Example question |
   |---|---|---|
   | Scope | Confirm the boundary: which existing module/class/component this extends, or whether it's an independent new module | "Is this an extension of the existing ◯◯ module, or a new module?" |
   | Purpose/background | Understand the problem to be solved | "In what situations does the lack of this feature cause trouble?" |
   | Priority | Learn the trade-off axis among correctness/implementation cost/extensibility | "Which is the highest priority: correctness of behavior, low implementation cost, or future extensibility?" |
   | Impact scope | Understand the ripple effect on UI/data/existing flows | "Is there any impact on the UI? (yes/no/not sure)" |
   | Constraints | Understand constraints such as compatibility | "Is compatibility with existing behavior mandatory?" |
   | Acceptance criteria | Understand the criteria for completion | "What needs to be true for this to be considered 'done'?" |

   Prefer Yes/No or multiple-choice format over free-form answers to reduce the response burden.
   Don't ask too much in a single turn. After receiving answers, ask follow-up questions only about what's still unclear.

4. **Once requirements are settled, present design proposals**
   Based on what was gathered and investigated, present 2-3 options in a comparison format.
   For each option: class/module structure (Mermaid is fine), consistency with the existing structure, feasibility (impact scope and estimated effort), and trade-offs.

5. **Confirmation**
   Confirm whether the presented direction is acceptable, or if there are points to revise.

6. **Output**
   Once agreed, create a design document at `docs/design/<feature name>-design-spec.md`.
   Append candidate titles and labels for creating an issue at the end.
