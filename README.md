# OpenMotics (Gateway) frontend

[![Build Status](https://travis-ci.org/openmotics/gateway-frontend.svg?branch=develop)](https://travis-ci.org/openmotics/gateway-frontend)

This project is the OpenMotics (Gateway) frontend. At this stage, it's designed to run on the OpenMotics gateway, but the goal is to make it a
unified platform allowing users to use the same interface both locally (on the local LAN) as globally (over the internet, using the OpenMotics
Cloud).

This projects uses:


## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
See deployment for notes on how to deploy the project on a live system.

### Prerequisities

Make sure you have a recent version of ```nodejs``` and ```npm``` (npm should be at least version 3).

```
$ node --version
v6.7.0
$ npm --version
3.10.8
$
```

### Installing

Check out this repo to some local folder. Let's call it ```openmotics-frontend```. The rest of the commands will assume this is the working directory.

First, start with installing the dependencies

```
$ npm install
...
openmotics-frontend@0.2.4 /some/path/openmotics-frontend
+-- @easy-webpack/config-aurelia@2.2.0
| `-- aurelia-webpack-plugin@1.1.0
...
$
```

Now, setup environment configuration. There are basically two files needed: ```env.production.js``` and ```env.development.js```, both under the project
root (next to e.g. ```package.json```). The production file can be a basic "empty" file which will cause fallback to defaults for all used settings:

```
module.exports = {
    settings: {}
};
```

The development file (```env.development.js```) will most likely need some custom settings, e.g. the endpoint of the Gateway.

```
module.exports = {
    settings: {
        api: 'https://1.2.3.4'
    }
};
```

After configuratin files are set up, start the webpack development server

```
$ npm start
> openmotics-frontend@0.2.4 start /some/path/openmotics-frontend
> npm run server:dev
...
webpack: bundle is now VALID
```

And browse to http://localhost:9000

When making changes, webpack's development server will automatically repackage and reload the browser.

## Deployment

For deploying to a Gateway, make sure to cleanup possible leftovers

```
$ rm -rf dist
$
```

Then generate a production bundle

```
$ npm run build:prod
> openmotics-frontend@0.2.4 prebuild:prod /some/path/openmotics-frontend
> npm run clean:dist
...
     c8ddf1e5e5bf3682bc7bebf30f394148.woff  90.4 kB          [emitted]
    e6cf7c6ec7c2d6f670ae9d762604cb0b.woff2  71.9 kB          [emitted]
        + 8 hidden modules
```

Then, ssh into your Gateway, and clean the web root (only the following snippet is executed on the Gateway)

```
$ cd /opt/openmotics/static/
$ rm *
$
```

And scp the contents of the dist folder to the above folder

```
$ scp dist/* root@1.2.3.4:/opt/openmotics/static/
...
$
```

## Git workflow

We use [git-flow](https://github.com/petervanderdoes/gitflow-avh) which implements [Vincent Driessen](http://nvie.com/posts/a-successful-git-branching-model/)'s
branching model. This means our default branch is ```develop```, and ```master``` contains production releases.

When working on this repository, we advice to use following git-flow config:

```
Branch name for production releases: master
Branch name for "next release" development: develop
Feature branch prefix: feature/
Bugfix branch prefix: bugfix/
Release branch prefix: release/
Hotfix branch prefix: hotfix/
Support branch prefix: support/
Version tag prefix:
```

## Built With

* [Aurelia](http://aurelia.io/) - An awesome and modern web framework
* [Webpack](https://webpack.github.io/) - Javascript bundling

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the tags on this repository

## Authors

* *Kenneth Henderick* - GitHub user: [khenderick](https://github.com/khenderick)

## License

This project is licensed under the AGPLv3 License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Thanks to everybody testing this code and providing feedback.
