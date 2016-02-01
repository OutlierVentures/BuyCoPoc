import mongoose = require("mongoose");
import q = require("q");

/**
* Seller as a Mongoose schema.
*/
export var sellerSchema = new mongoose.Schema({
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

export interface ISeller extends mongoose.Document { // , TODO inherit (extra) from SellerModel instead of having body.
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
* A seller (e.g. the seller info of a user).
*/
// TODO BW Don't export Seller, but keep it private and make all necessary 'repo methods' here.
// Mongo DB can then be switched with blockchain or any other data layer by only making changes here.
var Seller = mongoose.model<ISeller>("Sellers", sellerSchema);

interface ISellerCallback {
    (error: any, seller: ISeller): void;
}

/**
* Get a seller by their externalId (e.g. Uphold ID).
*/
export class SellerRepository {
    public getSellerByUserExternalId(externalId: string): q.Promise<ISeller> {
        var result = q.Promise<ISeller>(
            (resolve: (seller: ISeller) => void, reject: (error: any) => void) => {
                Seller.findOne({ userExternalId: externalId }, (err, resultSeller: ISeller) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(resultSeller);
                });
            });
        return result;
    };

    /**
     * Find one or more users give some criteria (in an JS Object format).
     * For now just a simple one to one mapping with the mongoose find function, but 'Promisied'.
     */
    public find(cond: Object): q.Promise<ISeller[]> {
        var result = q.Promise<ISeller[]>(
        (resolve: (sellers: ISeller[]) => void, reject: (error: any) => void) => {
            Seller.find(cond, (err: any, results: ISeller[]) => {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });
        return result;
    };

    /**
     * Create a seller (e.g. upgrade a user to a seller).
     * For now just a simple one to one mapping with mongoose create function, but 'Promisied'.
     * @param seller
     */
    public create(newSeller: ISeller): q.Promise<ISeller> { 
        var result = q.Promise<ISeller>(
        (resolve: (resultSeller: ISeller) => void, reject: (error: any) => void) => {
            Seller.create(newSeller, (err: any, resultSeller: ISeller) => {
                if (err) {
                    reject(err);
                }
                resolve(resultSeller);
            });
        });
        return result;
    };

    /**
     * Update a seller.
     * @param seller
     */
    public update(updatedSeller: ISeller): q.Promise<ISeller> {
        var result = q.Promise<ISeller>(
            (resolve: (resultSeller: ISeller) => void, reject: (error: any) => void) => {

                Seller.update({ userExternalId: updatedSeller.userExternalId }, { $set: updatedSeller}, (err: any, affectedRows: number, resultSeller: ISeller) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(updatedSeller);
                });
            });
        return result;
    };

    public deleteByExternalId(externalId: string): q.Promise<ISeller> {
        var result = q.Promise<ISeller>(
            (resolve: (resultSeller: ISeller) => void, reject: (error: any) => void) => {
                Seller.findOneAndRemove({ userExternalId: externalId }, (err: any, result: ISeller) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
        return result;
    };       
}