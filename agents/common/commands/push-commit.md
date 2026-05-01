Create a new commit from the current repo changes and push it.

Follow this workflow:

1. Inspect the repo state first:
   - current directory, branch, remotes, and git status
   - staged and unstaged diffs
   - recent commits if needed for context
   - any repo-specific AGENTS.md or project instructions that affect git workflow
2. If currently on the main branch, create a new branch based on the changes before committing.
   - Pick a concise, descriptive branch name from the diff.
   - Use kebab-case only.
   - Do not include slashes.
   - Do not include my name.
3. Stage the intended changes and create a concise new commit.
   - If the working tree contains clearly unrelated changes, stop and ask what to include.
   - Do not amend existing commits.
4. Push the branch using the repo's conventions.
   - Follow any repo-specific git workflow instructions you discovered.
   - Never force-push.
5. Return the branch name and commit hash.

Use any extra context I pass after /push-commit as guidance, but verify it against the diff.

Extra context: $ARGUMENTS
