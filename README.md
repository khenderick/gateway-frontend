# OpenMotics User Interface

[![Build Status](https://travis-ci.org/openmotics/frontend.svg?branch=develop)](https://travis-ci.org/openmotics/frontend) [![dependencies Status](https://david-dm.org/openmotics/gateway-frontend/status.svg)](https://david-dm.org/openmotics/gateway-frontend) [![devDependencies Status](https://david-dm.org/openmotics/gateway-frontend/dev-status.svg)](https://david-dm.org/openmotics/gateway-frontend?type=dev) 


This project is the main user interface for the OpenMotics platform. It originated as the interface of the OpenMotics Gateway module, but over time,
it evolved into a global UI that can run both on the OpenMotics Gateway module, and on the OpenMotics cloud infrastructure.

The idea is to get it even smarter in the future:
* Use Service Workers to get (some) offline functionality
* Switch to either the local Gateway's API, or the Cloud's API based on the location of the user
* Access data from the Cloud infrastructure in the local context, and vice versa
* ...

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
See deployment for notes on how to deploy the project on a live system. However, be aware that the code on the `develop` branch might require
certain API functionality not (yet) available on your own Gateway module.

### Prerequisities

Make sure you have a recent version of ```nodejs``` and ```npm``` (npm should be at least version 5).

```
$ node --version
v8.3.0
$ npm --version
5.3.0
$
```

### Installing

Check out this repo to some local folder. Let's call it ```openmotics-ui```. The rest of the commands will assume this is the working directory.

First, start with installing the dependencies

```
$ npm install
...
added 1333 packages in 51.998s
$
```

Now, setup environment configuration.  They are named like: ```env.{target}.{stage}.js```. E.g. ```env.gateway.production.js``` or ```env.cloud.development.js```.
They are all located under the project's root (next to e.g. ```package.json```).

The stage is either ```development``` or ```production```.

```
module.exports = {
    settings: {
        target: 'target',                   # The target at which the site should be build, either 'gateway' or 'cloud'. Defaults to 'gateway'.
        api_root: 'api_root_uri',           # Points to the API endpoint. Defaults to `location.origin`.
        api_path: 'api_path',               # Specifies the API path that needs to be appended to the above URI. Defaults to ''.
        analytics: 'google_analytics_code'  # Specifies the Google Analytics code. Defaults to ''.
    }
};
```

The development file (```env.gateway.development.js```) will most likely need some custom settings, e.g. the endpoint of the Gateway.

```
module.exports = {
    settings: {
        api: 'https://1.2.3.4'
    }
};
```

The ```npm start``` script is either ```debug.{target}```, or ```build.{target}.{stage}```. When debugging, the stage is always development.

After configuratin files are set up, start the webpack development server

```
$ npm start debug.gateway
> openmotics-ui@1.2.1 start /some/path/openmotics/gateway-ui
> nps
...
       [2] (webpack)/buildin/global.js 509 bytes {0} [built]
       [3] (webpack)/buildin/module.js 517 bytes {0} [built]
webpack: Compiled successfully.
```

And browse to http://localhost:8080

When making changes, webpack's development server will automatically repackage and reload the browser.

## Deployment

For deploying to a Gateway, make sure to cleanup possible leftovers

```
$ rm -rf dist
$
```

Then generate a production bundle

```
$ npm start build.gateway.production
> openmotics-ui@1.2.1 start /some/path/openmotics/gateway-ui
> nps "build"

nps is executing `build` : nps webpack.build
nps is executing `webpack.build` : nps webpack.build.production
...
     fa2772327f55d8198301fdb8bcfc8158.woff  23.4 kB          [emitted]
      e18bbf611f2a2e43afc071aa2f4e1512.ttf  45.4 kB          [emitted]
      89889688147bd7575d6327160d64e760.svg   109 kB          [emitted]
...
$
```

Then, ssh into your Gateway, and clean the web root (only the following snippet is executed on the Gateway)

```
$ cd /opt/openmotics/static/
$ rm -rf *
$
```

And scp the contents of the dist folder to the above folder

```
$ scp dist/* root@1.2.3.4:/opt/openmotics/static/
...
$
```

## Running the unit tests

To run the tests make sure you first follow the instructions in Installing section.

You will also need Jest installed globally.

```
$ npm install -g jest@23.4.2
$
```

Once you have everything you need, you can simply run:

```
$ npm run test
$
```

Jest will run every test and will report back on the console. 

Example:

```
  the toolbox
    √ should return time in hours (36ms)
    √ should remove an element from the array (26ms)
    √ should check if array contains element (3ms)
    √ should check if array contains element (3ms)
    √ should convert seconds into hh:mm:ss format (2ms)
    √ should return total minutes after giving hh:mm format (5ms)
    ...
$
```

Jest will attempt to run all test files respecting the format *.test.js


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
Version tag prefix: v
```

To set these configuration parameters:

```
git config gitflow.branch.master master
git config gitflow.branch.develop develop
git config gitflow.prefix.feature feature/
git config gitflow.prefix.bugfix bugfix/
git config gitflow.prefix.release release/
git config gitflow.prefix.hotfix hotfix/
git config gitflow.prefix.support support/
git config gitflow.prefix.versiontag v
```

## Built With

* [Aurelia](http://aurelia.io/) - An awesome and modern web framework
* [Webpack](https://webpack.github.io/) - Javascript bundling
* [BrowserStack](https://www.browserstack.com) - Browser testing

## Special thanks

[<img src="https://www.browserstack.com/images/layout/browserstack-logo-600x315.png" width="200">](https://www.browserstack.com)

BrowserStack - Live, Web-Based Browser Testing - Helping us testing the front-end on all modern browsers and devices.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the tags on this repository

## Authors

* *Kenneth Henderick* - GitHub user: [khenderick](https://github.com/khenderick)

## License

This project is licensed under the AGPLv3 License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Thanks to everybody testing this code and providing feedback.
