# v1.7.1 beta test and publication gate

PR #91 is unmerged. Package/release metadata targets `v1.7.1-beta.1` with
`prerelease=true`; **the release is not published yet**.

## Existing publisher limitation and proposed safe path

The existing `.github/workflows/release.yml` only accepts `refs/heads/feature/`
and `v1.7.0-beta.N`; `scripts/check-beta.js` also accepts only 1.7.0 betas.
PR #91 is on `fix/issue-90-sonos`. No tag/branch/version guard is bypassed and
no existing tag or asset may be replaced. The local artifact validator supports
1.7.1 beta metadata for testing; this does not authorize the publisher.

Proposed owner-reviewed follow-up:

1. Add this exact PR branch to Build push triggers so both push and PR CI run on
   the same SHA; retain the publisher's requirement for both green runs.
2. Extend beta branch/version guards narrowly to allow `fix/issue-90-sonos` with
   `v1.7.1-beta.N`. Retain feature/1.7.0 compatibility, original ancestry checks,
   exact SHA/tag checks and artifact reproduction. Require this branch's current
   head and open PR #91 to match the tested SHA and approved Sonos ancestry.
3. Update the beta-only local validator for that prerelease train, keeping stable
   versions rejected. Test all wrong-branch/version/SHA/tag and existing-release
   rejection paths. Do not change retention or stable publication workflows.
4. After both CI runs pass, create a new tag at that exact SHA, dispatch the
   existing beta workflow on the unmerged PR branch, publish with
   `prerelease=true` and `latest=false`, and verify public bundle/checksum/tag plus
   unchanged latest stable. Stop on any failure; never force tags or replace assets.

Approval is needed for this supported workflow change before tagging/publication,
per the owner's explicit instruction to stop if the existing workflow cannot
safely publish the unmerged PR. Master remains unchanged.

## HACS test once the prerelease exists

1. Back up dashboard YAML. In HACS, open Honeycomb Menu NG, choose **Redownload**
   from its menu, enable **Show beta versions**, and select `v1.7.1-beta.1`.
   If needed first add `NicolaiTandrup/honeycomb-menu-ng` as a Dashboard repository.
2. Confirm that the selected version is the beta, download it, then hard-refresh
   dashboard clients/clear frontend cache. Keep the existing JavaScript module
   resource; the asset remains `honeycomb-menu-ng.js`.
3. Verify slots: 1 Radio, 2 Play/Pause, 3 Solo/Join, 4 Browse, 5 Down, 6 Up.
4. Check favorite order/playback/logos, new ring colors and Join/unjoin via the
   configured script. Confirm current HA favorite IDs/URIs/cache metadata before
   expecting launcher recognition. Unknown metadata must fall back safely.
5. Play, pause, stop and change stations, then test grouped playback. Paused/stopped
   center must be neutral; failed/missing logos must restore the standard icon.
   Check explicit styles and center/back navigation.
6. Review README layout on desktop/mobile in light/dark GitHub themes.

Return the installed beta version, observed HA state and result using synthetic
identifiers in public reports. Defects get new beta.2/beta.3 tags, never moved tags.

Every future version must ship an installable prerelease and receive explicit
owner confirmation from real HA testing before stable publication. PR #91 cannot
merge and v1.7.1 cannot publish stable until that approval. Existing stable,
retention settings, tags, branches and history remain untouched.
