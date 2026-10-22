const {validThumbnail} = require('./artwork');

const EMPTY = Object.freeze([]);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function favoriteMap(hass, options)
{
    const source = (hass && hass.states || {})[options.favorites];
    if (!source || ['unknown','unavailable'].includes(source.state)) return null;
    const map = (source.attributes || {}).items;
    if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
    const ids = Object.keys(map);
    if (!ids.length || ids.length > 512 || ids.some(id => !/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,255}$/.test(id) || typeof map[id] !== 'string' || map[id].length > 2048)) return null;
    return map;
}
function context(hass, config)
{
    const options = config && config._sonos;
    if (!hass || !options) return null;
    const connection = hass.connection;
    if (!connection || typeof connection.sendMessagePromise !== 'function') return null;
    const map = favoriteMap(hass, options), states = hass.states || {};
    const player = config.mode === 'sonos-favorite' ? options.player : config.entity, selected = states[player];
    if (!map || !selected || ['unknown','unavailable'].includes(selected.state)) return null;
    const knownPlatform = id => hass.entities && hass.entities[id] && hass.entities[id].platform;
    if (knownPlatform(player) && knownPlatform(player) !== 'sonos') return null;
    const group = (selected.attributes || {}).group_members;
    if (!Array.isArray(group) || !group.includes(player) || !/^media_player\.[a-z0-9_]+$/.test(group[0])) return null;
    const coordinator = group[0], leader = states[coordinator], members = (leader && leader.attributes || {}).group_members;
    if (!leader || ['unknown','unavailable'].includes(leader.state) || !Array.isArray(members) ||
        members[0] !== coordinator || !members.includes(player) || knownPlatform(coordinator) && knownPlatform(coordinator) !== 'sonos') return null;
    // Reordering does not refetch. The sensor still owns display/playback order.
    const key = JSON.stringify([coordinator, Object.keys(map).sort().map(id => [id,map[id]])]);
    return {connection, coordinator, map, key};
}

