import userModel = require('../models/userModel');
import { Promise } from 'q';

export function replaceLastUrlPart(url: string, newPart: string): string {
    if (!url || !newPart) {
        throw new Error("Parameters should be non null.");
    }
    const split = url.split("/");
    if (!split || split.length<2) {
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

/**
 * Get an Uphold token of a test user in the database. Returns a promise that resolves
 * with the token.
 */
export function getTestUserToken(): Promise<string> {
    return Promise<string>((resolve, reject) => {
        // TODO: make test user configurable
        userModel.User.findOne().where("externalId").equals("RonnieDoubleA").exec()
            .then(function (user) {
                if (user)
                    resolve(user.accessToken);
                else
                    reject("No user found");
            },
            function (userErr) {
                reject(userErr);
            });
    });
}