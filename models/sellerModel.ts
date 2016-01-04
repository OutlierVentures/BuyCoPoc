import mongoose = require("mongoose");


/**
* Seller as a Typescript interface.
*/
export interface ISeller extends mongoose.Document {
    userExternalId: string, // FK.
    isActive: Boolean,
    dateCreated: Date,
    dateUpdated: Date,
    company: string,
    email: string,
    addressLine1: string,
    addressline2: string,
    city: string,
    country: string,
    telephone: string,
    region: string
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
export var Seller = mongoose.model<ISeller>("Sellers", sellerSchema);

interface ISellerCallback {
    (error: any, seller: ISeller)
}
/**
    * Get a seller by their externalId (e.g. Uphold ID).
    */
export var getSellerByUserExternalId = (externalId: string, cb: ISellerCallback) => {
    Seller.findOne({ externalId: String }, function (err, seller) {
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
}