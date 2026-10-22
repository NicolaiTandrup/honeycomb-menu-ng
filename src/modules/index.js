const { ModuleRegistry } = require('../core/module-registry.js');
const { customActionRegistry } = require('../core/action-registry.js');

const generic = require('./generic/index.js');
const light = require('./light/index.js');
const media = require('./media/index.js');
const sonos = require('./sonos/index.js');
const charger = require('./charger/index.js');
const lightActions = require('./light/actions.js');
const mediaActions = require('./media/actions.js');

const moduleRegistry = new ModuleRegistry();

moduleRegistry
    .register(charger)
    .register(sonos)
    .register(light)
    .register(media)
    .register(generic);

lightActions.registerActions(customActionRegistry);
mediaActions.registerActions(customActionRegistry);
sonos.registerActions(customActionRegistry);
charger.registerActions(customActionRegistry);

module.exports = {
    moduleRegistry,
    modules: {
        generic,
        light,
        media,
        sonos,
        charger
    }
};
