# Development status — v1.9.0 STABLE PUBLISHED AND VERIFIED

Public latest stable: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0
Exact lightweight tag/master source: ba95dade58fa64c5183a312e0d1d00044feeb096.
Promotion PR #145 merged normally after exact candidate checks; candidate head
was e0ef712a59c845df4d883e50296a1f395882137b. All beta.1–beta.9 tag commits are
ancestors. Approved beta.9 f95e5fbc7273ae06055bb5f106bdd6a3a82a183d and src tree
b03d8be3a1d38a5b504f677bee7b9918b7a507f4 preserved exactly. No Climate/Car features.

## Bundle and release proof

Normal HACS JavaScript274251 bytes, SHA256:
86bde7a9bd7f3aea2155b0c805e622408efcea0d0f7239cea3bf6cac87a8e8ed
Provenance SHA256:537856d4b50d4231f87eb121ffcd4032e9c6d19f1dea25a0ef603efd37fd6fbe
Sums SHA256:ed7f6b466b3dd38e724f308e6e87fd0a3578bfebeb497e3f17105c448007f367

All3 public assets independently downloaded anonymously, checked against GitHub
size/digest, SHA256SUMS, exact tagged/master Git bytes and source/CI approval
provenance. Release is public, prerelease=false and latest; HACS root metadata/
normal bundle correct. No DEV loader. Tag points exactly to verified master.

Stable differs from beta.9 only in banner and two canonical build-info version
literals; all other executable bytes identical. Src/assets/dependencies/webpack/
build-version inputs unchanged. Version-metadata-v2 approval guard requires exactly
one canonical module, rejects missing/duplicate/conflicting metadata, and compares
every other byte. Old banner-only policy remains supported. Guard tests and public
beta/source/tree/digest pinning remain strict; no source/CI/asset/retention safeguard
bypassed. Candidate CI adds a retention=false assertion without Variables API access.

## Completed validation

- 404 Node passes, zero skips; stable-only approval checks active.
- Complete local408 Chromium scenarios (69 Info,18 docs,8 coexistence) and6 native
  Sleep device-boundary contracts; core contracts and integration fixtures pass.
- Docs:59 YAML,44 complete cards+11 fragments,238 local links,18 browser interactions.
- Performance, HACS/GPL/package, actionlint, metadata and reproducibility pass.
- Exact candidate push40394414718 and PR40394422188: every job/step green.
- Master tree equals candidate tree. Exact master404 Node and independent rebuild
  pass; fresh full master CI40397216766: every job/step green, same mandatory suite.
- Official HACS validation40397237414: passed on actual merged master.
- Stable publisher40399788426: publish=true, verify/publish every step passed.
  Actual master SHA, public approved beta, matching master CI and reproducible
  CI/committed/staged/draft assets rechecked. No tag/release reuse or overwrite.
- Retention inventory/dry-run passed; retention cleanup SKIPPED. Variable stayed
  explicitly false, never read/changed through inaccessible Variables API.

## Preservation / limits

55 prior API-visible release records/assets and108 prior tags unchanged (new56/109).
All nine v1.9 beta Releases independently confirmed still public prereleases.
No deletes, force pushes, history rewriting, old asset edits, production HA deployment
or physical charging commands. Historical private beta.5 API-visibility uncertainty
remains separate; no new disappearance finding or delete/overwrite issued.

Owner explicitly accepted beta.9 on real HA and authorized this stable publication.
That does not imply every hardware/integration/browser was physically tested.
Chromium desktop/tablet/mobile only; no Firefox/WebKit/native-pinch/device matrix.
Known Info30s/128blocks/32768chars/64pages, positioned/tiny-panel limits, first-stop
connector color fallback and visible-anchor requirement persist. Inherited fixed
410px Light palette clipping on390px is documented. Runtime unchanged from approved
beta.9; no unrelated design work. No cloud-side live HA/HACS installation claimed.

## HACS / stop point

HACS → Honeycomb Menu NG → Update to v1.9.0; beta users may use Redownload and
select v1.9.0 stable. Keep exactly one normal NG module resource and button-card,
then reload. Existing custom Dashboard repository remains usable; no external
HACS catalog submission was made. No source configuration migration beyond the
already approved beta track. Console version/bee label should report1.9.0/v1.9.0.

STOP. Stable mission complete. Do not start v1.10, merge unfinished branches or
modify any Home Assistant installation without new authorization. Older candidate
PR #132 is superseded; do not merge it sequentially. Publication-only handoff is
on docs/v1.9.0-published-handoff, separate from immutable tested master/tag.
Read AGENTS.md, this handoff and fresh Git/issue/PR/release state before future work.

Evidence outside Git:/workspace/build-output/v19-stable/ contains full/ logs and
validation.json, approved beta ancestry, source-comparison.json, merge-result.json,
master-verified.json, exact CI/HACS records, stable-inputs.json/publisher records,
public-verification.json, downloaded public assets and before/after inventories.
Relevant commands: npm test; NODE_OPTIONS=--openssl-legacy-provider npm run build;
node scripts/check-release.js --stable; node scripts/check-hacs-package.js;
python test/browser/info_cube.py (all required bundle/button-card/evidence args).
