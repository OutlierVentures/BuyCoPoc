import mongoose = require("mongoose");
import q = require("q");

export var userSchema = new mongoose.Schema({
    name: String,
    externalId: String,
    accessToken: String
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
}

/**
 * An individual user of the system, authenticated on one or more authentication providers.
 */
export var User = mongoose.model<IUser>("Users", userSchema);

interface IUserCallback {
    (error: any, user: IUser)
}


export class UserRepository {
    /**
    * Get a user by their access token.
    * TODO BW dd. 2015-01-11: Replace all calls with Promise-based variant and then remove this one.
    */
    getUserByAccessToken(token: string, cb: IUserCallback): void {
        User.findOne({ accessToken: token }, (err, user) => {
            // TODO: use promise to wait for creating new user.
            if (!user) {
                // No user with this token.
                cb("Not found", null);
            }

            // TODO: check for validity of the token.
            cb(null, user);
        });
    };

    /**
    * Get a promise by their accessToken - promise version. 
    */
    public getUserByAccessToken2 (accessToken: string): q.Promise<IUser> {
        var result = q.Promise<IUser>((resolve: (resultUser: IUser) => void, reject: (error: any) => void) => {
            User.findOne({ accessToken: accessToken }, (err: any, resultUser: IUser) => {
                if (err) {
                    reject(err);
                }
                resolve(resultUser);
            });
        });
        return result;
    };

    /**
    * Get a user by their externalId. 
    */
    public getUserByExternalId(externalId: string): q.Promise<IUser> {
        var result = q.Promise<IUser>((resolve: (resultUser: IUser) => void, reject: (error: any) => void) => {
            User.findOne({ externalId: externalId }, (err: any, resultUser: IUser) => {
                if (err) {
                    reject(err);
                }
                resolve(resultUser);
            });
        });
        return result;
    };

    /**
     * Create a new user.
     * For now just a simple one to one mapping with mongoose create function, but 'Promisied'.
     * @param user
     * @param cb
     */
    public create(newUser: IUser): q.Promise<IUser> { 
        var result = q.Promise<IUser>(
        (resolve: (resultUser: IUser) => void, reject: (error: any) => void) => {
            User.create(newUser, (err: any, resultUser: IUser) => {
                if (err) {
                    reject(err);
                }
                resolve(resultUser);
            });
        });
        return result;
    };


    /**
     * Find one or more users give some criteria (in an JS Object format).
     * For now just a simple one to one mapping with the mongoose find function, but 'Promisied'.
     */
    public find(cond: Object): q.Promise<IUser[]> {
        var result = q.Promise<IUser[]>(
        (resolve: (users: IUser[]) => void, reject: (error: any) => void) => {
            User.find(cond, (err: any, users: IUser[]) => {
                if (err) {
                    reject(err);
                }
                resolve(users);
            });
        });
        return result;
    };
}