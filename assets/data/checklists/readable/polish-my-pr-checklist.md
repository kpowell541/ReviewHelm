# Polish My PR — Code Review Checklist

✨ Prepare your PR for a smooth review and easy merge
Total items: 43  |  Version: 1.0.0

---

## Severity Legend

| Code | Meaning  | Description                        |
|------|----------|------------------------------------|
| BLK  | Blocker  | Must fix before merge              |
| MAJ  | Major    | Should fix, significant concern    |
| MIN  | Minor    | Nice to fix, not critical          |
| NIT  | Nit      | Cosmetic / stylistic preference    |

---

## PR Description & Context

1. [MAJ] Title is concise, descriptive, and follows team conventions (not "fix stuff" or "updates")  `documentation` `code-quality`
2. [BLK] Description explains WHAT changed and WHY (not just HOW)  `documentation` `code-quality`
3. [MAJ] Link to ticket/issue is included  `documentation`
4. [MAJ] Screenshots or recordings included for UI changes  `documentation`
5. [MIN] Impact and risk assessment stated for non-trivial changes  `documentation` `code-quality`
6. [BLK] Breaking changes are called out prominently  `documentation` `api-design`
7. [MAJ] Migration or deployment notes included if applicable  `documentation`

## Scope & Size

8. [MAJ] PR is focused on a single logical change  `code-quality`
9. [MIN] No unrelated changes bundled in (drive-by fixes, formatting-only diffs)  `code-quality`
10. [MAJ] PR is reasonably sized (ideally under ~400 lines of meaningful changes)  `code-quality`
11. [MIN] Large features are broken into stacked/sequenced PRs with clear ordering  `code-quality`
12. [MAJ] Refactoring is separated from behavior changes  `code-quality`

## Commit Hygiene

13. [MIN] Commits are atomic — each builds and passes tests independently  `code-quality`
14. [MIN] Commit messages are descriptive and follow team conventions  `code-quality` `documentation`
15. [MAJ] No "WIP", "fixup", "squash me" commits left in  `code-quality`
16. [NIT] Interactive rebase used to clean up history before requesting review  `code-quality`

## Self-Review

17. [BLK] I have read my own diff line by line in the GitHub UI  `code-quality`
18. [BLK] I have run the code locally and verified it works  `testing`
19. [MAJ] Removed all debug statements (console.log, fmt.Println, System.out.println, print())  `code-quality`
20. [MIN] No commented-out code left in — deleted, not commented  `code-quality`
21. [BLK] No accidental file inclusions (.env, IDE configs, large binaries, node_modules)  `security` `code-quality`
22. [BLK] No secrets or credentials committed (API keys, passwords, tokens)  `security`
23. [NIT] Checked for typos in code, comments, and strings  `code-quality`

## Test Coverage

24. [BLK] New code has corresponding unit tests  `testing`
25. [BLK] All existing tests still pass  `testing`
26. [MAJ] Edge cases are covered (empty inputs, null, error paths, boundary values)  `testing`
27. [MIN] Test names are descriptive and document expected behavior  `testing` `documentation`
28. [MAJ] No flaky tests introduced (no timing dependencies, no ordering reliance)  `testing`
29. [MAJ] Integration tests added for cross-module or API changes  `testing`

## Documentation

30. [MAJ] Public API changes have updated documentation  `documentation` `api-design`
31. [MIN] README updated if setup or usage changed  `documentation`
32. [MIN] Inline comments added for non-obvious or complex logic  `documentation` `code-quality`
33. [NIT] Changelog updated if project maintains one  `documentation`

## Reviewer Experience

34. [MAJ] Assigned appropriate reviewers (domain experts, CODEOWNERS)  `code-quality`
35. [MIN] Added helpful inline comments on complex sections of the diff  `documentation`
36. [MAJ] Provided testing instructions or reproduction steps  `documentation` `testing`
37. [NIT] Labeled the PR appropriately (size, area, priority)  `code-quality`
38. [MIN] Set draft status if not ready for final review  `code-quality`

## CI/CD & Integration

39. [BLK] CI pipeline passes (lint, build, tests)  `testing` `code-quality`
40. [MIN] No new lint warnings or compiler warnings introduced  `code-quality`
41. [MAJ] Dependencies are locked/pinned (lockfile updated)  `code-quality`
42. [BLK] Database migrations are reversible and tested  `code-quality`
43. [MAJ] Feature flags in place for risky changes that need gradual rollout  `code-quality`
