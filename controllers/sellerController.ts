import express = require("express");
import userModel = require("../models/userModel");
import sellerModel = require("../models/sellerModel");

/**
 * Controller for Sellers.
 */
// TODO BW dd. 2015-01-08: Perhaps all sellerModel stuff should only be called from separate sellerService, and this controller should only do the mapping of that service from and to request, resp. response.
export class SellerController {
    getAll = (req: express.Request, res: express.Response) => {
        userModel.User.find({}, (err, result) => {
            res.json(result);
        });
    };
    save = (req: express.Request, res: express.Response) => {
        var now = new Date();

        var userExternalId = req.body.userExternalId;

        // TODO Try to get seller 
        // userModel.
        sellerModel.getSellerByUserExternalId(userExternalId, (sellerErr: any, sellerResult: ISeller) => {
            if (sellerErr) {
                return;
            }
            var doesSellerExist = !!sellerResult;

            // Make SellerDocument from data from posted request/form.
            // Note: using 'object literal' instead of constructor+ set props, because it refactors more easily).
            var input = new sellerModel.Seller({
                userExternalId: userExternalId,
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
            });
            // If already exists and no error then save, update otherwise.
            if (doesSellerExist) {
                sellerModel.Seller.update({ userExternalId: userExternalId }, input, (sellerErr: any, seller: ISeller, nrOfAffected: number) => {
                    if (!sellerErr) {
                        // Handle result.             
                        res.json({
                            "status": "Ok",
                            "seller": seller
                        });
                        // TODO Handle if error.
                    } else {
                        res.json({
                            "status": "Error",
                            "msg": sellerErr
                        });
                    }
                });
            } else {
                // Seller doesn't exist yet.
                sellerModel.Seller.create(input, (sellerErr, sellerRes) => {
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
        });
    };
}
