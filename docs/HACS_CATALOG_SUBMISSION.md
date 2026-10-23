# Official HACS / Marketplace catalog submission — owner review

**Prepared, not submitted. Issue #92 stays open until official inclusion.**
This package describes **v1.8.1 stable**. Charger is not a stable feature;
any Charger beta must be selected separately as a prerelease. No external fork,
branch, PR, maintainer message, repository detachment or history rewrite was made.

## Verified release and validation

- [Public latest stable v1.8.1](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.8.1),
  commit `c1f178740c8181921033d0d18e0ac8d01afc7ea7`, full release, not a prerelease.
- Root `honeycomb-menu-ng.js`: 218400 bytes, SHA256
  `30ebd78630eb1763c0a7e885732f13647ab9a2b3554800bca0471694a211656d`.
  Release also includes `SHA256SUMS.txt` and `release-provenance.json`.
- [Official HACS validation](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39837224467)
  passed with category `plugin` and **no ignored checks**, before the full v1.8.1
  publication. That run checked master `f7f9695ba9f060919a3d76d950a560866188d49f`;
  the subsequent maintenance release preserved its executable runtime exactly
  except for the version banner. This documentation correction is separate.
- [Exact v1.8.1 master CI](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39848069753)
  is green. Owner reports successful real-HA custom-repository installation.
- Public/active repository, issues enabled, NG-specific description/topics,
  GitHub-recognized GPL-3.0 license; SPDX/NOTICE preserve GPL-3.0-or-later attribution.
- Distinct HACS name **Honeycomb Menu NG**, root filename matching the repository,
  `content_in_root: true`, `render_readme: true`. No backend integration/package.
- [Runtime coexistence contract](NG_RUNTIME.md) and the existing full-bundle
  browser tests cover both original/NG load orders. Synthetic stable screenshots
  are in the [README](../README.md), with [provenance](assets/screenshots/stable-provenance.json).

## Read-only refresh — 2026-10-23

Rechecked the live official inclusion/plugin rules, Marketplace catalog guide and
PR template. The repository remains public/active with issues, description,
topics and a GitHub-recognized GPL license. The v1.8.1 public bundle was downloaded
again and matched the checksum above. Current upstream catalog master is
`26677ecf6ffe5d279972542b8966e40aee3998cd`; the refreshed patch inserts one entry
only, preserves upstream whitespace and the original Honeycomb listing, and passes
JSON/uniqueness/casefold ordering checks. Charger beta.2 is unrelated to catalog
eligibility. No upstream PR, fork, maintainer inquiry or release was created.

## Current first-party requirements

