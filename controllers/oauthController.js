var querystring = require('querystring');
var userModel = require('../models/userModel');
var OAuthController = (function () {
    function OAuthController(configParam) {
        var _this = this;
        /**
         * The function used to get user info from the oauth service.
         */
        this.getUserInfoFunction = this.getUserInfoStub;
        /**
         * Express request handlers below, all using fat arrow syntax:
         * functionName = (req: express.Request, res: express.Response) => { ... }
         */
        // Express request handlers are called for routes for example like this:
        // app.get("/a/path", controllerInstance.aFunction). If the function uses 
        // a normal function signature ("aFunction(req: express.Request, res: express.Response)"),
        // when called by Express it's called as a global function. The keyword 'this' 
        // doesn't map to the class instance and the function can't access class members.
        //
        // This is explained by the fact that normal class functions get mapped to
        // prototype functions, whereas the fat arrow syntax gets mapped to functions
        // within the constructor. Examples below.
        // 
        // Function syntax:
        // TypeScript: 
        //class a {
        //    memberA: string;
        //    functionA(paramA: string) { return this.memberA; }
        //}
        // JavaScript: 
        //var a = (function () {
        //    function a() {
        //    }
        //    a.prototype.functionA = function (paramA) { return this.memberA; };
        //    return a;
        //})();
        //
        // Fat arrow syntax:
        // TypeScript: 
        //class b {
        //    memberB: string;
        //    b = (memberB: string) => { return this.memberB; }
        //}
        // JavaScript:
        //var b = (function () {
        //    function b() {
        //        var _this = this;
        //        this.b = function (memberB) { return _this.memberB; };
        //    }
        //    return b;
        //})();
        //
        // More info:
        // https://github.com/Microsoft/TypeScript/wiki/'this'-in-TypeScript
        /**
         * Redirect to the authorization URL of the OAuth provider
         */
        this.auth = function (req, res) {
            res.redirect(_this.authorization_uri);
        };
        /**
         * Callback operation parsing the authorization token and asking for the access token from
         * the OAuth provider.
         */
        this.callback = function (req, res) {
            var reqData = req.body;
            if (reqData.error) {
                // The function was called with error data. Don't process any further.
                res.json(400, {
                    "status": "Error",
                    "error": "Error returned by OAuth provider on callback: " + reqData.error
                });
            }
            var code = reqData.code;
            // TODO: check state passed in request. It should be a unique variable passed with the request
            // to the authorization URL, which is passed back by the OAuth provider.
            // As our backend API is stateless, the state should be generated in the front side app.
            var state = reqData.state;
            _this.oauth2.authCode.getToken({
                code: code,
                redirect_uri: _this.getCallbackUrl()
            }, saveToken);
            var t = _this;
            /**
             * Callback for saving the token from the OAuth provider and returning the result.
             */
            function saveToken(error, result) {
                if (error) {
                    console.log('Access Token Error', error.error);
                    res.json(500, {
                        "status": "Error",
                        "error_location": "Getting token from OAuth provider",
                        "error": error
                    });
                    return;
                }
                // Sometimes we receive a token without expiration date. Consider it to expire in 24 hours.
                if (!result.expires_in)
                    result.expires_in = 60 * 60 * 24;
                var token = t.oauth2.accessToken.create(result);
                var accessToken;
                if (token.token.access_token)
                    // Cases where the token response is parsed, e.g. Uphold
                    accessToken = token.token.access_token;
                else {
                    // Cases where the token response isn't parsed and arrives as a query string (access_token=...&scope=...), e.g. GitHub
                    // Parse it here to get the token.
                    var parsed = querystring.parse(token.token);
                    accessToken = parsed.access_token;
                }
                // TODO: clean up callback hell and duplication. Use Promises (Q library).
                // Get the user from the OAuth provider
                t.getUserInfo(accessToken, function (err, userInfo) {
                    var externalUserId;
                    var name = "New user";
                    var email;
                    if (err) {
                        res.json(500, {
                            "error": err,
                            "error_location": "getting user data",
                            "status": "Error"
                        });
                        ;
                    }
                    else if (userInfo) {
                        name = userInfo.name;
                        externalUserId = userInfo.externalId;
                        email = userInfo.email;
                    }
                    else {
                        res.json(500, {
                            "error": "User info is empty",
                            "error_location": "getting user data",
                            "status": "Error"
                        });
                        ;
                    }
                    // Get the user from our side, or create it.
                    // If the MongoDB connection fails, this call times out and the result is never sent.
                    // TODO: handle that.
                    userModel.User.findOne({ externalId: externalUserId }, function (err, user) {
                        // TODO: use promise to wait for creating new user.
                        if (!user) {
                            // User didn't exist yet
                            userModel.User.create({
                                name: name,
                                externalId: externalUserId,
                                email: email,
                                accessToken: accessToken,
                            }, function (userErr, userRes) {
                                // Handle result                    
                                res.json({
                                    "status": "Ok",
                                    "user": userRes,
                                    "isGlobalAdmin": userRes.externalId === t.config.adminUserId
                                });
                            });
                        }
                        else {
                            // Store the token
                            user.accessToken = accessToken;
                            user.email = email;
                            // Save it
                            userModel.User.update({ _id: user._id }, user, function (saveErr, affectedRows, raw) {
                                if (saveErr) {
                                    res.json(500, {
                                        "error": saveErr,
                                        "error_location": "saving user data",
                                        "status": "Error",
                                        "user": user,
                                    });
                                    ;
                                }
                                else {
                                    res.json({
                                        "status": "Ok",
                                        "user": user,
                                        "isGlobalAdmin": user.externalId === t.config.adminUserId
                                    });
                                }
                            });
                        }
                    });
                });
            }
        };
        this.config = configParam;
        this.init(this.config);
    }
    OAuthController.prototype.init = function (config) {
        this.oauth2 = require('simple-oauth2')({
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            site: config.oauthSite,
            tokenPath: config.oauthTokenPath,
            authorizationPath: config.oauthAuthorizationPath,
        });
        // Authorization uri definition
        this.authorization_uri = this.oauth2.authCode.authorizeURL({
            redirect_uri: this.getCallbackUrl(),
            scope: config.scope,
            state: this.getState()
        });
    };
    /**
     * Gets the route this controller exposes to initiate an authentication request, e.g. /api/auth/bitreserve.
     */
    OAuthController.prototype.getAuthRoute = function () {
        return this.config.basePath;
    };
    /**
     * Gets the route used for callback calls.
     */
    OAuthController.prototype.getCallbackApiRoute = function () {
        return this.config.basePath + '/callback';
    };
    /**
     * Gets the route used for callbacks.
     */
    OAuthController.prototype.getCallbackPublicRoute = function () {
        // The callback should be to the world-facing URL (e.g. /auth/bitreserve/callback) and not to 
        // the API (e.g. /api/auth/bitreserve/callback). So strip '/api/'.
        // TODO: allow configuring this specifically, or improve convention so that no string replace has to be done.
        return this.config.basePath.replace('/api/', '/') + '/callback';
    };
    /**
     * Gets the full callback URL that the OAuth provider has to redirect back to.
     * Example: http://localhost:3124/#/auth/bitreserve/callback
     */
    OAuthController.prototype.getCallbackUrl = function () {
        return this.config.baseUrl + this.getCallbackPublicRoute();
    };
    OAuthController.prototype.getState = function () {
        // TODO: make dynamic, session-specific; check on callback.
        return 'H()OEUHM*$(';
    };
    /**
     * Set the function used to get the user info from the oauth service.
     */
    OAuthController.prototype.setGetUserInfoFunction = function (f) {
        this.getUserInfoFunction = f;
    };
    /**
     * Gets information about the current user from the configured function.
     */
    OAuthController.prototype.getUserInfo = function (authorizationCode, callback) {
        this.getUserInfoFunction(authorizationCode, function (err, user) {
            callback(err, user);
        });
    };
    /**
     * Stub function which returns null as user info.
     */
    OAuthController.prototype.getUserInfoStub = function (authorizationCode, callback) {
        callback(null, null);
    };
    ;
    return OAuthController;
})();
exports.OAuthController = OAuthController;
//# sourceMappingURL=oauthController.js.map