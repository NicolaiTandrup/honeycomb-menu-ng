class ModuleRegistry
{
    constructor()
    {
        this._modules = [];
    }

    register(module)
    {
        if( ! module || typeof module !== 'object' || ! module.id )
            throw new Error('Honeycomb module requires a unique id.');

        this._modules = this._modules.filter(existing => existing.id !== module.id);
        this._modules.push(module);
        this._modules.sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
        return this;
    }

    get(id)
    {
        if( ! id )
            return null;

        return this._modules.find(module =>
            module.id === id ||
            (Array.isArray(module.aliases) && module.aliases.includes(id))
        ) || null;
    }

    resolvePresentation(mode)
    {
        if( ! mode )
            return null;

        return this._modules.find(module =>
            module.presentation &&
            Array.isArray(module.persistentModes) &&
            module.persistentModes.includes(mode)
        ) || null;
    }

    resolve(item, hass)
    {
        const explicit = item && (item.module || item.profile);

        if( explicit )
        {
            const selected = this.get(explicit);

            if( selected )
                return selected;
        }

        for( const module of this._modules )
        {
            if( typeof module.matches !== 'function' )
                continue;

            if( module.matches(item || {}, hass || null) )
                return module;
        }

        return this.get('generic');
    }

    ids()
    {
        return this._modules.map(module => module.id);
    }
}

module.exports = {
    ModuleRegistry
};
