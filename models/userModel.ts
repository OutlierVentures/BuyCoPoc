import mongoose = require("mongoose");

/**
 * Backing token of the user for a specific BuyCo.
 */
// Backing of a BuyCo is stored in the user document itself, not in a separate collection. To be able
// to work with this in a productive, typesafe manner we define it as a class. 
// The only function of this class is to link the user data to the smart contract.
// Details like the amount and payments are stored in the contract.
export class Backing {
    /**
     * The ID of the backed proposal.
     */
    proposalAddress: string;
}

export var userSchema = new mongoose.Schema({
    name: String,
    externalId: String,
    accessToken: String,
    backings: [{
        proposalAddress: String
    }]
});

export interface IUser extends mongoose.Document {
    name: string;
    /**
     * For users primarily defined by an external authenticator, the User ID. E.g. Uphold user name.
     */
    externalId: string;

    /**
     * Current OAuth access token for the user at the external authenticator.
     * TODO: refactor to a subtype, incorporate expiration date.
     */
    accessToken: string;

    email: string;

    /**
     * BuyCos this user has backed
     */
    backings: [Backing];
}

/**
 * An individual user of the system, authenticated on one or more authentication providers.
 */
export var User = mongoose.model<IUser>("Users", userSchema);

interface IUserCallback {
    (error: any, user: IUser)
}

/**
 * Get a user by their access token.
 */
export var getUserByAccessToken = (token: string, cb: IUserCallback) => {
    User.findOne({ accessToken: token }, function (err, user) {
        // TODO: use promise to wait for creating new user.
        if (!user) {
            // No user with this token.
            cb("Not found", null)
        }

        // TODO: check for validity of the token.

        cb(null, user);
    });
}
