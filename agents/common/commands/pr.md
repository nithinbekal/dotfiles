Create a GitHub PR from the current repo changes.

Workflow:
1. Inspect repo state, relevant instructions, and the actual diff.
2. If on main, create a concise branch for the change.
   - Use kebab-case.
   - Do not include slashes.
   - Do not include my name.
3. Stage only intended changes, commit them, and push using repo conventions.
   - Stop and ask if unrelated changes are present.
   - Do not amend commits unless explicitly asked.
   - Do not force-push unless explicitly asked.
4. Open a draft PR unless I explicitly ask for ready-for-review.
5. Write a concise PR description from the diff:
   - what changed
   - why it changed
   - relevant issue links, if obvious
   - omit routine CI/test-plan boilerplate
6. Return the full PR URL.

Extra context: $ARGUMENTS
