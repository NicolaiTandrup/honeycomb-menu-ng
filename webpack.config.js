/**
 * @Author: Sian Croser
 * @Date:   2020-04-27T05:25:15+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: webpack.config.js
 * @Last modified by:   Sian Croser
 * @Last modified time: 2020-04-27T05:26:01+09:30
 * @License: GPL-3
 */
const path = require('path');
const webpack = require('webpack');
const build=require('./scripts/build-version').localMetadata(require('./package.json').version);

module.exports = {
    entry: './src/honeycomb-menu.js',
    plugins: [new webpack.BannerPlugin({banner: `Honeycomb Menu NG v${build.version}`}),
        new webpack.DefinePlugin({HONEYCOMB_BUILD_VERSION:JSON.stringify(build.version),HONEYCOMB_BUILD_COMMIT:JSON.stringify(build.commit)})],
    mode: 'production',
    output: {
        filename: 'honeycomb-menu-ng.js',
        path: path.resolve(__dirname)
    }
};
