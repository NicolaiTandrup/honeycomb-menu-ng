# Owner review: initial retention dry-run

Captured 2026-10-20 for Issue #83 from a complete read-only GitHub Release inventory.
This is a snapshot, not authorization for future deletion. No releases were deleted,
no Actions variable was enabled, and no workflow was installed on master.

The policy is based on stable **v1.5.1**, despite the newer v1.7 betas. All 27
records are retained: **24 stable + 3 prereleases**, zero eligible and zero skipped.
The corrected policy therefore preserves every current v0/v1 stable release and
all newer v1.7 prereleases. Future stable v1.7 would still preserve v0/v1 stable.

See the [maintainer guide](RELEASE_RETENTION.md), synthetic version tables and tests
for future transitions with nonzero eligible records. Review a fresh inventory
before activation. This snapshot ran with apply disabled. The current token could
not inspect repository Actions variables (403), so the owner must verify any
existing gate value in settings. No variable was set or changed by this work.

---

## Generated read-only report

Mode: **dry-run**. Deletion gate: **disabled**.

Stable basis: <code>v1.5.1</code>; previous minor train: <code>1.4</code>.

Inventory: 27; keep 27; eligible delete 0; skipped 0.

Confirmed deleted: 0; uncertain mutations: 0.

- Previous train is numeric predecessor 1.4, even if no releases exist in that train.

| Release ID | Exact tag | Kind | Decision | Reason |
|---:|---|---|---|---|
| 384977268 | <code>v0.1.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 385036377 | <code>v0.2.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 385042776 | <code>v0.2.1</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 385347512 | <code>v0.3.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 385762240 | <code>v0.4.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 386939769 | <code>v0.4.1</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 386953700 | <code>v0.4.2</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 386970043 | <code>v0.5.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 386993336 | <code>v0.6.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 387032389 | <code>v0.6.1</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 387043056 | <code>v0.6.2</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 388001854 | <code>v0.7.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 395999484 | <code>v0.7.1</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 399822595 | <code>v0.7.2</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 399843218 | <code>v0.7.3</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 399883446 | <code>v0.7.4</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 399884423 | <code>v0.7.5</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 399899011 | <code>v0.7.6</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 399997874 | <code>v0.8.3</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 402140553 | <code>v0.9.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 402154555 | <code>v0.9.1</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 409909990 | <code>v1.2.11</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 410953219 | <code>v1.5.0</code> | stable | keep | Stable current/previous MAJOR (or ahead of basis). |
| 411996616 | <code>v1.5.1</code> | stable | keep | Latest stable is unconditionally preserved. |
| 418089406 | <code>v1.7.0-beta.1</code> | prerelease | keep | Prerelease train is ahead of latest stable; preserve it. |
| 418212352 | <code>v1.7.0-beta.2</code> | prerelease | keep | Prerelease train is ahead of latest stable; preserve it. |
| 418250856 | <code>v1.7.0-beta.3</code> | prerelease | keep | Prerelease train is ahead of latest stable; preserve it. |

Only GitHub Release records are eligible. No Git tags, refs, branches, commits, files or history are deleted.

If blocked, leave deletion disabled and request owner review of this inventory. Deletion cannot restore release metadata/assets; retaining tags is not a backup of release records.
