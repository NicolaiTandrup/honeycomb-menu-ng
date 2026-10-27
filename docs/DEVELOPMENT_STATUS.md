# Climate v1.10.0-beta.1 integration — validation pending

Active PR #131, feature/v1.10-climate. Existing validated Climate d965f41214085abb1eb52d25948fb5a7d47bd020 is being integrated with exact v1.9.0 stable ba95dade58fa64c5183a312e0d1d00044feeb096 by normal merge into the feature branch. Master is not modified. No wholesale rollback of stable source; merge conflicts preserve all stable tests and Info/palette navigation.

Owner explicitly authorizes public beta.1 only after full matching CI and guarded publisher verification. No merge to master, stable publication, Car development, production HA command, retention change or deletion/overwrite. AGENTS.md applies.

Prior Climate tests passed on the old base; new cumulative validation is PENDING. Do not infer completion from implementation. Next run npm test, reproducible NODE_OPTIONS=--openssl-legacy-provider npm run build, all mandatory browser/documentation/packaging/lint tests, then exact-head push/PR CI before release.yml. Read docs/CLIMATE_MODULE.md, issue #87, PR #131. Real HVAC acceptance remains pending.

Evidence: /workspace/build-output/v110-beta1/. Preserve old worktrees/releases. Record exact validated commit, checksums, CI and actual publication before final handoff.

## Integration checkpoint

427 Node passes / 3 stable-only skips; same production rebuild bytes, 292933 bytes,
SHA256 a6b292c1ddb9556de7c07f9cdbcc8cbc3dc8f6e1500ad5f143f2b6caa99ba4ad.
Targeted original32 Climate browser scenarios and22 documentation interactions;
new4 desktop/mobile integration cases pass (Info suspends/restores nested Climate;
Light parent -> different Climate child -> restored Light Color/White menu with
correct service identity). Docs63 YAML/52 cards+11 fragments/250 local links pass.
Full cumulative local suite and exact-head CI still pending. Existing v1.9.0 module
source files remain byte-identical; only module registration, nested descriptor
expansion and standalone-child bridge are integrated. Guarded release.yml unchanged.

Commands: npm test; NODE_OPTIONS=--openssl-legacy-provider npm run build;
node scripts/check-beta.js; node scripts/check-hacs-package.js;
python /workspace/build-output/v110-beta1/run-full.py (local complete suite driver);
/tmp/honeycomb-beta-venv/bin/python test/browser/climate.py --bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/v110-beta1/climate.
Evidence/screenshots stay outside Git. Browser plugin absent: repository Playwright.
Native HAVC hardware, Firefox/WebKit and physical multi-integration permissions are
not validated by these mocks. No live service calls have been sent.
