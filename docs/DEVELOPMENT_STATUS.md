# Beta.9 fast Info source-paint hotfix — validation in progress

Baseline: published beta.8 3c4cad33db8d47f78c3c5673d346fe40eccb8590.
Branch fix/issue140-info-source-beta9. Owner explicitly authorized publication of
v1.9.0-beta.9 ONLY after existing mandatory CI/publisher gates pass. No master or
stable merge, production HA, retention or prior release/tag changes authorized.

Implemented independent source layer snapshots of actual rendered SVG solid,
linear/radial gradients (direction/transforms/stops/alpha), safe neutral fallback,
explicit CSS color/gradient mixing via Info-only paint input to shared renderer.
Normal widgets retain their render path. Connector stays live; gradient fallback
is explicitly first-stop color, not an exact gradient. No geometry/text/lifetime changes.

400 Node passes /3 stable-only skips;6 desktop/tablet/mobile focused paint cases
pass. HACS/package checks and reproducible normal build pass. Exact-source CI pending. No optional full local browser
campaign. CI's full suite is mandatory and must finish unchanged before publication.
Evidence outside Git: /workspace/build-output/v19-beta9/. Read AGENTS.md/issue140/
new scoped PR before continuing. Commit/push valid milestones; freeze source head
before publisher. Latest stable v1.8.1/master and all published tags/assets preserved.
Historical private beta.5 visibility exception remains in beta.8 handoff; no deletion
or overwrite issued. No hardware/HA installation claims.

Next: verify npm test, targeted paint tests, reproducible normal HACS build/checksum;
open scoped PR against beta.8 branch, await exact-head push/PR CI then publish beta.9
through unchanged release.yml with expected_commit/tag and publish=true. Verify
public downloads/tag/provenance/checksums/preservation, record handoff and stop.

Commands: npm test; NODE_OPTIONS=--openssl-legacy-provider npm run build;
node scripts/check-beta.js; node scripts/check-hacs-package.js;
/tmp/honeycomb-beta-venv/bin/python test/browser/info_cube.py --source-paint-only
--bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js
--evidence-dir /workspace/build-output/v19-beta9/focused