// One provider per loaded NG bundle/tab. Connection identity isolates HA sites,
// users and sessions. No storage, service calls, synthetic HA states or polling.
function createProvider({now = () => Date.now(), ttl = 300000, timeout = 8000, debounce = 120,
    negativeTtl = 60000, maxContexts = 32, maxRequests = 2,
    schedule = (fn,delay) => setTimeout(fn,delay), unschedule = timer => clearTimeout(timer)} = {})
{
    const connections = new WeakMap();
    let revision = 0;
    function stateFor(connection) {
        let state = connections.get(connection);
        if (!state) {
            state = {connection, entries:new Map(), observers:new Set(), queue:[], raw:0, epoch:0, online:connection.connected !== false};
            connections.set(connection,state);
        }
        return state;
    }
    function pump(state) {
        while (state.online && state.raw < maxRequests && state.queue.length) {
            const job = state.queue.shift();
            if (job.signal.aborted) continue;
            const epoch = state.epoch;
            state.raw++;
            // Timeout cancels application ownership, not the HA transport. An
            // unresolved transport keeps its budget until it replies/reconnects.
            Promise.resolve().then(() => {
                if (job.signal.aborted || epoch !== state.epoch) throw new Error('cancelled');
                return state.connection.sendMessagePromise(job.request);
            }).then(job.resolve,job.reject).finally(() => {
                job.cleanup();
                if (state.epoch === epoch) { state.raw--; pump(state); }
            });
        }
    }
    function read(state, request, signal) {
        return new Promise((resolve,reject) => {
            const job = {request,signal,resolve,reject};
            const abort = () => {
                state.queue = state.queue.filter(candidate => candidate !== job);
                reject(new Error('cancelled'));
            };
            job.cleanup = () => signal.removeEventListener('abort',abort);
            signal.addEventListener('abort',abort,{once:true});
            if (signal.aborted) { abort(); job.cleanup(); return; }
            state.queue.push(job); pump(state);
        });
    }
    async function fetchItems(state, entry, ctx) {
        const request = (type,id) => read(state,{type:'media_player/browse_media',entity_id:ctx.coordinator,
            media_content_type:type,media_content_id:id},entry.abort.signal);
        const root = await request('favorites','');
        if (!root || !Array.isArray(root.children) || root.children.length > 8) throw new Error('schema');
        const folders = new Set(), found = new Map(), identities = new Set();
        let count = 0;
        for (const folder of root.children) {
            if (!folder || folder.media_content_type !== 'favorites_folder' || typeof folder.media_content_id !== 'string' ||
                !folder.media_content_id || folder.media_content_id.length > 512 || folders.has(folder.media_content_id)) throw new Error('schema');
            folders.add(folder.media_content_id);
            const result = await request('favorites_folder',folder.media_content_id);
            if (!result || !Array.isArray(result.children) || (count += result.children.length) > 512) throw new Error('schema');
            for (const item of result.children) {
                if (!item || item.media_content_type !== 'favorite_item_id' || !own(ctx.map,item.media_content_id)) continue;
                if (identities.has(item.media_content_id)) throw new Error('ambiguous');
                identities.add(item.media_content_id);
                // Official sensor and Browse Media both expose favorite.title.
                // Reject a stale/foreign library's colliding FV ID, rather than
                // assigning its artwork to this sensor's differently named item.
                if (typeof item.title !== 'string' || item.title.length > 2048 ||
                    item.title.normalize('NFC').trim() !== ctx.map[item.media_content_id].normalize('NFC').trim()) continue;
                found.set(item.media_content_id,Object.freeze({media_content_id:item.media_content_id,media_content_type:'favorite_item_id',
                    title:item.title,
                    thumbnail:validThumbnail(item.thumbnail) && item.thumbnail.length <= 8192 ? item.thumbnail : null}));
            }
        }
        return Object.freeze(Object.keys(ctx.map).filter(id => found.has(id)).map(id => found.get(id)));
    }
    function notify(entry) { [...entry.consumers].forEach(observer => observer.notify()); }
    function arm(state, entry, ctx) {
        unschedule(entry.refresh);
        if (!entry.consumers.size || entry.status !== 'ready') return;
        entry.refresh = schedule(() => {
            if (state.entries.get(ctx.key) !== entry) return;
            entry.items = EMPTY; entry.status = 'expired'; entry.version = ++revision;
            start(state,entry,ctx); notify(entry);
        },Math.max(1,entry.expires - now()));
    }
    function start(state, entry, ctx) {
        if (!state.online || entry.status === 'pending') return;
        entry.status = 'pending'; entry.abort = new AbortController();
        const epoch = state.epoch;
        entry.deadline = schedule(() => entry.abort.abort(),timeout);
        entry.start = schedule(() => {
            fetchItems(state,entry,ctx).then(items => {
                if (entry.abort.signal.aborted || state.epoch !== epoch || state.entries.get(ctx.key) !== entry) return;
                entry.items = items; entry.status = 'ready'; entry.expires = now() + ttl; entry.version = ++revision;
                arm(state,entry,ctx); notify(entry);
            },() => {
                if (state.epoch !== epoch || state.entries.get(ctx.key) !== entry) return;
                entry.items = EMPTY; entry.status = 'unavailable'; entry.expires = now() + negativeTtl; entry.version = ++revision;
                notify(entry); // Privacy-safe status only; no raw errors/URLs.
            }).finally(() => unschedule(entry.deadline));
        },debounce);
    }
    function remove(state, key, entry) {
        state.entries.delete(key); unschedule(entry.start); unschedule(entry.deadline); unschedule(entry.refresh);
        if (entry.abort) entry.abort.abort();
    }
    function attach(state) {
        if (state.detach) return;
        const reset = online => {
            state.epoch++; state.online = online; state.raw = 0;
            for (const [key,entry] of state.entries) remove(state,key,entry);
            state.queue = [];
            [...state.observers].forEach(observer => { observer.entry = null; observer.notify(); });
        };
        const offline = () => reset(false), ready = () => reset(true);
        if (typeof state.connection.addEventListener === 'function') {
            state.connection.addEventListener('disconnected',offline);
            state.connection.addEventListener('ready',ready);
        }
        state.detach = () => {
            if (typeof state.connection.removeEventListener === 'function') {
                state.connection.removeEventListener('disconnected',offline);
                state.connection.removeEventListener('ready',ready);
            }
            state.detach = null;
        };
    }
    function release(observer) {
        const state = observer.state, entry = observer.entry;
        if (!state) return;
        if (entry) {
            entry.consumers.delete(observer);
            if (!entry.consumers.size) {
                unschedule(entry.refresh);
                if (entry.status === 'pending') remove(state,observer.key,entry);
            }
        }
        state.observers.delete(observer); observer.state = null; observer.entry = null;
        if (!state.observers.size) {
            for (const [key,cached] of state.entries) remove(state,key,cached);
            if (state.detach) state.detach();
        }
    }
    function observe(notifyChange) {
        let disposed = false, queued = false;
        const observer = {state:null,entry:null,key:null,notify:() => {
            if (queued || disposed) return;
            queued = true;
            Promise.resolve().then(() => { queued = false; if (!disposed) notifyChange(); });
        }};
        return {
            update(hass,config) {
                if (disposed) return;
                const ctx = context(hass,config);
                if (!ctx) { release(observer); return; }
                const state = stateFor(ctx.connection);
                if (observer.state !== state || observer.key !== ctx.key) release(observer);
                observer.state = state; observer.key = ctx.key; state.observers.add(observer); attach(state);
                if (!state.online || ctx.connection.connected === false) return;
                let entry = state.entries.get(ctx.key);
                if (!entry) {
                    if (state.entries.size >= maxContexts) {
                        const removable = [...state.entries].find(([,cached]) => !cached.consumers.size);
                        if (!removable) return;
                        remove(state,...removable);
                    }
                    entry = {items:EMPTY,status:'new',version:++revision,consumers:new Set()};
                    state.entries.set(ctx.key,entry);
                }
                observer.entry = entry; entry.consumers.add(observer);
                if (entry.status === 'new' || entry.status !== 'pending' && entry.expires <= now()) start(state,entry,ctx);
                else arm(state,entry,ctx);
            },
            dispose() { disposed = true; release(observer); }
        };
    }
    function peek(hass,config) {
        const ctx = context(hass,config);
        if (!ctx) return {items:EMPTY,status:'not_requested',version:0};
        const state = connections.get(ctx.connection), entry = state && state.entries.get(ctx.key);
        return entry && state.online && ctx.connection.connected !== false && entry.status === 'ready' && entry.expires > now()
            ? {items:entry.items,status:entry.status,version:entry.version}
            : {items:EMPTY,status:state && !state.online ? 'offline' : entry ? entry.status : 'not_requested',version:entry ? entry.version : 0};
    }
    return {observe,peek};
}
const provider = createProvider();
function browseItems(hass, config) { return provider.peek(hass,config).items; }
module.exports = {createProvider,provider,favoriteMap,context,browseItems};
