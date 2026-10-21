'use strict';
// SemVer beta.N, including optional build metadata; no stable/alpha/rc versions.
const numeric = '(?:0|[1-9]\\d*)';
const betaVersion = new RegExp(`^${numeric}\\.${numeric}\\.${numeric}-beta\\.${numeric}(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`);
const isBetaVersion = value => typeof value === 'string' && betaVersion.test(value);
module.exports = {isBetaVersion};
