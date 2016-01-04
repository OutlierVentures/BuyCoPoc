import express = require("express");
import sellerModel = require('../models/sellerModel');
import configModel = require('../models/configModel');
import serviceFactory = require('../services/serviceFactory');

import _ = require('underscore');

/**
 * Controller for Sellers.
 */
export class SellerController {
    constructor() {
    }

    getAll = (req: express.Request, res: express.Response) => {
        return 1;
    };
    save = (req: express.Request, res: express.Response) => {
        // TODO Check if seller already exists and save then, update otherwise.
        // sellerModel.getOne

        if (true) {
            // User didn't exist yet
            sellerModel.Seller.create({
                userExternalId: req.body.userExternalId,
                company: req.body.company,
                email: req.body.email,
                addressLine1: req.body.addressLine1,
                addressline2: req.body.addressLine2,
                city: req.body.addressLine2,
                country: req.body.country,
                telephone: req.body.telephone,
                region: req.body.region
            }
            , function (sellerErr, sellerRes) {
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
        sellerModel.Seller.create(sellerData, (err, seller) => {
            if (err) {
                res.status(500).json({
                    "error": sellerErr,
                    "error_location": "saving Circle data",
                });
                return;
            }
    };

}
