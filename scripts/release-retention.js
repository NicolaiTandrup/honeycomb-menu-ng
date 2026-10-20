#!/usr/bin/env node
'use strict';
// Mutations target GitHub Release records only. No Git commands, refs/tags APIs, or external services.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const MAX_DELETIONS = 100;
const MAX_PAGES = 1000;

function parseVersion(tag) {
    if (typeof tag !== 'string') return null;
    const match = /^[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(tag);
    if (!match) return null;
    const [major, minor, patch] = match.slice(1, 4).map(Number);
    if (![major, minor, patch].every(Number.isSafeInteger)) return null;
    const pre = match[4] ? match[4].split('.') : [];
    if (pre.some(id => /^\d+$/.test(id) && id.length > 1 && id.startsWith('0'))) return null;
    return {major, minor, patch, pre, normalized: tag.replace(/^[vV]/, '')};
}
function compareCore(a, b) {
    for (const key of ['major', 'minor', 'patch']) if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
    return 0;
}
function train(version) { return `${version.major}.${version.minor}`; }
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
}
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
function fingerprint(release) {
    // Ignore volatile download counts. Include edits, classification, target and assets.
    const fields = ['id', 'tag_name', 'name', 'body', 'draft', 'prerelease', 'published_at', 'created_at', 'updated_at', 'target_commitish', 'immutable'];
    const value = Object.fromEntries(fields.map(key => [key, release[key] ?? null]));
    value.assets = (release.assets || []).map(asset => Object.fromEntries(
        ['id', 'name', 'size', 'state', 'digest', 'updated_at'].map(key => [key, asset[key] ?? null])
    )).sort((a, b) => a.id - b.id);
    return hash(value);
}
function validateInventory(releases) {
    if (!Array.isArray(releases)) throw new Error('Release inventory is not an array.');
    const ids = new Set();
    for (const release of releases) {
        if (!release || !Number.isSafeInteger(release.id) || release.id < 1) throw new Error('Invalid release ID; inventory is incomplete or ambiguous.');
        if (ids.has(release.id)) throw new Error(`Duplicate release ID ${release.id}; pagination may have changed. Fetch again.`);
        ids.add(release.id);
        if (release.assets !== undefined && !Array.isArray(release.assets)) throw new Error(`Invalid assets for release ID ${release.id}.`);
    }
}
function inventoryDigest(releases) {
    validateInventory(releases);
    return hash(releases.map(r => [r.id, fingerprint(r)]).sort((a, b) => a[0] - b[0]));
}
function classify(release) {
    const version = parseVersion(release.tag_name);
    if (release.draft === true) return {kind: 'draft', version};
    if (typeof release.draft !== 'boolean' || typeof release.prerelease !== 'boolean') return {kind: 'ambiguous', version, reason: 'Missing boolean draft/prerelease flags.'};
    if (!version) return {kind: 'ambiguous', version, reason: 'Unknown or malformed SemVer tag; never infer a version from the title.'};
    if (!release.published_at || !Number.isFinite(Date.parse(release.published_at))) return {kind: 'ambiguous', version, reason: 'Missing/invalid publication date.'};
    if (!release.prerelease && version.pre.length) return {kind: 'ambiguous', version, reason: 'API stable flag conflicts with a SemVer prerelease suffix.'};
    return {kind: release.prerelease ? 'prerelease' : 'stable', version};
}
function planRetention(releases, latest, repository) {
    validateInventory(releases);
    const blocked = [], notes = [];
    const classified = releases.map(release => ({release, ...classify(release)}));
    const latestKind = latest && classify(latest);
    const basis = latestKind?.kind === 'stable' ? latestKind.version : null;
    const found = latest && releases.find(r => r.id === latest.id);
    if (!basis) blocked.push('GitHub latest is absent or not a valid published stable SemVer release. Owner review required.');
    if (latest && (!found || fingerprint(found) !== fingerprint(latest))) blocked.push('Latest stable differs from the paginated inventory. Fetch again before any deletion.');
    if (basis && classified.some(r => r.kind === 'stable' && compareCore(r.version, basis) > 0))
        blocked.push('GitHub latest is older than another valid stable release. Resolve latest designation before cleanup.');

    const versions = new Map();
    for (const row of classified) if (row.version && row.kind !== 'draft') {
        const key = row.version.normalized;
        if (!versions.has(key)) versions.set(key, []);
        versions.get(key).push(row.release.id);
    }
    const duplicates = new Set([...versions.values()].filter(ids => ids.length > 1).flat());
    if (latest && duplicates.has(latest.id)) blocked.push('Latest stable has duplicate normalized version tags; owner review required.');
    let previous = null;
    if (basis?.minor > 0) {
        previous = `${basis.major}.${basis.minor - 1}`;
        notes.push(`Previous train is numeric predecessor ${previous}, even if no releases exist in that train.`);
    } else if (basis?.major > 0) {
        const prior = classified.filter(r => r.kind === 'stable' && r.version.major === basis.major - 1);
        if (!prior.length) blocked.push('Cannot establish the preceding major\'s last stable minor train. Owner must review the dry-run; no deletion.');
        else {
            const minor = Math.max(...prior.map(r => r.version.minor));
            previous = `${basis.major - 1}.${minor}`;
            notes.push(`Rollover predecessor ${previous} comes from published stable releases, not a decimal assumption that minors stop at 9.`);
            if (classified.some(r => r.kind === 'ambiguous' && !duplicates.has(r.release.id)) ||
                classified.some(r => r.kind === 'prerelease' && r.version.major === basis.major - 1 && r.version.minor > minor))
                blocked.push('Rollover evidence is ambiguous (unknown records or a later prior-major prerelease train). Owner review required; no deletion.');
        }
    } else if (basis) notes.push('v0.0 has no preceding SemVer train.');

    const rows = classified.map(({release, kind, version, reason}) => {
        let status = 'keep';
        if (release.draft === true) reason = 'All drafts are preserved, regardless of tag.';
        else if (latest && release.id === latest.id) reason = 'Latest stable is unconditionally preserved.';
        else if (duplicates.has(release.id)) { status = 'skipped'; reason = 'Duplicate normalized version tags are ambiguous.'; }
        else if (kind === 'ambiguous') status = 'skipped';
        else if (!basis) { status = 'skipped'; reason = 'No safe stable retention basis.'; }
        else if (kind === 'stable') {
            status = version.major >= Math.max(0, basis.major - 1) ? 'keep' : 'delete';
            reason = status === 'keep' ? 'Stable current/previous MAJOR (or ahead of basis).' : 'Stable older than the previous MAJOR.';
        } else {
            const ahead = version.major > basis.major || (version.major === basis.major && version.minor > basis.minor);
            status = ahead || train(version) === train(basis) || train(version) === previous ? 'keep' : 'delete';
            reason = ahead ? 'Prerelease train is ahead of latest stable; preserve it.' : status === 'keep'
                ? 'Prerelease current/immediately preceding MINOR train.' : 'Prerelease older than the retained MINOR trains.';
        }
        return {id: release.id, tag: typeof release.tag_name === 'string' ? release.tag_name : '(missing tag)',
            kind, version: version?.normalized || null, status, reason, fingerprint: fingerprint(release)};
    }).sort((a, b) => a.id - b.id);
    const counts = Object.fromEntries(['keep', 'delete', 'skipped'].map(status => [status, rows.filter(row => row.status === status).length]));
    if (counts.delete > MAX_DELETIONS) blocked.push(`Plan exceeds ${MAX_DELETIONS} release deletions. Review the inventory and limit in a separate change.`);
    const plan = {schema: 1, repository, basis: basis ? {id: latest.id, tag: latest.tag_name, version: basis.normalized, fingerprint: fingerprint(latest)} : null,
        previousTrain: previous, inventoryDigest: inventoryDigest(releases), rows, counts, blocked, notes};
    return {...plan, digest: hash(plan)};
}

