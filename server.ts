/// <reference path="typings/tsd.d.ts" />
import express = require('express');
import expressValidator = require('express-validator');
import morgan = require('morgan');
import mongoose = require('mongoose');
import bodyParser = require('body-parser');
import web3config = require('./lib/web3config');
import http = require('http');
import https = require('https');
import uriJs = require('urijs');
var httpProxy = require('http-proxy');

import configModel = require('./models/configModel');

var web3 = require("web3");

import path = require('path');

import fs = require('fs');

import indexRoute = require('./routes/index');
import oauthController = require('./controllers/oauthController');

import serviceFactory = require('./services/serviceFactory');
import configurationService = require('./services/configurationService');
import stubOauthController = require('./controllers/stubOauthController');

import apiRoutes = require('./routes/api');

import stubUpholdService = require('./services/stubUpholdService');

export class Server {
    basePath = "./";
    config: configModel.IApplicationConfig;
    HTTP_PORT: number;
    HTTPS_PORT: number;
    db: mongoose.Mongoose;

    /**
     * Create the Express application.
     */
    createApp(): express.Express {
        var cs = new configurationService.ConfigurationService();

        cs.basePath = this.basePath;
        this.config = cs.getConfiguration();

        console.log("My configuration:");
        console.log(this.config);

        this.HTTP_PORT = this.config.server.httpPort;
        this.HTTPS_PORT = this.config.server.httpsPort;

        var baseUrl = this.config.server.baseUrl + ":" + this.HTTPS_PORT;


        /************** OAuth controllers ****************/

        var upholdConfig = {
            baseUrl: baseUrl,
            basePath: "/api/auth/uphold",
            clientID: this.config.uphold.app.clientID,
            clientSecret: this.config.uphold.app.clientSecret,

            scope: "cards:read,cards:write,transactions:transfer:application,transactions:read,user:read",
            // Uphold uses a different domain for the authorization URL. simple-oauth2 doesn't support that.
            // The "site" parameter also may not be empty.
            // As a workaround, we use the greatest common denominator of the two URLs: "https://".
            oauthSite: "https://",
            oauthTokenPath: 'api.uphold.com/oauth2/token',
            oauthAuthorizationPath: 'uphold.com/authorize/' + this.config.uphold.app.clientID,
            adminUserId: this.config.uphold.vaultAccount.userName
        }

        var upholdOauthController = new oauthController.OAuthController(upholdConfig);

        /**
         * Create a new Uphold service and get user info from it.
         */
        function getUpholdUserInfo(token: string, callback) {
            var brs = serviceFactory.createUpholdService(token);
            brs.getUser(callback);
        }

        upholdOauthController.setGetUserInfoFunction(getUpholdUserInfo);

        if (this.config.useStubs) {
            // Create a stub controller from the real controller.
            var stubController = new stubOauthController.StubOAuthController(upholdOauthController);


            // Replace the handlers of the real controller by the stubs.
            upholdOauthController.auth = stubController.auth;
            upholdOauthController.callback = stubController.callback;
        }

        /******** Ethereum / web3 setup *************/

        // TODO: make the server not crash badly when the eth connection fails.
        var web3plus = web3config.createWeb3(this.config.ethereum.jsonRpcUrl);

        /******** Express and route setup ***********/

        var app = express();
        app.use(bodyParser.json());

        // Validation
        app.use(expressValidator());

        // Logging
        app.use(morgan('dev'));

        // Initialize database connection.

        // The MongoDB connection is currently only created at the node app startup. It could
        // disconnect for some reason.
        // TODO: make this more stable, in a way that doesn't require a specific call to Mongoose
        // before every request (because that will be forgotten).
        this.db = mongoose.connect(this.config.database.url);

        // Client folder containing the Angular SPA, serve as static assets
        var clientDir = path.join(__dirname, 'client');
        app.use(express.static(clientDir));

        // Static assets for other data
        var categoryDir = path.join(__dirname, 'api/category/data');
        app.use("/data/category", express.static(categoryDir));

        // All routes which are directly accessible (i.e. not only from within the Angular SPA).
        // All open index.html, where Angular handles further routing to the right controller/ view.
        app.get(upholdOauthController.getAuthRoute(), upholdOauthController.auth);
        app.post(upholdOauthController.getCallbackApiRoute(), upholdOauthController.callback);
        app.get(upholdOauthController.getCallbackPublicRoute(), indexRoute.index);

        // Routes for API functions
        apiRoutes.configure(app);

        // All routes not matched by server-side routes are forwarded to Angular using this wildcard.
        app.get("*", indexRoute.index);

        return app;
    }

    /**
     * Run the specified Express application.
     * @param the Express application as created by createApp().
     */
    run(app: express.Express) {

        /*********************** HTTP server setup ********************/
        var httpsOptions;

        try {
            console.log("Trying custom certificate.");

            httpsOptions = {
                key: fs.readFileSync(this.basePath + 'key.pem'),
                cert: fs.readFileSync(this.basePath + 'cert.pem')
            };

            console.log("Using custom certificate.");

            try {
                console.log("Trying to read intermediate certificate.");
                var chainLines = fs.readFileSync(this.basePath + 'intermediate.pem', 'utf-8').split("\n");
                var cert = [];
                var ca = [];
                chainLines.forEach(function (line) {
                    cert.push(line);
                    if (line.match(/-END CERTIFICATE-/)) {
                        ca.push(cert.join("\n"));
                        cert = [];
                    }
                });
                httpsOptions.ca = ca;
                console.log("Using intermediate certificate.");
            }
            catch (e) {
                console.log("Intermediate certificate could not be read.");
            }
        }
        catch (e) {
            console.log("Falling back to default self-signed certificate.");
            httpsOptions = {
                key: fs.readFileSync(this.basePath + 'key.default.pem'),
                cert: fs.readFileSync(this.basePath + 'cert.default.pem')
            };
        }

        http.createServer(app).listen(this.HTTP_PORT);
        console.log('http server started on port ' + this.HTTP_PORT);

        https.createServer(httpsOptions, app).listen(this.HTTPS_PORT);
        console.log('https server started on port ' + this.HTTPS_PORT);

        // Create an HTTPS proxy for the ethereum node, to allow calling it securely from 
        // the client.
        // Because we serve the DApp over HTTPS, the calls it makes (including those to
        // the Ethereum node) should be over HTTPS as well. 
        // See: https://ethereum.stackexchange.com/questions/794/what-are-best-practices-for-serving-a-dapp-over-https-connecting-to-an-ethereum/857#857
        if (this.config.ethereum.httpsProxy) {
            var ethJsonRpcUrl = uriJs.parse(this.config.ethereum.jsonRpcUrl);
            var ethProxyPort = this.config.ethereum.httpsProxy.port;

            // The HTTPS proxy is exposed at one port higher than the HTTPS port of the
            // application. For example, the application runs on https://blockstars.io:4124, 
            // then the ethereum node will be made available under https://blockstars.io:4125.
            // In production deployments, those should be made available under different
            // host names through the normal https port 443 in order to prevent firewall 
            // issues for users.
            httpProxy.createServer({
                target: {
                    host: ethJsonRpcUrl.hostname,
                    port: ethJsonRpcUrl.port
                },
                ssl: httpsOptions
            }).listen(ethProxyPort);
            console.log('https proxy for Ethereum node started on port ' + ethProxyPort);
        }
    }

    /**
     * Stop running the application and close the database connection.
     */
    stop() {
        this.db.disconnect();
    }
}

        