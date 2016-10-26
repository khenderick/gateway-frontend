"use strict";

const webpack = require('webpack');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const easyWebpack = require('@easy-webpack/core');
const generateConfig = easyWebpack.default;
const get = easyWebpack.get;
const path = require('path');
const environment = process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() || 'development';
const envSettings = require('./env.' + environment + '.js');

// basic configuration:
const title = 'OpenMotics Gateway';
const baseUrl = '/';
const rootDir = path.resolve();
const srcDir = path.resolve('src');
const outDir = path.resolve('dist');

const coreBundles = {
    bootstrap: [
        'aurelia-bootstrapper-webpack',
        'aurelia-polyfills',
        'aurelia-pal',
        'aurelia-pal-browser',
        'regenerator-runtime',
        'bluebird'
    ],
    aurelia: [
        'aurelia-bootstrapper-webpack',
        'aurelia-binding',
        'aurelia-dependency-injection',
        'aurelia-dialog',
        'aurelia-event-aggregator',
        'aurelia-framework',
        'aurelia-history',
        'aurelia-history-browser',
        'aurelia-i18n',
        'aurelia-loader',
        'aurelia-loader-webpack',
        'aurelia-logging',
        'aurelia-logging-console',
        'aurelia-metadata',
        'aurelia-pal',
        'aurelia-pal-browser',
        'aurelia-path',
        'aurelia-polyfills',
        'aurelia-route-recognizer',
        'aurelia-router',
        'aurelia-task-queue',
        'aurelia-templating',
        'aurelia-templating-binding',
        'aurelia-templating-router',
        'aurelia-templating-resources'
    ]
};

const baseConfig = {
    plugins: [
        new webpack.NormalModuleReplacementPlugin(/\/iconv-loader$/, 'node-noop'),
        new FaviconsWebpackPlugin({
            logo: 'images/logo_l.png',
            title: 'OpenMotics Gateway'
        })
    ],
    resolve: {
        root: [
            path.resolve('./src')
        ]
    },
    entry: {
        'app': [/* this is filled by the aurelia-webpack-plugin */],
        'aurelia-bootstrap': coreBundles.bootstrap,
        'aurelia': coreBundles.aurelia.filter(pkg => coreBundles.bootstrap.indexOf(pkg) === -1)
    },
    output: {
        path: outDir
    },
    node: {
        net: 'empty',
        dns: 'empty'
    },
    module: {
        loaders: [
            {test: /\.json$/, loader: 'json-loader'}
        ]
    },
    devtool: 'inline-source-map'
};

let config;
switch (environment) {
    case 'production':
        let WebpackMd5Hash = require('webpack-md5-hash');
        process.env.NODE_ENV = 'production';
        baseConfig.output.publicPath = '/static/';
        config = generateConfig(
            baseConfig,
            // TODO: Revert to @easy-webpack/config-env-production once the dedupe is optional. Giving some trouble
            {
                debug: false,
                devtool: 'source-map',
                output: {
                    filename: '[name].[chunkhash].bundle.js',
                    sourceMapFilename: '[name].[chunkhash].bundle.map',
                    chunkFilename: '[id].[chunkhash].chunk.js'
                },
                devServer: {
                    port: 9000,
                    host: 'localhost',
                    historyApiFallback: true,
                    watchOptions: {
                        aggregateTimeout: 300,
                        poll: 1000
                    },
                    outputPath: baseConfig.output.path
                },
                plugins: [
                    new WebpackMd5Hash()
                ].concat(baseConfig.plugins),
                htmlLoader: {
                    minimize: true,
                    removeAttributeQuotes: false,
                    caseSensitive: true,
                }
            },
            require('@easy-webpack/config-aurelia')({root: rootDir, src: srcDir, title: title, baseUrl: baseUrl}),
            require('@easy-webpack/config-babel')(),
            require('@easy-webpack/config-html')(),
            require('@easy-webpack/config-css')({filename: 'styles.css', allChunks: true, sourceMap: false}),
            require('@easy-webpack/config-fonts-and-images')(),
            require('@easy-webpack/config-global-bluebird')(),
            require('@easy-webpack/config-global-jquery')(),
            require('@easy-webpack/config-global-regenerator')(),
            require('@easy-webpack/config-generate-index-html')({minify: true}),
            require('@easy-webpack/config-common-chunks-simple')({appChunkName: 'app', firstChunk: 'aurelia-bootstrap'}),
            require('@easy-webpack/config-uglify')({debug: false}),
            {
                plugins: [
                    new webpack.DefinePlugin({
                        __VERSION__: JSON.stringify(require("./package.json").version),
                        __SETTINGS__: JSON.stringify(envSettings.settings)
                    })
                ]
            }
        );
        break;
    default:
    case 'development':
        process.env.NODE_ENV = 'development';
        baseConfig.output.publicPath = '';
        config = generateConfig(
            baseConfig,
            require('@easy-webpack/config-env-development')(),
            require('@easy-webpack/config-aurelia')({root: rootDir, src: srcDir, title: title, baseUrl: baseUrl}),
            require('@easy-webpack/config-babel')(),
            require('@easy-webpack/config-html')(),
            require('@easy-webpack/config-css')({filename: 'styles.css', allChunks: true, sourceMap: false}),
            require('@easy-webpack/config-fonts-and-images')(),
            require('@easy-webpack/config-global-bluebird')(),
            require('@easy-webpack/config-global-jquery')(),
            require('@easy-webpack/config-global-regenerator')(),
            require('@easy-webpack/config-generate-index-html')({minify: false}),
            require('@easy-webpack/config-common-chunks-simple')({appChunkName: 'app', firstChunk: 'aurelia-bootstrap'}),
            {
                plugins: [
                    new webpack.DefinePlugin({
                        __VERSION__: JSON.stringify(require("./package.json").version),
                        __SETTINGS__: JSON.stringify(envSettings.settings)
                    })
                ]
            }
        );
        break;
}

module.exports = config;
