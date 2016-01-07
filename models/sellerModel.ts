import mongoose = require("mongoose");

// TODO: Duplicate with seller.ts (buyCo.Domain.ISeller).
export interface ISeller {
    userExternalId: string; // FK.
    isActive: Boolean;
    email: string;
    dateCreated: Date;
    dateUpdated: Date;
    company: string;
    addressLine1: string;
    addressline2: string;
    postalCode: string;
    city: string;
    country: string;
    telephone: string;
    region: string;
}

export class SellerModel implements ISeller {
    dateCreated: Date;
    dateUpdated: Date;
    company: string;
    addressLine1: string;
    addressline2: string;
    postalCode: string;
    city: string;
    country: string;
    telephone: string;
    region: string;

    constructor(
        public userExternalId: string, // FK.
        public email: string,
        public isActive: Boolean) {
    }
}
// END Duplication.

export interface ISellerDocument extends mongoose.Document { // , SellerModel instead of body.
    userExternalId: String;
    isActive: Boolean;
    dateCreated: Date;
    dateUpdated: Date;
    company: String;
    email: String;
    addressLine1: String;
    addressline2: String;
    postalCode: String;
    city: String;
    country: String;
    telephone: String;
    region: String;
}

/**
* Seller as a Mongoose schema.
*/
export var sellerSchema = new mongoose.Schema({
    userExternalId: String, // FK.
    isActive: { type: Boolean, default: true },
    dateCreated: { type: Date, default: Date.now },
    dateUpdated: { type: Date, default: Date.now },
    company: String,
    email: String,
    addressLine1: String,
    addressline2: String,
    postalCode: String,
    city: String,
    country: String,
    telephone: String,
    region: String
});

/**
* A seller (e.g. the seller info of a user).
*/
export var Seller = mongoose.model<ISellerDocument>("Sellers", sellerSchema);

interface ISellerCallback {
    (error: any, seller: Seller)
}
/**
* Get a seller by their externalId (e.g. Uphold ID).
*/
export var getSellerByUserExternalId = (externalId: string, cb: ISellerCallback) => {
    Seller.findOne({ externalId: String }, (err, sellerDocument) => {
        // TODO: use promise to wait for creating new user.
        if (!sellerDocument) {
            // No user with this token.
            cb("Not found", null);
        }
        var seller: = new SellerModel {
            userExternalId: sellerDocument.userExternal,
            isActive: sellerDocument.userExternal;
        dateCreated: Date;
        dateUpdated: Date;
        company: String;
        email: String;
        addressLine1: String;
        addressline2: String;
        postalCode: String;
        city: String;
        country: String;
        telephone: String;
        region: String;
        cb(null, seller);
    });
}

/**
* Get all sellers (TODO: add criteria as parameters for filtering, for instance alle sellers from country, or certain category).
*/
export var getSellers = (circleId: string, cb: any) => {
    Seller.find({})
        .exec(cb);
}

//export var create = (seller: ISeller, cb: ISellerCallback) => {
//    sellerModel.create(seller, cb);
//};