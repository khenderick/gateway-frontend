const {series, crossEnv, concurrent, rimraf} = require('nps-utils');

module.exports = {
    scripts: {
        default: 'nps webpack',
        cloud: 'nps webpack.build.cloud',
        gateway: 'nps webpack.build.gateway',
        webpack: {
            default: 'nps webpack.server',
            build: {
                before: rimraf('dist'),
                default: 'nps webpack.build.gateway',
                development: {
                    default: series(
                        'nps webpack.build.before',
                        'webpack --progress -d'
                    ),
                    extractCss: series(
                        'nps webpack.build.before',
                        'webpack --progress -d --env.extractCss'
                    ),
                    serve: series.nps(
                        'webpack.build.development',
                        'serve'
                    ),
                },
                cloud: {
                    inlineCss: series(
                        'nps webpack.build.before',
                        crossEnv('NODE_ENV=production webpack --progress -p --env.production --env.cloud')
                    ),
                    default: series(
                        'nps webpack.build.before',
                        crossEnv('NODE_ENV=production webpack --progress -p --env.production --env.cloud --env.extractCss')
                    ),
                    serve: series.nps(
                        'webpack.build.cloud',
                        'serve'
                    ),
                },
                gateway: {
                    inlineCss: series(
                        'nps webpack.build.before',
                        crossEnv('NODE_ENV=production webpack --progress -p --env.production --env.gateway')
                    ),
                    default: series(
                        'nps webpack.build.before',
                        crossEnv('NODE_ENV=production webpack --progress -p --env.production --env.gateway --env.extractCss')
                    ),
                    serve: series.nps(
                        'webpack.build.gateway',
                        'serve'
                    ),
                }
            },
            server: {
                default: `webpack-dev-server -d --inline --env.server`,
                extractCss: `webpack-dev-server -d --inline --env.server --env.extractCss`,
                hmr: `webpack-dev-server -d --inline --hot --env.server`
            },
        },
        serve: 'http-server dist --cors',
    },
};
