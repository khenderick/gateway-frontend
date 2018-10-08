const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {AureliaPlugin} = require('aurelia-webpack-plugin');
const {ProvidePlugin, DefinePlugin} = require('webpack');

// config helpers:
const ensureArray = (config) => config && (Array.isArray(config) ? config : [config]) || [];
const when = (condition, config, negativeConfig) => condition ? ensureArray(config) : ensureArray(negativeConfig);

// primary config:
const title = 'OpenMotics';
const outDir = path.resolve(__dirname, 'dist');
const srcDir = path.resolve(__dirname, 'src');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');
const baseUrl = '/';

const cssRules = [
    { loader: 'css-loader' },
    {
        loader: 'postcss-loader',
        options: { plugins: () => [require('autoprefixer')({ browsers: ['last 2 versions'] })]}
    }
];

module.exports = ({stage, target, server, coverage} = {}) => ({
    resolve: {
        extensions: ['.js'],
        modules: [srcDir, 'node_modules'],
    },
    devtool: stage === 'production' ? 'source-map' : 'cheap-module-eval-source-map',
    entry: {
        app: ['intl', 'aurelia-bootstrapper'],
        vendor: ['bluebird', 'jquery', 'bootstrap'],
        blockly: ['node-blockly'],
        zxcvbn: ['zxcvbn']
    },
    mode: stage,
    output: {
        path: outDir,
        publicPath: baseUrl + (target === 'gateway' && stage === 'production' ? 'static/' : ''),
        filename: stage === 'production' ? '[name].[chunkhash].bundle.js' : '[name].[hash].bundle.js',
        sourceMapFilename: stage === 'production' ? '[name].[chunkhash].bundle.map' : '[name].[hash].bundle.map',
        chunkFilename: stage === 'production' ? '[name].[chunkhash].chunk.js' : '[name].[hash].chunk.js',
    },
    optimization: {
        splitChunks: {
            chunks: 'all'
        }
    },
    devServer: {
        contentBase: outDir,
        historyApiFallback: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                issuer: [{ not: [{ test: /\.html$/i }] }],
                use: stage === 'production' ? [MiniCssExtractPlugin.loader, ...cssRules] : ['style-loader', ...cssRules],
            },
            {
                test: /\.css$/i,
                issuer: [{ test: /\.html$/i }],
                use: cssRules,
            },
            { test: /\.html$/i, loader: 'html-loader' },
            { test: /\.js$/i, loader: 'babel-loader', exclude: nodeModulesDir,
                options: coverage ? { sourceMap: 'inline', plugins: [ 'istanbul' ] } : {},
            },
            { test: /[\/\\]node_modules[\/\\]bluebird[\/\\].+\.js$/, loader: 'expose-loader?Promise' },
            { test: require.resolve('jquery'), loader: 'expose-loader?$!expose-loader?jQuery' },
            { test: /\.(png|gif|jpg|cur)$/i, loader: 'url-loader', options: { limit: 8192 } },
            { test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff2' } },
            { test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff' } },
            { test: /\.(ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'file-loader' },
        ]
    },
    plugins: [
        new AureliaPlugin(),
        new ProvidePlugin({
            Promise: 'bluebird',
            '$': 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery'
        }),
        new HtmlWebpackPlugin({
            template: 'index.ejs',
            minify: stage === 'production' ? {
                removeComments: true,
                collapseWhitespace: true
            } : undefined,
            metadata: {
                title, server, baseUrl
            },
        }),
        new CopyWebpackPlugin([
            { from: 'src/images/favicon.ico', to: 'favicon.ico' },
            { from: 'src/locales', to: 'locales' }
        ]),
        new DefinePlugin({
            __VERSION__: JSON.stringify(require("./package.json").version),
            __SETTINGS__: JSON.stringify(require(`./env.${target}.${stage}.js`).settings),
            __ENVIRONMENT__: JSON.stringify(stage),
            __BUILD__: (new Date()).getTime()
        }),
        new MiniCssExtractPlugin({
            filename: stage === 'production' ? '[name].[hash].css' : '[name].css',
            chunkFilename: stage === 'production' ? '[id].[hash].css' : '[id].css',
        })
    ],
});
