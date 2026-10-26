# v1.9.0 stable promotion — implementation/preflight in progress

Owner authorizes v1.9.0 stable preparation, testing, green-PR merge into master,
exact merged-master validation and guarded stable publication. No v1.10, live HA,
retention variable changes or deletion of prior releases/tags/history.

Branch release/v1.9.0-approved-beta9; exact approved cumulative baseline public
beta.9 f95e5fbc7273ae06055bb5f106bdd6a3a82a183d. Master ancestor is
c1f178740c8181921033d0d18e0ac8d01afc7ea7. No historical beta PRs individually merged.

Prepared stable metadata/notes and approval manifest pinned to beta.9. Stable
approval guard narrowly permits version banner plus canonical build-info's two
version literals; exact src/dependency/build configuration and other bundle bytes
remain immutable. Added build-version input protection and stable CI retention=false
assertion (read through workflow vars, no Variables API or setting mutation).

404 Node tests pass (no skips), including stable source/metadata approval guards;
HACS/GPL/package and actionlint pass. Independent comparison confirms stable JS
differs only at those metadata locations; source unchanged. Full browser/CI PENDING. Do not publish
or merge before all required gates pass. If any mandatory gate fails, stop
publication, record failure and corrective action; never weaken or bypass guards.

Next: run full local mandatory suite/repro/HACS/lint/docs, create single promotion
PR to master, await exact-head push/PR CI (including retention=false), merge using
matched head only if green, verify actual master SHA/tree/artifact and full master
CI, then dispatch unchanged stable-release.yml publish=true against exact master.
See docs/V1_9_STABLE_RELEASE.md. Evidence /workspace/build-output/v19-stable/.
Known historical private beta.5 API visibility uncertainty remains separate; no
release/tag deletion or overwrite permitted. Read AGENTS.md and current Git/PR/issue
before resuming. Owner beta.9 real-HA acceptance is distinct from automated coverage.
