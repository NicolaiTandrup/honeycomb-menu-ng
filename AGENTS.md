# Honeycomb Menu NG development instructions

## Start by reconstructing state

1. Read `docs/DEVELOPMENT_STATUS.md` before changing files. Treat its statements as
   checkpoints to verify, not proof that a release or test completed afterward.
2. Inspect `git status --short`, the active branch, recent commits, worktrees and
   remote head. Preserve uncommitted work. Read current relevant GitHub issues,
   latest owner comments and related open PRs; check their exact heads and CI.
3. Identify already committed and validated work. Resume the highest-priority
   unfinished task; do not recreate files, repeat completed implementation or
   merge historical cumulative beta PRs sequentially.
4. If a prior session stopped unexpectedly, reconstruct missing progress from Git,
   CI, release/tag records and PR discussions before updating the status file.

## Architecture and safety

- Use the established module registry, shared 82px CubeElement renderer, numeric
  sizing, allocation/visibility, navigation and action dispatch. Light remains the
  graphical reference. Prefer narrow, backwards-compatible changes and small,
  tested, reviewable commits. Do not duplicate the renderer or numeric engine.
- Inspect actual HA capabilities, entity metadata, units and advertised choices.
  Never infer a controllable device from a friendly name or arbitrary substring.
  Examples, fixtures, screenshots and public GitHub material use synthetic IDs.
- Never commit secrets, owner production configuration, private identifiers or
  temporary screenshots/debugging artifacts. Keep generated QA evidence outside Git
  unless explicitly requested; retain the deterministic production bundle.
- Never merge a PR, change master, publish stable or issue production HA/charging
  commands without explicit authorization. Test services only against mocks.
- Publish an authorized beta only through the existing guarded manual workflow:
  exact tested branch head, matching green CI, valid version metadata, reproducible
  HACS bundle/checksum/provenance and a new immutable tag/release are mandatory.
  Do not weaken guards, reuse tags, overwrite assets or silently promote a beta.
- Preserve previous releases/tags/branches/history, the private beta.5 draft and
  retention settings. Retention stays disabled; no destructive cleanup is implied.
- Owner real-HA acceptance is separate from synthetic/browser/CI validation.
  Do not close acceptance issues or claim hardware validation from test fixtures.

## Work and handoff

- Continue autonomously when scope is clear; ask about meaningful architecture,
  compatibility or safety decisions. Record agreed decisions and exact blockers.
  A blocked task does not prevent independent authorized work.
- Run checks appropriate to the change and all mandatory CI/release gates.
  Record actual commands/results, skipped cases and untested environments; code
  written or a workflow dispatched is not evidence of completion.
- At natural checkpoints and before stopping/approaching limits: save coherent
  changes, run feasible relevant tests, update `docs/DEVELOPMENT_STATUS.md`, commit
  and push the feature branch when permitted. Post a concise issue/PR comment for
  meaningful progress or a blocker, without duplicating prior status messages.
- Leave the next session an exact branch, last validated code commit, linked CI/PR,
  ordered remaining tasks and next command. A handoff-only commit can reference
  its preceding validated code commit; it need not contain its own SHA.
- Do not move a branch during exact-head release verification/publication. Put
  unrelated work or handoff updates on a separate branch until publication ends.
