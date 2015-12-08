import mongoose = require("mongoose");

/**
 * Membership token of the user for a specific circle.
 */
// Circle membership is stored in the user document itself, not in a separate collection. To be able
// to work with this in a productive, typesafe manner we define it as a class. That way a circle
// membership can be created like so:
//  var cm = new CircleMembership();
//  cm.circleId = "12345";
//  myUser.circleMemberships.push(cm);
export class CircleMembership {
    /**
     * The ID of the corresponding Circle.
     */
    circleId: string;
    /**
     * Join date
     */
    startDate: Date;

    /**
     * Date the user left the circle.
     */
    endDate: Date;
}

export var userSchema = new mongoose.Schema({
    name: String,
    externalId: String,
    accessToken: String,
    // In the schema we use the shorthand syntax for schema, as we don't need access to the Schema object itself.
    // The Schema is only a necessity to let Mongoose do its magic.
    // http://stackoverflow.com/a/16493881/81949
    circleMemberships: [{
        circleId: mongoose.Schema.Types.ObjectId,
        startDate: Date,
        endDate: Date
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
     * Circles this user is a member of.
     */
    circleMemberships: [CircleMembership];
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

/**
 * Gets the users who are in a certain circle.
 */
export var getUsersInCircle = (circleId: string, cb: any) => {
    User.find({})
        .where("circleMemberships.circleId").equals(circleId)
        .exec(cb);
}
