import request = require('request');
import userModel = require('../models/userModel');

// Enable request debugging
// TODO: make configurable (config debug option)
require('request').debug = true;

// TODO BW dd. 2015-12-7 Come up with decent name for this type.
export interface IUpholdTransactionNode {
    "CardId": string,
    "amount": number,
    "base": number,
    "commission": number,
    "currency": string,
    "description": string,
    "fee": number,
    "rate": number,
    "type": string,
    "username": string
}

export interface IUpholdTransaction {
    "id": string,
    "type": string,
    "message": string,
    "status": string,
    "RefundedById": string,
    "createdAt": string,
    "denomination": {
        "amount": number,
        "currency": string,
        "pair": string,
        "rate": number
    },
    "origin": IUpholdTransactionNode,
    "destination": IUpholdTransactionNode,
    "params": {
        "currency": string,
        "margin": number,
        "pair": string,
        "rate": number,
        "ttl": number,
        "type": string
    }
}

export interface IUpholdCard {
    "address": {
        "bitcoin": string
    },
    "available": number,
    "balance": number,
    "currency": string,
    "id": string,
    "label": string,
    "lastTransactionAt": string,
    "settings": {
        "position": number,
        "starred": boolean
    },
    "addresses": [
        {
            "id": string,
            "network": string
        }
    ],
    "normalized": [
        {
            "available": number,
            "balance": number,
            "currency": string
        }
    ]
}

export interface IUpholdTransactionCallback {
    (error: any, transaction: IUpholdTransaction);
}

export interface IUpholdTransactionsCallback {
    (error: any, transactions: IUpholdTransaction[]);
}

export interface IUpholdCardsCallback {
    (error: any, cards: Array<IUpholdCard>);
}

export interface IUpholdCardCallback {
    (error: any, card: IUpholdCard);
}

/**
 * Handle an error for a call to the Uphold API.
 */
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
    // Ensure that errorResponse is not falsey so callback is always handled as error.
    if (!errorResponse)
        errorResponse = "Unknown error";

    callback(errorResponse, null);
}

function isSuccessStatusCode(statusCode: number): boolean {
    if (('' + statusCode).match(/^2\d\d$/))
        return true;
    return false;
}

export class UpholdService {
    constructor(
        private authorizationToken: string) {
    }

    /**
     * Gets info about the current user.
     */
    getUser = (callback) => {
        console.log("Calling API with token: " + this.authorizationToken);
        request.get('https://api.uphold.com/v0/me',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var userData = JSON.parse(body);

                    // Create a new user array.
                    // TODO: create an interface for this (can't be IUser because that extends Mongoose.Document).
                    var user = {
                        name: userData.name,
                        externalId: userData.username,
                        email: userData.email
                    };

                    callback(null, user);
                } else {
                    console.log("Error getting user data: " + error);
                    callback(error, null);
                }
            });

    }

    getCards = (callback: IUpholdCardsCallback) => {

        console.log("Calling API with token: " + this.authorizationToken);
        request.get('https://api.uphold.com/v0/me/cards',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var cards = JSON.parse(body);

                    callback(null, cards);
                } else {
                    console.log("Error getting cards data: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });
    }

    getCardTransactions = (cardId: string, callback: IUpholdTransactionsCallback) => {
        request.get('https://api.uphold.com/v0/me/cards/' + cardId + '/transactions',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var transactions = JSON.parse(body);

                    callback(null, transactions);
                } else {
                    console.log("Error getting cards data: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });
    }

    /**
     * Create a new card.
     */
    createCard = (label: string, callback: IUpholdCardCallback) => {
        console.log("Calling API with token: " + this.authorizationToken);
        request.post('https://api.uphold.com/v0/me/cards',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                },
                json: {
                    "label": label,
                    "currency": "GBP"
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    // In this case the request module returns the data as already parsed. 
                    // Possibly because the request is done with the 'json' parameter.
                    var card = body;

                    callback(null, card);
                } else {
                    console.log("Error creating card: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });
    }

    createTransaction = (
        fromCard: string,
        amount: number,
        currency: string,
        recipient: string,
        callback: IUpholdTransactionCallback) => {

        // denomination[currency]=BTC&denomination[amount]=0.1&destination=foo@bar.com
        request.post('https://api.uphold.com/v0/me/cards/' + fromCard + '/transactions',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                },
                form: {
                    'denomination[currency]': currency,
                    'denomination[amount]': amount,
                    'destination': recipient
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    // Transaction created
                    callback(null, <IUpholdTransaction>JSON.parse(body));
                } else {
                    handleUpholdApiError(error, body, callback);
                }
            });

    }

    commitTransaction = (transaction: IUpholdTransaction, callback: IUpholdTransactionCallback) => {
        // POST https://api.uphold.com/v0/me/cards/:card/transactions/:id/commit

        request.post('https://api.uphold.com/v0/me/cards/' + transaction.origin.CardId
            + '/transactions/' + transaction.id + '/commit',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                },
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    // Transaction committed
                    callback(null, <IUpholdTransaction>JSON.parse(body));
                } else {
                    console.log("Error confirming transaction: " + error);
                    handleUpholdApiError(error, body, callback);
                }
            });

    }
}