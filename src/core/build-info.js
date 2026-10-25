// Replaced by webpack, never inferred from the resource URL or HA version.
const version=typeof HONEYCOMB_BUILD_VERSION === 'string' && HONEYCOMB_BUILD_VERSION.trim()
    ? HONEYCOMB_BUILD_VERSION : 'Version unavailable';
const commit=typeof HONEYCOMB_BUILD_COMMIT === 'string' ? HONEYCOMB_BUILD_COMMIT : null;
module.exports={version,commit};
