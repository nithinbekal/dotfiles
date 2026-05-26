Create a new commit from the current repo changes.

Workflow:
1. Inspect repo state, relevant instructions, and the actual diff.
2. Stay on the current branch. Do not create or switch branches.
3. Stage only intended changes and create a concise new commit.
   - Stop and ask if unrelated changes are present.
   - Do not amend commits unless explicitly asked.
4. Do not push, submit, or update PRs unless explicitly asked.
5. Return the branch name and commit hash.

Extra context: $ARGUMENTS
