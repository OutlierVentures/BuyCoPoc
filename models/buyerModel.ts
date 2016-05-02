import mongoose = require("mongoose");
import q = require("q");

/**
* Buyer as a Mongoose schema.
*/
export var buyerSchema = new mongoose.Schema({
    userExternalId: String, // FK.
    isActive: { type: Boolean, default: true },
    company: String,
    email: String,
    addressLine1: String,
    addressLine2: String,
    postalCode: String,
    city: String,
    country: String,
    countryCode: String,
    telephone: String,
    region: String,
    regionCode: String
}, {
        timestamps: true
    });

export interface IBuyer extends mongoose.Document { // , TODO inherit (extra) from BuyerModel instead of having body.
    _id: mongoose.Types.ObjectId;
    userExternalId: string;
    isActive: boolean;
    company: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    city: string;
    country: string;
    countryCode: string;
    telephone: string;
    region: string;
    regionCode: string;
}

/**
* A buyer (e.g. the buyer info of a user).
*/
// TODO BW Don't export Buyer, but keep it private and make all necessary 'repo methods' here.
// Mongo DB can then be switched with blockchain or any other data layer by only making changes here.
var Buyer = mongoose.model<IBuyer>("Buyers", buyerSchema);

interface IBuyerCallback {
    (error: any, buyer: IBuyer): void;
}

/**
* Get a buyer by their externalId (e.g. Uphold ID).
*/
export class BuyerRepository {
    public getBuyerByUserExternalId(externalId: string): q.Promise<IBuyer> {
        var result = q.Promise<IBuyer>(
            (resolve: (buyer: IBuyer) => void, reject: (error: any) => void) => {
                Buyer.findOne({ userExternalId: externalId }, (err, resultBuyer: IBuyer) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(resultBuyer);
                });
            });
        return result;
    };

    /**
     * Find one or more users give some criteria (in an JS Object format).
     * For now just a simple one to one mapping with the mongoose find function, but 'Promisied'.
     */
    public find(cond: Object): q.Promise<IBuyer[]> {
        var result = q.Promise<IBuyer[]>(
            (resolve: (buyers: IBuyer[]) => void, reject: (error: any) => void) => {
                Buyer.find(cond, (err: any, results: IBuyer[]) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(results);
                });
            });
        return result;
    };

    /**
     * Create a buyer (e.g. upgrade a user to a buyer).
     * For now just a simple one to one mapping with mongoose create function, but 'Promisied'.
     * @param buyer
     */
    public create(newBuyer: IBuyer): q.Promise<IBuyer> {
        var result = q.Promise<IBuyer>(
            (resolve: (resultBuyer: IBuyer) => void, reject: (error: any) => void) => {
                Buyer.create(newBuyer, (err: any, resultBuyer: IBuyer) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(resultBuyer);
                });
            });
        return result;
    };

    /**
     * Update a buyer.
     * @param buyer
     */
    public update(updatedBuyer: IBuyer): q.Promise<IBuyer> {
        var t = this;
        var result = q.Promise<IBuyer>(
            (resolve: (resultBuyer: IBuyer) => void, reject: (error: any) => void) => {

                Buyer.update({ userExternalId: updatedBuyer.userExternalId }, { $set: updatedBuyer }, (err: any, affectedRows: number, resultBuyer: IBuyer) => {
                    if (err) {
                        reject(err);
                    }

                    // Get the updated buyer document
                    t.getBuyerByUserExternalId(updatedBuyer.userExternalId)
                        .then(s => resolve(s), err => reject(err));
                });
            });
        return result;
    };

    public deleteByExternalId(externalId: string): q.Promise<IBuyer> {
        var result = q.Promise<IBuyer>(
            (resolve: (resultBuyer: IBuyer) => void, reject: (error: any) => void) => {
                Buyer.findOneAndRemove({ userExternalId: externalId }, (err: any, result: IBuyer) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(result);
                });
            });
        return result;
    };
}