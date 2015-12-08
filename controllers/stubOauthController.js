var userModel = require('../models/userModel');
var StubOAuthController = (function () {
    function StubOAuthController(oauthController) {
        var _this = this;
        this.oauthController = oauthController;
        this.auth = function (req, res) {
            res.redirect(_this.oauthController.getCallbackPublicRoute() + "?code=12345");
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
            var t = _this;
            var randomToken = "stubToken" + Math.random() * 100000;
            saveToken(randomToken);
            function saveToken(accessToken) {
                t.oauthController.getUserInfoFunction(accessToken, function (err, userInfo) {
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
                                    "isGlobalAdmin": userRes.externalId === t.oauthController.config.adminUserId
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
                                        "isGlobalAdmin": user.externalId === t.oauthController.config.adminUserId
                                    });
                                }
                            });
                        }
                    });
                });
            }
        };
    }
    return StubOAuthController;
})();
exports.StubOAuthController = StubOAuthController;
//# sourceMappingURL=stubOauthController.js.map