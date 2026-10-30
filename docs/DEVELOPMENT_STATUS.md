# v1.10.0-beta.2 — implementation and mandatory validation

Owner authorizes issues #146, #147 and #148 and guarded beta.2 publication only
after every mandatory gate passes. No master merge/stable/production HA changes.

Branch: feature/v1.10-beta2, based exactly on published beta.1
8619c9a74f50ffbbdb6206a45b18e5b81265912d. Previous documentation-only network
handoff 0985d10921104ae5686a290e967c066dd24c1397 reviewed; no code to reapply.
GitHub API and dry-run push pass. Runtime enforced policy includes api.github.com;
ordinary sandbox forbids proxy sockets, authorized escalated shell uses inherited
proxy normally. No bypass or credential replacement. Published beta.1 downloaded
and verified against SHA256SUMS and historical a6b292c1ddb9556de7c07f9cdbcc8cbc3dc8f6e1500ad5f143f2b6caa99ba4ad.
Read current issues, comments (none), PR #131 and its successful exact-head CI.

Implemented:
- Climate neutral functional fill and zero default inner width; independent center.
- Sonos Join room playback/content, own volume, accessible membership/failure
  reasons and live launcher-source artwork, paint, gradients/alpha and borders.
  Native/external grouping action safety and other Sonos services preserved.
- Opt-in collapsible Hub with hard primary slot 0, both expanded center policies,
  shared allocation/conflict validation, original primary tap, isolated hold,
  Back/Escape/30s configurable activity deadline. Mobile top-layer overlay with
  interaction shield, viewport/safe-area fit and original floorplan restoration.
  Multiple contexts, nested Back, keyboard, preview and disposal covered.
  Info from an expanded phone Hub also uses the top layer and returns to the
  unchanged caller. Overdue idle checks while held have a bounded 250ms delay.
  Join honors source icon hiding; keyboard expansion does not suppress its next
  deliberate Back click (only the initiating held-pointer compatibility click).
- YAML examples and docs; new mandatory browser workflow step. Guarded publisher,
  stable workflow, HACS payload filename and dependencies remain unchanged.

Actual local results so far: Node 430 passes / 3 existing stable-only skips;
36 Climate browser cases pass; 20 new beta.2 desktop/mobile cases pass including
real CDP touch, clipping/rotation, source artwork/gradient changes and multiple
Hubs. Package/GPL/HACS and checksum-verified actionlint pass. Official HACS workflow 41090506240 succeeded on initial implementation
3abebb848bbad773f63c5cf1b0947cd122cb6b03; rerun for final source. PR #149 open:
https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/149. Full mandatory suite
RUNNING; do not treat this checkpoint as green CI or publication evidence.
Old Join label assertions adapted to room playback/volume plus accessible failure
reasons; grouping service/no-call safety assertions retained. Browser plugin not
available; repository Playwright uses installed /usr/bin/chromium. Playwright CDN
is policy-blocked, no retry/bypass needed. Synthetic services only.

Evidence outside Git: /tmp/honeycomb-beta2/ (full/results.json when complete,
features/, comparison/ before/after, Node/build logs). Screenshots are not committed.
Next: finish full mandatory suite and any fixes, push reviewable PR, verify exact
head green push/PR CI and official HACS readiness, reproduce committed JS, dispatch
unchanged release.yml with expected_commit and expected_tag=v1.10.0-beta.2,
publish=true, then verify public tag/assets/checksums/provenance/HACS compatibility.
Keep the branch frozen during release verification; subsequent handoff on a separate
branch. Stop after publication and verification.

Known limits: real HA/hardware acceptance pending; Firefox/WebKit not tested.
Mobile top layer requires current Popover API support; large slot populations may
need sub-44px cells to fit a phone. Phone behavior validated synthetically in Chromium,
not against the owner's actual dashboard/kiosk or physical device. Existing Climate
capability/discovery/confirmation limits still apply. No acceptance issues closed.
