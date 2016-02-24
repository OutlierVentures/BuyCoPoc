import userModel = require('../models/userModel');
import { Promise } from 'q';
import _ = require('underscore');
import web3plus = require('../node_modules/web3plus/lib/web3plus');

export function replaceLastUrlPart(url: string, newPart: string): string {
    if (!url || !newPart) {
        throw new Error("Parameters should be non null.");
    }
    const split = url.split("/");
    if (!split || split.length < 2) {
        throw new Error("Url parameter doesn't look like a url.");
    }
    split.splice(-1, 1, newPart);
    const result = split.join('/');
    if (result === url) {
        throw new Error("Output should NOT be same as input.");
    }
    console.log(result);
    return result;
}

/**
 * Returns the card ID of the test user to use for sourcing funds in tests.
 */
export function getTestUserCardId(): string {
    // TODO: make test card configurable
    // "GBP card for unit tests" of user "RonnieDoubleA"
    return "9edd1208-8948-4b7a-b54d-3215a8a34de9";
}

function getTestUserId(): string {
    // TODO: make test user configurable
    return "RonnieDoubleA";
}

export function getTestUser(): Promise<userModel.IUser> {
    return Promise<userModel.IUser>((resolve, reject) => {
        userModel.User.findOne().where("externalId").equals(getTestUserId()).exec()
            .then(user => {
                if (user)
                    resolve(user);
                else
                    reject("No user found");
            },
            function (userErr) {
                reject(userErr);
            });
    });

}

/**
 * Get an Uphold token of a test user in the database. Returns a promise that resolves
 * with the token.
 */
export function getTestUserToken(): Promise<string> {
    return Promise<string>((resolve, reject) => {
        getTestUser()
            .then(user => {
                resolve(user.accessToken);
            },
            function (userErr) {
                reject(userErr);
            });
    });
}

/**
 * Ensure that the test user has web3.eth.coinbase as a blockchain address,
 * so that requests for the user owning that address will work.
 */
export function ensureTestUserHasCoinbaseAddress(): Promise<userModel.IUser> {
    return Promise<userModel.IUser>((resolve, reject) => {
        getTestUser()
            .then(user => {
                if (!_(user.blockchainAccounts.accounts).any(a => a.address == web3plus.web3.eth.coinbase)) {
                    user.blockchainAccounts.accounts.push(
                        <userModel.IBlockchainAccount>{
                            address: web3plus.web3.eth.coinbase
                        });
                    user.save(function (err, res) {
                        if (err) reject(err);
                        else resolve(user);
                    });
                }
                else
                    resolve(user);
            },
            function (userErr) {
                reject(userErr);
            });
    });
}

/**
 * Ensure that the test user has a seller profile 
 */
// TODO, as well as ensure...Buyer
//export function ensureTestUserIsSeller(): Promise<userModel.IUser> {
//    return Promise<userModel.IUser>((resolve, reject) => {
//    });
//}