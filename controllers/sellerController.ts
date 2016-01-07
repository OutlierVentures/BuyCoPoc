import express = require("express");
import sellerModel = require("../models/sellerModel");

/**
 * Controller for Sellers.
 */
export class SellerController {
    getAll = (req: express.Request, res: express.Response) => {
        return 1;
    };
    save = (req: express.Request, res: express.Response) => {
        var now = new Date();

        // Get data (using 'object literal' instead of constructor+set props, because it refactors more easily).
        var seller: SellerDocument = {
            userExternalId: req.body.userExternalId,
            isActive: true,
            email: req.body.email,
            dateCreated: now,
            dateUpdated: now,
            company: req.body.company,
            addressLine1: req.body.addressLine1,
            addressline2: req.body.addressLine2,
            postalCode: req.body.postalCode,
            city: req.body.city,
            country: req.body.country,
            telephone: req.body.telephone,
            region: req.body.region
        };

        // TODO Check if seller already exists and save then, update otherwise.
        // userModel.getUserByAccessToken
        // sellerModel.getSellerByUserExternalId();
        if (true) {
            // Seller doesn't exist yet.
             sellerModel.Seller.create(seller, (sellerErr, sellerRes) => {
                if (!sellerErr) {
                    // Handle result.             
                    res.json({
                        "status": "Ok",
                        "seller": sellerRes
                    });
                    // TODO Handle if error.
                } else {
                    res.json({
                        "status": "Error",
                        "msg": sellerErr
                    });
                }
            });
        }
    };
}
