// NG owns one runtime object; never write original Honeycomb's global APIs.
if (window.honeycombNG && window.honeycombNG.apiVersion !== 1)
    throw new Error('Honeycomb NG runtime namespace is occupied by an unknown API.');
window.honeycombNG = window.honeycombNG || {apiVersion: 1};

// Actual compiled module identity; ordinary release builds retain their version.
const build=require('./core/build-info');
window.honeycombNG.version=build.version;
window.honeycombNG.commit=build.commit;
