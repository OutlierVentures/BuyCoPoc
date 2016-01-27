# BuyCo
BuyCo.io Proof of Concept / MVP

The implementation consists of:
- Node.js backend (using TypeScript) - directory /
- AngularJS frontend (using TypeScript, Bootstrap) - directory /client/
- MongoDB database - external
- Uphold API - external
- Ethereum private blockchain

### Git working process
An explanation of the working process with forks and pull requests is in [docs/README.GIT.md](docs/README.GIT.md).

## Test environment

A version of the development branch is running here: https://blockstars.io:4124/. This version uses the development Uphold app, database and blockchain node.

## Development setup

### Quick installation

1. Ensure that Node.js 0.10+ is installed.
1. Ensure that `selfsigned.blockstars.io` resolves to the IP of your development machine (e.g. by adding `127.0.0.1 selfsigned.blockstars.io` to your hosts file)
1. Ensure that the global dependencies are installed: `(sudo) npm -g bower tsd grunt-cli`
1. Clone (your fork of) the repository (e.g. `git clone git@github.com:OutlierVentures/BuyCo.git`)
1. Install the dependencies: `sh ./install.sh`
1. Build: `grunt`
1. Run: `grunt serve`

The BuyCo app can now be loaded on https://selfsigned.blockstars.io:4124/.

If this doesn't work for you, or you want to know more, read on.

### Local installation

For development on your local machine, at least the Node.js backend should run locally. You'll need access to the following components:

- MongoDB database
- Ethereum blockchain node
- Uphold API. If you don't have internet access, the app can be configured to use stubs for limited offline functionality with fake data.

The default configuration in `config.default.json` contains valid configuration for all of these.

The following instructions have been tested on Ubuntu 14.04, Windows 8.1 and Mac OS X (version unknown). Commands might differ slightly per OS.

The installation steps assume the default configuration in [config.default.json](config.default.json). To use a different configuration, copy that file to `config.json` and change what you need.

### Installation steps

1. Ensure that `selfsigned.blockstars.io` resolves to the IP of your development machine (e.g. by adding `127.0.0.1 selfsigned.blockstars.io` to your hosts file)
2. Ensure that `git` and Node JS (0.10+) are installed on your system
3. `git clone` this repository into a folder, say `~/dev/BuyCo`. As this is a private repository, make sure an SSH key or token has been configured.

   `git clone git@github.com:OutlierVentures/BuyCo.git`
   
   If you're using a fork of the repository, be sure to clone that and not the main repository under OutlierVentures. 

4. Install global dependencies from `npm`:

   ```
(sudo) npm install -g typescript nodemon grunt-cli tsd bower node-gyp
```

TODO AvA: check whether `nodemon` and `node-gyp` are still necessary as a global install.

5. Run the install script in the project root. This runs e.g. `npm install`, `bower install` etc.

   ```
   sh ./install.sh
```

### Building

As the code is written in TypeScript, it has to be compiled using `tsc`. A `grunt` task has been included to facilitate this. The grunt task also runs `less` and several other tasks.

To build the code:

`grunt`

The output should look something like this:

```
Aron@SuryaNamaskar MINGW64 /p/BuyCo/buyco (development)
$ grunt
Running "ts:build" (ts) task
Compiling...
Using tsc v1.7.5



TypeScript compilation complete: 3.92s for 94 typescript files

Running "wiredep:task" (wiredep) task

Running "injector:local_dependencies" (injector) task
Missing option `template`, using `dest` as template instead
Injecting js files (25 files)
>> Nothing changed

Running "less:development" (less) task
>> 1 stylesheet created.

Done, without errors.
```

### Running

