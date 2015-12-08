/// <reference path="typings/tsd.d.ts" />
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var web3config = require('./lib/web3config');
var web3 = require("web3");
var path = require('path');
var fs = require('fs');
var indexRoute = require('./routes/index');
var oauthController = require('./controllers/oauthController');
var configurationService = require('./services/configurationService');
var config = new configurationService.ConfigurationService().getConfiguration();
console.log("My configuration:");
console.log(config);
var HTTP_PORT = config.server.httpPort;
var HTTPS_PORT = config.server.httpsPort;
var baseUrl = config.server.baseUrl + ":" + HTTPS_PORT;
var upholdConfig = {
    baseUrl: baseUrl,
    basePath: "/api/auth/uphold",
    clientID: config.uphold.app.clientID,
    clientSecret: config.uphold.app.clientSecret,
    scope: "cards:read,cards:write,transactions:read,transactions:write,user:read",
    oauthSite: "https://",
    oauthTokenPath: 'api.uphold.com/oauth2/token',
    oauthAuthorizationPath: 'uphold.com/authorize/' + config.uphold.app.clientID,
    adminUserId: config.uphold.vaultAccount.userName
};
var upholdOauthController = new oauthController.OAuthController(upholdConfig);
var serviceFactory = require('./services/serviceFactory');
function getBitReserveUserInfo(token, callback) {
    var brs = serviceFactory.createUpholdService(token);
    brs.getUser(callback);
}
upholdOauthController.setGetUserInfoFunction(getBitReserveUserInfo);
var stubOauthController = require('./controllers/stubOauthController');
if (config.useStubs) {
    var stubController = new stubOauthController.StubOAuthController(upholdOauthController);
    upholdOauthController.auth = stubController.auth;
    upholdOauthController.callback = stubController.callback;
}
var web3plus = web3config.createWeb3(config.ethereum.jsonRpcUrl);
var app = express();
app.use(bodyParser.json());
var morgan = require('morgan');
app.use(morgan('dev'));
var db = mongoose.connect(config.database.url);
var clientDir = path.join(__dirname, 'client');
app.use(express.static(clientDir));
app.get('/', indexRoute.index);
app.get('/user/profile', indexRoute.index);
app.get('/user/login', indexRoute.index);
app.get('/not-found', indexRoute.index);
app.get(upholdOauthController.getAuthRoute(), upholdOauthController.auth);
app.post(upholdOauthController.getCallbackApiRoute(), upholdOauthController.callback);
app.get(upholdOauthController.getCallbackPublicRoute(), indexRoute.index);
var upholdController = require('./controllers/upholdController');
var uc = new upholdController.UpholdController();
app.get("/api/uphold/me/cards", uc.getCards);
app.get("/api/uphold/me/cards/withBalance", uc.getCardsWithBalance);
var httpsOptions;
try {
    console.log("Trying custom certificate.");
    httpsOptions = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };
    console.log("Using custom certificate.");
    try {
        console.log("Trying to read intermediate certificate.");
        var chainLines = fs.readFileSync('intermediate.pem', 'utf-8').split("\n");
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
        key: fs.readFileSync('key.default.pem'),
        cert: fs.readFileSync('cert.default.pem')
    };
}
var http = require('http');
var https = require('https');
http.createServer(app).listen(HTTP_PORT);
https.createServer(httpsOptions, app).listen(HTTPS_PORT);
console.log('http server started on port ' + HTTP_PORT);
console.log('https server started on port ' + HTTPS_PORT);
//# sourceMappingURL=server.js.map