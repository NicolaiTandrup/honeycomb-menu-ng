class ActionRegistry
{
    constructor()
    {
        this._handlers = new Map();
    }

    register(name, handler)
    {
        if( ! name || typeof handler !== 'function' )
            throw new Error('Custom Honeycomb action requires a name and handler.');

        this._handlers.set(name, handler);
        return this;
    }

    has(name)
    {
        return this._handlers.has(name);
    }

    handle(name, context)
    {
        const handler = this._handlers.get(name);

        if( ! handler )
            return false;

        return handler(context || {}) !== false;
    }
}

const customActionRegistry = new ActionRegistry();

module.exports = {
    ActionRegistry,
    customActionRegistry
};
