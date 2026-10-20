// HA-style declarative conditions. null is indeterminate, and never visible.
// Dependencies are scalar snapshots, so same-object HA/attribute mutations work.
const ENTITY = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/;
const UNKNOWN = new Set(['unknown', 'unavailable']);
const and = values => values.includes(false) ? false : values.includes(null) ? null : true;
const or = values => values.includes(true) ? true : values.includes(null) ? null : false;
function numeric(value) {
    return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value))
        ? Number(value) : null;
}
function compileVisibility(input, path = 'visibility') {
    const dependencies = new Map();
    const fail = (where, message) => { throw new Error(`${where}: ${message}`); };
    const dependency = (entity, attribute) => {
        if (typeof entity !== 'string' || !ENTITY.test(entity)) fail(path, 'entity must be a literal entity ID.');
        const key = JSON.stringify([entity, attribute || null]);
        dependencies.set(key, {entity, attribute});
    };
    const compile = (condition, where) => {
        if (!condition || typeof condition !== 'object' || Array.isArray(condition)) fail(where, 'expected a condition object.');
        const op = condition.condition;
        if (['and','or','not'].includes(op)) {
            if (Object.keys(condition).some(k => !['condition','conditions'].includes(k))) fail(where, 'unsupported logical condition field.');
            if (!Array.isArray(condition.conditions) || !condition.conditions.length) fail(where, 'conditions must be a nonempty list.');
            const children = condition.conditions.map((c,i) => compile(c, `${where}.conditions[${i}]`));
            return hass => {
                const values = children.map(child => child(hass));
                const value = op === 'or' ? or(values) : and(values);
                // Lovelace NOT negates the AND of its child list.
                return op === 'not' && value !== null ? !value : value;
            };
        }
        if (!['state','numeric_state'].includes(op)) fail(where, `unsupported condition ${String(op)}.`);
        const allowed = ['condition','entity','entity_id','attribute'].concat(op === 'state' ? ['state','state_not'] : ['above','below']);
        if (Object.keys(condition).some(k => !allowed.includes(k))) fail(where, 'unsupported condition field.');
        if (condition.entity !== undefined && condition.entity_id !== undefined) fail(where, 'use entity or entity_id, not both.');
        const entity = condition.entity || condition.entity_id;
        if (condition.attribute !== undefined && (typeof condition.attribute !== 'string' || !condition.attribute)) fail(where, 'attribute must be a nonempty string.');
        dependency(entity, condition.attribute);
        const read = hass => {
            const state = (hass && hass.states || {})[entity];
            if (!state) return null;
            if (condition.attribute !== undefined) {
                if (UNKNOWN.has(state.state)) return null;
                const value = (state.attributes || {})[condition.attribute];
                return value === undefined || value === null ? null : value;
            }
            return state.state === undefined ? null : state.state;
        };
        if (op === 'state') {
            if ((condition.state === undefined) === (condition.state_not === undefined)) fail(where, 'supply exactly one of state or state_not.');
            const expected = condition.state !== undefined ? condition.state : condition.state_not;
            const values = Array.isArray(expected) ? expected.slice() : [expected];
            if (!values.length || values.some(v => typeof v !== 'string')) fail(where, 'state/state_not must be a string or nonempty string list.');
            return hass => {
                const value = read(hass);
                if (value === null) return null;
                const matches = values.includes(String(value));
                // Unknown/unavailable only resolve when explicitly named; a
                // negative or NOT condition cannot accidentally reveal a cube.
                if (UNKNOWN.has(value) && !matches) return null;
                return condition.state !== undefined ? matches : !matches;
            };
        }
        if (condition.above === undefined && condition.below === undefined) fail(where, 'numeric_state requires above or below.');
        const bound = key => {
            const value = condition[key];
            if (value === undefined) return () => undefined;
            const number = numeric(value);
            if (number !== null) return () => number;
            if (typeof value !== 'string' || !ENTITY.test(value)) fail(where, `${key} must be a finite number or literal entity ID.`);
            dependency(value);
            return hass => numeric(((hass && hass.states || {})[value] || {}).state);
        };
        const above = bound('above'), below = bound('below');
        return hass => {
            const value = numeric(read(hass)), min = above(hass), max = below(hass);
            if (value === null || min === null || max === null) return null;
            return (min === undefined || value > min) && (max === undefined || value < max);
        };
    };
    if (input === undefined) return {dependencies, evaluate: () => true};
    // Top-level lists use AND; an explicit [] is the always-visible identity.
    const list = Array.isArray(input) ? input : [input];
    const children = list.map((condition,i) => compile(condition, `${path}[${i}]`));
    return {dependencies, evaluate: hass => and(children.map(child => child(hass)))};
}
function snapshot(hass, dependency) {
    const state = (hass && hass.states || {})[dependency.entity];
    return JSON.stringify(state ? [true, state.state, dependency.attribute === undefined ? null : (state.attributes || {})[dependency.attribute]] : [false]);
}
class VisibilityIndex {
    constructor(entries, hass) {
        this.conditions = new Map(); this.dependencies = new Map(); this.dependents = new Map();
        this.snapshots = new Map(); this.values = new Map();
        this.metrics = {evaluations:0, dependencyReads:0};
        for (const entry of entries) {
            const compiled = compileVisibility(entry.visibility, `${entry.id}.visibility`);
            this.conditions.set(entry.id, compiled);
            for (const [key, dependency] of compiled.dependencies) {
                this.dependencies.set(key, dependency);
                if (!this.dependents.has(key)) this.dependents.set(key, new Set());
                this.dependents.get(key).add(entry.id);
            }
        }
        this.update(hass, true);
    }
    update(hass, initial = false) {
        const affected = new Set(initial ? this.conditions.keys() : []);
        for (const [key, dependency] of this.dependencies) {
            this.metrics.dependencyReads++;
            const value = snapshot(hass, dependency);
            if (value !== this.snapshots.get(key)) {
                this.snapshots.set(key, value);
                for (const id of this.dependents.get(key)) affected.add(id);
            }
        }
        let changed = false;
        this.statusChanged = false;
        for (const id of affected) {
            this.metrics.evaluations++;
            const value = this.conditions.get(id).evaluate(hass);
            if (value !== this.values.get(id)) this.statusChanged = true;
            // false and indeterminate are both structurally hidden.
            if ((value === true) !== (this.values.get(id) === true)) changed = true;
            this.values.set(id, value);
        }
        return changed;
    }
}
module.exports = {compileVisibility, VisibilityIndex};