1. Start the node server:

   `grunt serve`

   The output should look something like this:

   ```
Aron@SuryaNamaskar MINGW64 /p/BuyCo/buyco (development)
$ grunt serve
Running "concurrent:watchers" (concurrent) task
    Running "ts:build" (ts) task
    Running "watch" task
    Running "nodemon:dev" (nodemon) task
    Waiting...
    [nodemon] 1.8.1
    [nodemon] to restart at any time, enter `rs`
    [nodemon] watching: *.*
    [nodemon] starting `node --debug launcher.js`
    Debugger listening on port 5858
    Using configuration from ./config.json
    My configuration:
(...)
    web3 initialized with provider URL: http://blockstars.io:9001
    web3 coinbase: 0x7bfc1a07c41f8cb9ecb3331f51a32b0f67ed2a33
    web3 coinbase balance: 510000000000000000000
    web3plus initialized with contract path 'P:\BuyCo\buyco\contracts'.
    Trying custom certificate.
    Falling back to default self-signed certificate.
    http server started on port 4123
    https server started on port 4124
```

2. Open https://selfsigned.blockstars:4124 in a browser

   Requests to the server are logged to the console like this:

   ```
    GET / 304 6.697 ms - -
    GET /vendors/bootstrap/dist/css/bootstrap.css 304 2.410 ms - -
    GET /vendors/font-awesome/css/font-awesome.min.css 304 1.102 ms - -
    GET /vendors/jquery/jquery.js 304 0.550 ms - -
    GET /dist/app.css 200 27.554 ms - 443
```

### Live building

The `grunt serve` task includes modules to detect changes to the TypeScript files, recompile them and restarting Node on the fly. You don't need to do anything beyond starting `grunt serve`.

When any .ts file is changed, a rebuild occurs, which looks like this:

```
    >> File "client/js/app.ts" changed.
    >> File "server.ts" changed.

    Running "ts:build" (ts) task
    Compiling...
    Using tsc v1.7.5
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] starting `node server.js`
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...



    TypeScript compilation complete: 1.33s for 26 typescript files

    Running "watch" task
    Completed in 2.180s at Tue Sep 01 2015 20:28:49 GMT+0200 (CEST) - Waiting...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] restarting due to changes...
    [nodemon] starting `node server.js`
    http server started on port 3123
    https server started on port 3124
```