class GitHubAPI {
    constructor({repository, token, fetchImpl = globalThis.fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms))}) {
        if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository) || ['.', '..'].includes(repository.split('/')[1])) throw new Error('Invalid owner/repository.');
        if (!token) throw new Error('GITHUB_TOKEN is required for live inventory.');
        this.repository = repository; this.token = token; this.fetch = fetchImpl; this.wait = wait;
        this.root = `/repos/${repository}`; this.remaining = null;
    }
    async request(method, suffix, {missing = false} = {}) {
        if (!['GET', 'DELETE'].includes(method) || !/^\/(?:releases(?:\?per_page=100&page=[1-9]\d*|\/latest|\/[1-9]\d*)?|actions\/runs\/[1-9]\d*)$/.test(suffix) ||
            (method === 'DELETE' && !/^\/releases\/[1-9]\d*$/.test(suffix))) throw new Error('Refusing an API operation outside GitHub Release records.');
        for (let attempt = 0; attempt < (method === 'GET' ? 3 : 1); attempt++) {
            let response;
            try {
                response = await this.fetch(`https://api.github.com${this.root}${suffix}`, {
                    method, redirect: 'error', headers: {Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'honeycomb-release-retention'}, signal: AbortSignal.timeout(30000)
                });
            } catch (_) {
                if (method === 'GET' && attempt < 2) { await this.wait(250 * (attempt + 1)); continue; }
                throw new Error(`${method} Release API request failed (network/timeout); no blind mutation retry.`);
            }
            const remaining = response.headers.get('x-ratelimit-remaining');
            if (remaining !== null && /^\d+$/.test(remaining)) this.remaining = Number(remaining);
            if (response.status === 404 && missing) return null;
            if (response.ok) return response;
            if (method === 'GET' && [429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
                const retry = response.headers.get('retry-after');
                if (retry && (!/^\d+$/.test(retry) || Number(retry) > 2)) throw new Error('GitHub requests a longer retry delay; abort and rerun later.');
                await this.wait(retry ? Number(retry) * 1000 : 250 * (attempt + 1)); continue;
            }
            throw new Error(`${method} Release API returned HTTP ${response.status}; remaining=${response.headers.get('x-ratelimit-remaining') || 'unknown'}, reset=${response.headers.get('x-ratelimit-reset') || 'unknown'}. Check GITHUB_TOKEN permissions/rate limits; aborting.`);
        }
    }
    async list() {
        const releases = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
            const response = await this.request('GET', `/releases?per_page=100&page=${page}`);
            const batch = await response.json();
            if (!Array.isArray(batch) || batch.length > 100) throw new Error('Malformed or oversized release page.');
            releases.push(...batch); validateInventory(releases);
            const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get('link') || '');
            if (next) {
                const url = new URL(next[1]);
                if (url.origin !== 'https://api.github.com' || url.pathname !== `${this.root}/releases` || url.username || url.password || url.hash ||
                    url.searchParams.get('page') !== String(page + 1) || url.searchParams.get('per_page') !== '100' || [...url.searchParams].length !== 2)
                    throw new Error('Unsafe or repeated pagination link; refusing incomplete inventory.');
            }
            if (!next && batch.length < 100) return releases;
        }
        throw new Error(`Inventory exceeds ${MAX_PAGES} pages; refusing partial cleanup.`);
    }
    async run(id) {
        if (!/^[1-9]\d*$/.test(String(id))) throw new Error('Invalid publisher run ID.');
        return (await this.request('GET', `/actions/runs/${id}`)).json();
    }
    async latest() { const response = await this.request('GET', '/releases/latest', {missing: true}); return response ? response.json() : null; }
    async get(id) { const response = await this.request('GET', `/releases/${id}`, {missing: true}); return response ? response.json() : null; }
    async delete(id) {
        const response = await this.request('DELETE', `/releases/${id}`);
        if (response.status !== 204) throw new Error(`DELETE returned unexpected HTTP ${response.status}; verify the release before retrying.`);
    }
}
async function inventory(api) {
    // Latest and list are fetched afresh; any inconsistency blocks apply.
    const releases = await api.list(), latest = await api.latest();
    return {releases, latest};
}
function assertEnabled(env) {
    if (env.RETENTION_DRY_RUN_ONLY === 'true') throw new Error('This publication is explicitly dry-run only; deletion is forbidden.');
    if (env.GITHUB_ACTIONS !== 'true' || env.RELEASE_RETENTION_ENABLED !== 'true') throw new Error('Deletion disabled. Owner must first review the dry-run and explicitly enable RELEASE_RETENTION_ENABLED.');
}
function authorizeApply(env, event, latest, repository, publisher = null) {
    assertEnabled(env);
    if (event.repository?.full_name?.toLowerCase() !== repository.toLowerCase() || !latest || classify(latest).kind !== 'stable')
        throw new Error('Repository or latest-stable classification does not match the publication context.');
    if (env.GITHUB_EVENT_NAME === 'release') {
        if (event.action !== 'published' || event.release?.draft !== false || event.release?.prerelease !== false)
            throw new Error('Deletion requires a published stable release event; direct manual runs are always dry-run.');
        if (event.release.id !== latest.id || event.release.tag_name !== latest.tag_name || classify(event.release).kind !== 'stable')
            throw new Error('Published event does not match the current latest stable release. A newer stable or ambiguous event requires a new plan.');
        return;
    }
    // workflow_call inherits its publisher's event name. The ID input exists only
    // on the reusable entry point, never on this workflow's manual dispatch.
    const published = Date.parse(latest.published_at), started = Date.parse(publisher?.run_started_at);
    const branch = event.repository.default_branch;
    if (!/^[1-9]\d*$/.test(env.RETENTION_PUBLISHED_RELEASE_ID || '') || env.RETENTION_PUBLISHED_RELEASE_ID !== String(latest.id) ||
        !publisher || String(publisher.id) !== env.GITHUB_RUN_ID || String(publisher.run_attempt) !== env.GITHUB_RUN_ATTEMPT || publisher.repository?.full_name?.toLowerCase() !== repository.toLowerCase() ||
        publisher.status !== 'in_progress' || !branch || publisher.head_branch !== branch ||
        !env.GITHUB_WORKFLOW_REF?.startsWith(`${repository}/.github/workflows/`) || !env.GITHUB_WORKFLOW_REF.endsWith(`@refs/heads/${branch}`) ||
        ['pull_request', 'pull_request_target'].includes(publisher.event) || !Number.isFinite(started) || !Number.isFinite(published) || published < started)
        throw new Error('Direct manual runs are dry-run only. Reusable cleanup requires proof of a fresh stable publication during this trusted, active default-branch publisher run.');
}
async function publisherProof(api, env) {
    return env.GITHUB_EVENT_NAME !== 'release' && env.RETENTION_PUBLISHED_RELEASE_ID ? api.run(env.GITHUB_RUN_ID) : null;
}
async function applyPlan(api, reviewedPlan, {env, event, progress = () => {}}) {
    const report = {mode: 'apply', deleted: [], uncertain: [], failed: null, plan: reviewedPlan};
    try {
        const initial = await inventory(api);
        authorizeApply(env, event, initial.latest, api.repository, await publisherProof(api, env));
        const fresh = planRetention(initial.releases, initial.latest, api.repository);
        report.plan = fresh;
        if (fresh.blocked.length) throw new Error(fresh.blocked.join(' '));
        if (fresh.digest !== reviewedPlan.digest || reviewedPlan.schema !== 1) throw new Error('Inventory/policy changed since the read-only plan; abort before deletion and review a fresh dry-run.');
        const candidates = fresh.rows.filter(row => row.status === 'delete');
        const pages = Math.floor(initial.releases.length / 100) + 1;
        const needed = candidates.length * (pages + 4 + (env.RETENTION_PUBLISHED_RELEASE_ID ? 1 : 0)) + pages + 2;
        if (candidates.length && api.remaining !== null && api.remaining < needed + 20)
            throw new Error(`Insufficient API budget for safe revalidation: remaining=${api.remaining}, estimated=${needed} plus 20 reserved. Rerun after reset; no deletion attempted.`);
        let remaining = initial.releases;
        for (const row of candidates) {
            const current = await inventory(api);
            authorizeApply(env, event, current.latest, api.repository, await publisherProof(api, env));
            if (inventoryDigest(current.releases) !== inventoryDigest(remaining)) throw new Error('Release inventory changed during cleanup; stopping remaining deletions.');
            const release = await api.get(row.id);
            if (!release || fingerprint(release) !== row.fingerprint || release.draft || release.id === current.latest.id)
                throw new Error(`Release ID ${row.id} changed/disappeared before deletion; stopping.`);
            progress({...report, attempting: {id: row.id, tag: row.tag}});
            try { await api.delete(row.id); }
            catch (error) {
                const absent = await api.get(row.id).then(value => value === null, () => null);
                report.uncertain.push({id: row.id, tag: row.tag, absent, reason: 'Mutation failed; absence checked without retrying DELETE.'});
                throw error;
            }
            let verified;
            try { verified = await api.get(row.id); }
            catch (error) {
                report.uncertain.push({id: row.id, tag: row.tag, absent: null, reason: 'DELETE succeeded but verification failed; inspect this ID before retrying.'});
                throw error;
            }
            if (verified !== null) {
                report.uncertain.push({id: row.id, tag: row.tag, absent: false, reason: 'DELETE returned success but the release still exists.'});
                throw new Error(`Cannot verify deletion of release ID ${row.id}; stopping.`);
            }
            report.deleted.push({id: row.id, tag: row.tag});
            remaining = remaining.filter(r => r.id !== row.id);
            progress(report);
        }
        const final = await inventory(api);
        authorizeApply(env, event, final.latest, api.repository, await publisherProof(api, env));
        if (inventoryDigest(final.releases) !== inventoryDigest(remaining)) throw new Error('Final inventory changed unexpectedly; review the partial result.');
    } catch (error) { report.failed = error.message; }
    return report;
}
function escape(value) { return String(value).replace(/[&<>|\r\n`]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','|':'&#124;','\r':'\\r','\n':'\\n','`':'&#96;'}[char])); }
function markdown(report) {
    const plan = report.plan;
    const lines = ['# GitHub Release retention', '', `Mode: **${report.mode}**. Deletion gate: **${report.enabled ? 'enabled' : 'disabled'}**.`, ''];
    if (plan) {
        lines.push(`Stable basis: <code>${escape(plan.basis?.tag || 'none')}</code>; previous minor train: <code>${escape(plan.previousTrain || 'none')}</code>.`, '',
            `Inventory: ${plan.rows.length}; keep ${plan.counts.keep}; eligible delete ${plan.counts.delete}; skipped ${plan.counts.skipped}.`, '',
            `Confirmed deleted: ${report.deleted?.length || 0}; uncertain mutations: ${report.uncertain?.length || 0}.`, '',
            ...plan.blocked.map(reason => `- **BLOCKED:** ${escape(reason)}`), ...plan.notes.map(note => `- ${escape(note)}`), '',
            '| Release ID | Exact tag | Kind | Decision | Reason |', '|---:|---|---|---|---|',
            ...plan.rows.map(row => `| ${row.id} | <code>${escape(row.tag)}</code> | ${row.kind} | ${row.status} | ${escape(row.reason)} |`), '');
    }
    if (report.failed) lines.push(`**Stopped:** ${escape(report.failed)}`, '');
    if (report.deleted?.length) lines.push('Confirmed removed records: ' + report.deleted.map(row => `<code>${escape(row.tag)}</code> (#${row.id})`).join(', '), '');
    for (const row of report.uncertain || []) lines.push(`Uncertain mutation #${row.id} <code>${escape(row.tag)}</code>: absent=${row.absent}; ${escape(row.reason)}`, '');
    lines.push('Only GitHub Release records are eligible. No Git tags, refs, branches, commits, files or history are deleted.', '',
        'If blocked, leave deletion disabled and request owner review of this inventory. Deletion cannot restore release metadata/assets; retaining tags is not a backup of release records.', '');
    return lines.join('\n');
}
async function main(argv = process.argv.slice(2), env = process.env) {
    let report = {mode: 'dry-run', enabled: false, deleted: [], uncertain: [], failed: null};
    let output = env.RETENTION_OUTPUT_DIR || 'release-retention-report';
    try {
        const args = {};
        for (let i = 0; i < argv.length; i++) {
            const key = argv[i];
            if (['--apply', '--dry-run'].includes(key)) { if (args.mode) throw new Error('Choose only one mode.'); args.mode = key; }
            else if (['--inventory', '--latest', '--repository', '--output', '--plan'].includes(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) {
                if (args[key]) throw new Error('Duplicate CLI argument.'); args[key] = argv[++i];
                if (key === '--output') output = args[key];
            } else throw new Error('Unknown or incomplete CLI argument.');
        }
        output = args['--output'] || output;
        const repository = args['--repository'] || env.GITHUB_REPOSITORY;
        report.mode = args.mode === '--apply' ? 'apply' : 'dry-run';
        report.enabled = env.RELEASE_RETENTION_ENABLED === 'true';
        if (args['--inventory']) {
            if (report.mode === 'apply') throw new Error('Offline inventory cannot authorize deletion.');
            if (!args['--latest']) throw new Error('Offline inventory requires an explicit latest-stable snapshot.');
            report.plan = planRetention(JSON.parse(fs.readFileSync(args['--inventory'])), JSON.parse(fs.readFileSync(args['--latest'])), repository);
        } else {
            const api = new GitHubAPI({repository, token: env.GITHUB_TOKEN});
            if (report.mode === 'apply') {
                if (!args['--plan']) throw new Error('Apply requires this run\'s read-only plan artifact.');
                const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH));
                const plan = JSON.parse(fs.readFileSync(args['--plan']));
                // Check the event/gate before even beginning live apply preflight.
                assertEnabled(env);
                if (env.GITHUB_EVENT_NAME === 'release') authorizeApply(env, event, event.release, repository);
                else if (!env.RETENTION_PUBLISHED_RELEASE_ID) throw new Error('Direct manual runs are always dry-run.');
                report = {...await applyPlan(api, plan, {env, event, progress: partial => {
                    fs.mkdirSync(output, {recursive: true}); fs.writeFileSync(path.join(output, 'progress.json'), JSON.stringify(partial, null, 2) + '\n');
                }}), enabled: true};
            } else {
                const current = await inventory(api);
                report.plan = planRetention(current.releases, current.latest, repository);
            }
        }
        if (report.plan?.blocked.length) report.failed = report.plan.blocked.join(' ');
    } catch (error) { report.failed = error.message; }
    fs.mkdirSync(output, {recursive: true});
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    if (report.plan) fs.writeFileSync(path.join(output, 'plan.json'), JSON.stringify(report.plan, null, 2) + '\n');
    const summary = markdown(report);
    fs.writeFileSync(path.join(output, 'summary.md'), summary);
    if (env.GITHUB_STEP_SUMMARY) {
        const bounded = Buffer.byteLength(summary) <= 900000 ? summary : summary.split('| Release ID |')[0] + (report.failed ? `\n**Stopped:** ${escape(report.failed)}\n` : '') + '\nFull exact-tag inventory exceeds the Actions summary limit. Download summary.md and plan.json from this run\'s retention artifact.\n';
        fs.appendFileSync(env.GITHUB_STEP_SUMMARY, bounded);
    }
    console.log(`Retention ${report.mode}: ${report.failed ? 'BLOCKED/FAILED' : 'OK'}; keep=${report.plan?.counts.keep ?? '?'}, eligible=${report.plan?.counts.delete ?? '?'}, skipped=${report.plan?.counts.skipped ?? '?'}, confirmed-deleted=${report.deleted.length}. Report: ${output}`);
    return report.failed ? 1 : 0;
}
module.exports = {parseVersion, compareCore, classify, planRetention, fingerprint, inventoryDigest, GitHubAPI, inventory, authorizeApply, applyPlan, markdown, main, MAX_DELETIONS};
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(() => { console.error('Retention failed while writing diagnostics; no further mutations will run.'); process.exitCode = 1; });
