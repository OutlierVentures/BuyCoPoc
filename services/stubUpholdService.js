var StubUpholdService = (function () {
    function StubUpholdService(authorizationToken) {
        var _this = this;
        this.authorizationToken = authorizationToken;
        /**
         * Gets info about the current user.
         */
        this.getUser = function (callback) {
            var newUserId = "User" + _this.authorizationToken;
            // Create a new user array.
            var user = {
                name: "Stub user",
                externalId: newUserId,
                email: "stubuser@moneycircles.com"
            };
            callback(null, user);
        };
        this.getCards = function (callback) {
            var cards = [
                {
                    "address": {
                        "bitcoin": "1Abc"
                    },
                    "available": 10,
                    "balance": 10,
                    "currency": "GBP",
                    "id": "card1",
                    "label": "GBP card",
                    "lastTransactionAt": undefined,
                    "settings": {
                        "position": 1,
                        "starred": false
                    },
                    "addresses": [
                        {
                            "id": "1Abc",
                            "network": "bitcoin"
                        }
                    ],
                    "normalized": [
                        {
                            "available": 10,
                            "balance": 10,
                            "currency": "GBP"
                        }
                    ]
                }
            ];
            callback(null, cards);
        };
        this.getCardTransactions = function (cardId, callback) {
            var transactions = [
                {
                    "id": "tx1",
                    "type": "",
                    "message": "",
                    "status": "",
                    "RefundedById": "",
                    "createdAt": "",
                    "denomination": {
                        "amount": 1,
                        "currency": "GBP",
                        "pair": "GBPGBP",
                        "rate": 1
                    },
                    "origin": {
                        "CardId": "card1",
                        "amount": 1,
                        "base": 1,
                        "commission": 1,
                        "currency": "",
                        "description": "",
                        "fee": 1,
                        "rate": 1,
                        "type": "",
                        "username": ""
                    },
                    "destination": {
                        "CardId": "",
                        "amount": 1,
                        "base": 1,
                        "commission": 1,
                        "currency": "",
                        "description": "",
                        "fee": 1,
                        "rate": 1,
                        "type": "",
                        "username": ""
                    },
                    "params": {
                        "currency": "",
                        "margin": 1,
                        "pair": "",
                        "rate": 1,
                        "ttl": 1,
                        "type": ""
                    }
                },
                {
                    "id": "tx2",
                    "type": "",
                    "message": "",
                    "status": "",
                    "RefundedById": "",
                    "createdAt": "",
                    "denomination": {
                        "amount": 15,
                        "currency": "GBP",
                        "pair": "GBPGBP",
                        "rate": 1
                    },
                    "origin": {
                        "CardId": "card2",
                        "amount": 15,
                        "base": 1,
                        "commission": 1,
                        "currency": "",
                        "description": "",
                        "fee": 1,
                        "rate": 1,
                        "type": "",
                        "username": ""
                    },
                    "destination": {
                        "CardId": "",
                        "amount": 15,
                        "base": 1,
                        "commission": 1,
                        "currency": "",
                        "description": "",
                        "fee": 1,
                        "rate": 1,
                        "type": "",
                        "username": ""
                    },
                    "params": {
                        "currency": "",
                        "margin": 1,
                        "pair": "",
                        "rate": 1,
                        "ttl": 1,
                        "type": ""
                    }
                }
            ];
            callback(null, transactions);
        };
        /**
         * Create a new card.
         */
        this.createCard = function (label, callback) {
            var newId = "card" + Math.random() * 1000000;
            var card = {
                "address": {
                    "bitcoin": ""
                },
                "available": 10,
                "balance": 10,
                "currency": "GBP",
                "id": newId,
                "label": label,
                "lastTransactionAt": undefined,
                "settings": {
                    "position": 1,
                    "starred": false
                },
                "addresses": [
                    {
                        "id": "1Abc",
                        "network": "bitcoin"
                    }
                ],
                "normalized": [
                    {
                        "available": 10,
                        "balance": 10,
                        "currency": "GBP"
                    }
                ]
            };
            callback(null, card);
        };
        this.createTransaction = function (fromCard, amount, currency, recipient, callback) {
            var newId = "tx" + Math.random() * 1000000;
            var transaction = {
                "id": newId,
                "type": "",
                "message": "",
                "status": "",
                "RefundedById": "",
                "createdAt": "",
                "denomination": {
                    "amount": amount,
                    "currency": currency,
                    "pair": currency + currency,
                    "rate": 1
                },
                "origin": {
                    "CardId": fromCard,
                    "amount": 1,
                    "base": 1,
                    "commission": 1,
                    "currency": "",
                    "description": "",
                    "fee": 1,
                    "rate": 1,
                    "type": "",
                    "username": ""
                },
                "destination": {
                    "CardId": "",
                    "amount": 1,
                    "base": 1,
                    "commission": 1,
                    "currency": "",
                    "description": "",
                    "fee": 1,
                    "rate": 1,
                    "type": "",
                    "username": ""
                },
                "params": {
                    "currency": "",
                    "margin": 1,
                    "pair": "",
                    "rate": 1,
                    "ttl": 1,
                    "type": ""
                }
            };
            callback(null, transaction);
        };
        this.commitTransaction = function (transaction, callback) {
            callback(null, transaction);
        };
    }
    return StubUpholdService;
})();
exports.StubUpholdService = StubUpholdService;
//# sourceMappingURL=stubUpholdService.js.map