The [HACS inclusion rules](https://github.com/hacs/documentation/blob/main/source/docs/publish/include.md),
[Dashboard/plugin structure](https://github.com/hacs/documentation/blob/main/source/docs/publish/plugin.md),
[Marketplace catalog guide](https://github.com/home-assistant/contributors.home-assistant.io/blob/main/src/content/docs/marketplace/guides/catalog.md)
and [official PR template](https://github.com/hacs/default/blob/master/.github/PULL_REQUEST_TEMPLATE.md)
were checked during preparation.

The catalog is `hacs/default`; frontend **Dashboard** corresponds to backend
category **plugin**. The Marketplace consumes the same catalog. The entry is a
plain `owner/repository` string in its JSON `plugin` list, sorted case-insensitively.
The owner or a major contributor must submit from a personal-account branch with
maintainer edits allowed, complete the template, provide passing HACS Action
without `ignore`, and publish a subsequent full release. Hassfest is for backend
integrations, so it does not apply here. Do not request individual reviewers.

## Exact proposed change

Use the [one-line patch](hacs-catalog/plugin-entry.patch). At preparation, upstream
master was `26677ecf6ffe5d279972542b8966e40aee3998cd` and the insertion was:

```json
  "ngocjohn/vehicle-status-card",
  "NicolaiTandrup/honeycomb-menu-ng",
  "nicosandller/easy-floorplan",
```

The existing `Sian-Lee-SA/honeycomb-menu` entry remains unchanged. Refresh the
position against live upstream before eventual submission; the patch must change
only `plugin`. JSON parsing, uniqueness and upstream `str.casefold` ordering were
validated. This is a proposed catalog change, not evidence of acceptance.

## Proposed upstream PR

Title: **Add NicolaiTandrup/honeycomb-menu-ng**

Copy this description only after owner review/authorization and checking the links:

```markdown
## Checklist

- [x] I've read the [publishing documentation](https://hacs.xyz/docs/publish/start).
- [x] I've added the [HACS action](https://hacs.xyz/docs/publish/action) to my repository.
- [ ] (For integrations only) I've added the hassfest action. Not applicable: Dashboard/plugin.
- [x] The actions are passing without any disabled checks in my repository.
- [x] I've added a link to the action run on my repository below in the links section.
- [x] I've created a new release of the repository after the validation actions were run successfully.

## Links

Link to current release: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.8.1
Link to successful HACS action (without the ignore key): https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39837224467
Link to successful hassfest action: Not applicable — frontend Dashboard/plugin.

## Project and original-project coexistence

Honeycomb Menu NG is a separately maintained GPL-3.0-or-later derivative of
Sian-Lee-SA/honeycomb-menu. It provides persistent hexagonal Hub/Control cards,
Light and Sonos controls, responsive floorplans and shared cube presentation.
It has its own Honeycomb Menu NG product name, honeycomb-menu-ng.js distribution,
NG runtime namespace and independent release lifecycle. The original catalog
listing is preserved; NG is not presented as an endorsed replacement or transfer.

LICENSE, NOTICE, upstream attribution and GitHub fork/source history are retained.
Full-bundle coexistence tests cover both load orders. Current README and synthetic
stable screenshots: https://github.com/NicolaiTandrup/honeycomb-menu-ng#readme
Runtime contract: https://github.com/NicolaiTandrup/honeycomb-menu-ng/blob/master/docs/NG_RUNTIME.md

This submission describes v1.8.1 stable. Charger development is prerelease-only,
not part of that stable release. Published rules do not expressly prohibit
maintained forks or guarantee a second related listing; co-listing suitability
remains the HACS maintainers' decision. No fork detachment or history rewrite is proposed.
```

## Fork eligibility — documented rule versus open question

No categorical ban on maintained derivative forks was found in the cited rules.
That is **not** confirmation that co-listing NG alongside the original is accepted.
The lowest-risk approach preserves the current fork network, distinct identity,
GPL notices and both listings. Do not detach, delete/recreate or rewrite source.

If clarification is needed, the following inquiry is prepared **but not sent**:

> Is Honeycomb Menu NG, a substantially maintained GPL-3.0-or-later derivative
> with its own product/resource/runtime identity and independent releases,
> eligible for a separate Dashboard/plugin catalog listing alongside
> Sian-Lee-SA/honeycomb-menu? We intend to preserve upstream attribution,
> GitHub fork/history and the original catalog entry. Are additional criteria
> required for this co-listing?

## Owner steps before opening upstream

1. Review this documentation PR and its correction of the stale stable-version
   claims. No master merge is performed automatically.
2. Review the release, official HACS run, current README/screenshots and license.
   Confirm the project distinction and approve any maintainer inquiry separately.
3. **Separately authorize external submission.** From the owner's personal
   account, fork `hacs/default`, create a new branch from fresh upstream master,
   and apply/recheck the single `plugin` entry. Do not work directly on fork master.
4. Run upstream JSON/sorting checks (`python scripts/is_sorted.py` from that
   checkout), inspect the one-line diff, and use the current official PR template.
   Allow maintainer edits; do not request reviewers.
5. Keep the HACS custom-repository install path until catalog inclusion. Keep
   Issue #92 open through upstream review and acceptance.

No retention setting, release record, tag, source history or live HA configuration
is changed by this submission preparation.
