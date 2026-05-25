Pick up GitHub issue $ARGUMENTS.

Use the issue body, comments, linked resources, and existing code as the source of truth.
If recent comments conflict with the issue body, follow the recent comments.

Workflow:
1. Read the issue/comments/links.
2. Identify affected files and existing patterns.
3. Implement the smallest coherent change.
4. Add or update tests for changed behavior.
5. Run targeted validation for touched files.

Constraints:
- Avoid broad unrelated refactors.
- Do not add lint/type suppressions unless unavoidable; explain if used.
- Do not modify git config.
- Do not push, submit, restack, or update PRs unless I explicitly ask.
- Do not resolve review threads or close the issue.

Ambiguity:
- Make reasonable assumptions for minor implementation details and document them.
- Ask before changing product behavior, permissions, persistence, or public APIs.

Final summary:
- Changed
- Tests run
- Not run
- Risks/follow-ups