### Using Visual Studio + Node.js Tools for development
When developing on Windows, [Visual Studio 2015 Community](https://www.visualstudio.com) + [Node.js Tools for Visual Studio](https://github.com/Microsoft/nodejstools/) can be a powerful toolset for developing, testing and debugging Node.js.

#### Building and debugging
Just press F5 to build and start running. Place breakpoints to make the debugger stop on your code.

When working from Visual Studio, you don't need to run `grunt`. NTVS takes care of most that is done in the grunt tasks (e.g. building), and that which is not is run in an after-build task (i.e. less).

#### When it works, it's great

* Great intellisense and code completion
* Debugging of server-side code
* Running and debugging tests

#### Troubleshooting

However, it doesn't always work. NTVS has some performance issues which might or might not occur on your system, and these might be so serious that they make VS unusable. If they do, try this:

* Set Node.js Intellisense to a lower level through the VS options.
* Close Visual Studio, delete `.ntvs_analysis.dat` from the project folder and open the solution again.

Also, Visual Studio might crash occasionally.

### Other great development tools

* [Atom](https://atom.io/) + [atom-typescript](https://atom.io/packages/atom-typescript) also have great syntax completion and transpile-on-save. As of yet no debugging though.
* [Visual Studio Code](https://code.visualstudio.com/) has good syntax completion as well. It [allows debugging too](https://github.com/bartvanderwal/BuyCo/issues/4), though it's harder to set up.

## Installation and running using Docker

The Docker installation is used for live deployment. The Docker configuration currently contains all internal components except for MongoDB. You can also use it to run the server components on your local machine, e.g. to allow for offline working. 

Installation using the Docker containers is preferred for maximal portability. It consists of two images. The images haven't been added to the public Docker registry; they have to be built locally from the `Dockerfile` on the machine where they will be run.

* `blockstars/buyco_blockchain`: Ethereum node with `geth`, including the [Embark framework](https://github.com/iurimatias/embark-framework) to manage the private blockchain.
* `blockstars/buyco_server`: Node.js backend with all dependencies to run the backend.

The commands to build and run the containers have been automated in scripts in the directory `docker/`. These scripts contain further comments on which commands are run and why.

### Prerequisites

* Docker 1.9.1. Tested on Ubuntu 14.04 and Windows 8.1, should run on any system where Docker runs.

### Buiding the containers

In the `docker/` folder:

```
    bash ./build-blockchain.sh
    bash ./build-server.sh
```

Building the containers can take a long time (10-30 min), because it downloads quite a lot of data, installs a lot of libraries and builds the "DAG" needed for Ethereum mining. It only has to be done once though.

### Running the containers

The blockchain node:

```
    bash ./run-blockchain.sh development
```

The Node.js server:

```
    bash ./run-server.sh development
```

The `bcpoc_server` connects to the blockchain node through internal Docker routing. The `bcpoc_server` container should expose the web server on the port for the chosen configuration (for `development`, 4124).   

### Troubleshooting

* Ensure that Docker is working correctly in general (`docker run hello-world`)
* Ensure that the images have been built correctly (`docker images`)
* Ensure that the container is running (`docker ps -a`)
* If the container is running but not correctly, you can open a terminal in it to inspect it (`docker exec -ti [container id] bash`) 

### Running Docker on Windows
When running on **Windows**: Docker uses a virtual Linux machine running in VirtualBox as the machine that runs the containers. This has consequences for the way you can interact with the containers.

* **RAM for the virtual machine**: Configure the Docker machine with at least 2GB RAM and preferrably >=3GB. This speeds up mining considerably. This is configured within VirtualBox in the settings of the `default` VM.
* **Shared folder mapping**: Make sure the Docker machine has access to the source code of this repository. By default, only the folder `C:\Users` and below is made available within the Docker machine as `/c/Users`. If your working folder is outside of this path, add a shared folder in the Settings of the `default` VM within VirtualBox.
* **Unix line endings**: Configure git to use Unix line endings for the repository. As they will be accessed from a Linux VM, the default Windows line endings (CR+LF) will cause all kinds of errors.

Note AvA 2016-01-26 using Unix line endings might actually not be necessary anymore for running the Docker containers on Windows. Check again with current config.

Configure the checked out repository to use Unix Line endings:

```
git config core.autocrlf false
git config core.eol lf
```

Update the line endings of the files on disk:

```
git rm --cached -rf .
git reset --hard HEAD
```

# Tests

Most tests reside under `test/` but will increasingly be placed together with the code they test according to folder-by-feature.

## Building tests

Mocha is used as the testing framework.

Things to be aware of:

* All transactions to the blockchain are slow, so tests writing to it will run slowly.
* Your test might not always be run with the same path as the working folder. Make sure you refer to files and paths relative to the test file.

## Running the tests

### Command line

Running all tests:

```
    npm test
```

Running tests in a specific folder:

```
    npm test test/contracts/
```

Running a specific test file (note to refer to the .js file and not the .ts file):

```
    npm test test/contracts/testProposals.js
```

### Visual Studio + Node.js Tools

#### Marking a file as a test
In the file properties of the test, type "Mocha" under Test framework. There is no dropdown. This makes NTVS discover it.

#### Discovering tests
Test discovery is executed on save of a test file and on project build.

#### Running tests
All test cases should be listed in the Test explorer. You can run them from there.

#### Debugging tests
Test code can be debugged just like normal code. Choose "Debug test" instead of "Run test" and be sure to place a breakpoint. Also be sure to increase the timeout for the test that you will debug, otherwise the test might stop early. 

# Development guidelines

### Common

* Use `tsd` to search for and install TypeScript typings. These facilitate syntax completion and design-time error checking. Two separate `tsd` configurations are used: `/tsd.json` for the backend, `/client/tsd.json` for the front end.

### Backend

* Use classes for controllers
* Use fat arrow syntax (`someFunction = (req: express.Request, res: express.Response) => { ... }`) for functions that will be called by Express routes.
* Use `npm` for all dependencies.

### Frontend

* Use classes for controllers, services, models
* Use `bower` for all dependencies
