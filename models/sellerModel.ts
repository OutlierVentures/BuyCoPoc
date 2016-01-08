import mongoose = require("mongoose");

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

export interface ISeller extends mongoose.Document { // , SellerModel instead of body.
    _id: mongoose.Types.ObjectId;
    userExternalId: string;
    isActive: boolean;
    dateCreated: Date;
    dateUpdated: Date;
    company: string;
    email: string;
    addressLine1: string;
    addressline2: string;
    postalCode: string;
    city: string;
    country: string;
    telephone: string;
    region: string;
}

/**
* A seller (e.g. the seller info of a user).
*/
// TODO BW Perhaps we shouldn't export Seller, but keep it internal and make all necessary 'repo methods' here that use it.
// Mongo DB can then be switched with blockchain or any other data layer.
export var Seller = mongoose.model<ISeller>("Sellers", sellerSchema);

interface ISellerCallback {
    (error: any, seller: ISeller): void;
}
/**
* Get a seller by their externalId (e.g. Uphold ID).
*/
export var getSellerByUserExternalId = (externalId: string, cb: ISellerCallback) => {
    Seller.findOne({ externalId: String }, (err, seller: ISeller) => {
        // TODO: use promise to wait for creating new user.
        if (!seller) {
            // No user with this token.
            cb("Not found", null);
        }
        
        cb(null, seller);
    });
}

/**
* Get all sellers (TODO: add criteria as parameters for filtering, for instance alle sellers from country, or certain category).
*/
export var getSellers = (circleId: string, cb: any) => {
    Seller.find({})
        .exec(cb);
};

export var create = (seller: ISeller, cb: ISellerCallback) => {
    Seller.create(seller, cb);
};

export var deleteByExternalId = (externalId: string, cb: ISellerCallback) => {
    Seller.findOneAndRemove({ userExternalId: externalId }, (err, result) => {
        cb(err, result);
    });
};
        
    