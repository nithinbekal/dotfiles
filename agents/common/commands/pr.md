Create a GitHub PR from the current repo changes.

Follow this workflow:

1. Inspect the repo state first:
   - current directory, branch, remotes, and git status
   - staged and unstaged diffs
   - recent commits if needed for context
   - any repo-specific AGENTS.md or project instructions that affect git/PR workflow
2. If currently on the main branch, create a new branch based on the changes before committing.
   - Pick a concise, descriptive branch name from the diff.
   - Use kebab-case only.
   - Do not include slashes.
   - Do not include my name.
3. If there are uncommitted changes, stage the intended changes and create a concise commit.
   - If the working tree contains clearly unrelated changes, stop and ask what to include.
   - Do not amend existing commits unless explicitly requested.
4. Push the branch using the repo's conventions.
   - Follow any repo-specific git workflow instructions you discovered.
   - Never force-push unless explicitly requested.
5. Create a draft PR unless I explicitly ask for ready-for-review.
6. Write a clear, useful PR description based on the actual diff.
   - Explain what changed and why.
   - Keep it concise and concrete.
   - Link relevant issues if they are obvious from the branch, commit, or context.
   - Only include a Testing section if there was manual testing or something unusual/non-obvious to test.
   - Do not add a Testing section just to list checks that normal CI will catch.
7. Return the full PR URL.

Use any extra context I pass after /pr as guidance, but verify it against the diff.

Extra context: $ARGUMENTS
