var request = require('request');
require('request').debug = true;
function handleUpholdApiError(error, body, callback) {
    var errorResponse;
    try {
        if (body) {
            errorResponse = JSON.parse(body);
            if (errorResponse.error)
                errorResponse = errorResponse.error;
        }
        else
            errorResponse = error;
    }
    catch (e) {
        errorResponse = error;
    }
    if (!errorResponse)
        errorResponse = "Unknown error";
    callback(errorResponse, null);
}
function isSuccessStatusCode(statusCode) {
    if (('' + statusCode).match(/^2\d\d$/))
        return true;
    return false;
}
var UpholdService = (function () {
    function UpholdService(authorizationToken) {
        var _this = this;
        this.authorizationToken = authorizationToken;
        this.getUser = function (callback) {
            console.log("Calling API with token: " + _this.authorizationToken);
            request.get('https://api.uphold.com/v0/me', {
                headers: {
                    "Authorization": "Bearer " + _this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var userData = JSON.parse(body);
                    var user = {
                        name: userData.name,
                        externalId: userData.username,
                        email: userData.email
                    };
                    callback(null, user);
                }
                else {
                    console.log("Error getting user data: " + error);
                    callback(error, null);
                }
            });
        };
        this.getCards = function (callback) {
            console.log("Calling API with token: " + _this.authorizationToken);
            request.get('https://api.uphold.com/v0/me/cards', {
                headers: {
                    "Authorization": "Bearer " + _this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var cards = JSON.parse(body);
                    callback(null, cards);
                }
                else {
                    console.log("Error getting cards data: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });
        };
        this.getCardTransactions = function (cardId, callback) {
            request.get('https://api.uphold.com/v0/me/cards/' + cardId + '/transactions', {
                headers: {
                    "Authorization": "Bearer " + _this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var transactions = JSON.parse(body);
                    callback(null, transactions);
                }
                else {
                    console.log("Error getting cards data: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });
        };
        this.createCard = function (label, callback) {
            console.log("Calling API with token: " + _this.authorizationToken);
            request.post('https://api.uphold.com/v0/me/cards', {
                headers: {
                    "Authorization": "Bearer " + _this.authorizationToken
                },
                json: {
                    "label": label,
                    "currency": "GBP"
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var card = body;
                    callback(null, card);
                }
                else {
                    console.log("Error creating card: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });
        };
        this.createTransaction = function (fromCard, amount, currency, recipient, callback) {
            request.post('https://api.uphold.com/v0/me/cards/' + fromCard + '/transactions', {
                headers: {
                    "Authorization": "Bearer " + _this.authorizationToken
                },
                form: {
                    'denomination[currency]': currency,
                    'denomination[amount]': amount,
                    'destination': recipient
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    callback(null, JSON.parse(body));
                }
                else {
                    handleUpholdApiError(error, body, callback);
                }
            });
        };
        this.commitTransaction = function (transaction, callback) {
            // POST https://api.uphold.com/v0/me/cards/:card/transactions/:id/commit
            request.post('https://api.uphold.com/v0/me/cards/' + transaction.origin.CardId
                + '/transactions/' + transaction.id + '/commit', {
                headers: {
                    "Authorization": "Bearer " + _this.authorizationToken
                },
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    callback(null, JSON.parse(body));
                }
                else {
                    console.log("Error confirming transaction: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });
        };
    }
    return UpholdService;
})();
exports.UpholdService = UpholdService;
//# sourceMappingURL=upholdService.js.map