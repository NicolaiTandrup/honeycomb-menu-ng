// NG owns one runtime object; never write original Honeycomb's global APIs.
if (window.honeycombNG && window.honeycombNG.apiVersion !== 1)
    throw new Error('Honeycomb NG runtime namespace is occupied by an unknown API.');
window.honeycombNG = window.honeycombNG || {apiVersion: 1};
