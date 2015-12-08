var querystring = require('querystring');
var userModel = require('../models/userModel');
var OAuthController = (function () {
    function OAuthController(configParam) {
        var _this = this;
        this.getUserInfoFunction = this.getUserInfoStub;
        this.auth = function (req, res) {
            res.redirect(_this.authorization_uri);
        };
        this.callback = function (req, res) {
            var reqData = req.body;
            if (reqData.error) {
                res.json(400, {
                    "status": "Error",
                    "error": "Error returned by OAuth provider on callback: " + reqData.error
                });
            }
            var code = reqData.code;
            var state = reqData.state;
            _this.oauth2.authCode.getToken({
                code: code,
                redirect_uri: _this.getCallbackUrl()
            }, saveToken);
            var t = _this;
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
                if (!result.expires_in)
                    result.expires_in = 60 * 60 * 24;
                var token = t.oauth2.accessToken.create(result);
                var accessToken;
                if (token.token.access_token)
                    accessToken = token.token.access_token;
                else {
                    var parsed = querystring.parse(token.token);
                    accessToken = parsed.access_token;
                }
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
                    userModel.User.findOne({ externalId: externalUserId }, function (err, user) {
                        if (!user) {
                            userModel.User.create({
                                name: name,
                                externalId: externalUserId,
                                email: email,
                                accessToken: accessToken,
                            }, function (userErr, userRes) {
                                res.json({
                                    "status": "Ok",
                                    "user": userRes,
                                    "isGlobalAdmin": userRes.externalId === t.config.adminUserId
                                });
                            });
                        }
                        else {
                            user.accessToken = accessToken;
                            user.email = email;
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
        this.authorization_uri = this.oauth2.authCode.authorizeURL({
            redirect_uri: this.getCallbackUrl(),
            scope: config.scope,
            state: this.getState()
        });
    };
    OAuthController.prototype.getAuthRoute = function () {
        return this.config.basePath;
    };
    OAuthController.prototype.getCallbackApiRoute = function () {
        return this.config.basePath + '/callback';
    };
    OAuthController.prototype.getCallbackPublicRoute = function () {
        return this.config.basePath.replace('/api/', '/') + '/callback';
    };
    OAuthController.prototype.getCallbackUrl = function () {
        return this.config.baseUrl + this.getCallbackPublicRoute();
    };
    OAuthController.prototype.getState = function () {
        return 'H()OEUHM*$(';
    };
    OAuthController.prototype.setGetUserInfoFunction = function (f) {
        this.getUserInfoFunction = f;
    };
    OAuthController.prototype.getUserInfo = function (authorizationCode, callback) {
        this.getUserInfoFunction(authorizationCode, function (err, user) {
            callback(err, user);
        });
    };
    OAuthController.prototype.getUserInfoStub = function (authorizationCode, callback) {
        callback(null, null);
    };
    ;
    return OAuthController;
})();
exports.OAuthController = OAuthController;
//# sourceMappingURL=oauthController.js.map