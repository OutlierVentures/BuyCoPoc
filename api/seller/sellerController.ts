import express = require("express");
import { IUser, User, UserRepository } from "../../models/userModel";
import { ISeller, SellerRepository } from "../../models/sellerModel";
import Q = require("q");

var userRepo = new UserRepository();
var sellerRepo = new SellerRepository();

/**
 * Controller for Sellers.
 */
// TODO BW dd. 2015-01-08: Perhaps all sellerModel stuff should only be called from separate sellerService, and this controller should only do the mapping of that service from and to request, resp. response.
export class SellerController {
    getAll = (req: express.Request, res: express.Response) => {
        User.find({}, (err, result) => {
            res.json(result);
        });
    };
    get = (req: express.Request, res: express.Response) => {
        let externalId = req.url.split("/").pop();
        let externalIdHeader = req.headers["externalid"];
        var isSelf = externalId === externalIdHeader;
        let accessToken = req.headers["accesstoken"];
        
        // Throw unauthorized error when there is no accessToken, externalId in header, or user tries to access other url than self.
        if (!accessToken || !externalIdHeader || !isSelf) {
            res.statusMessage = "User not authenticated.";
            res.status(401);
        }
         
        // TODO BW Check accesstoken (e.g. get user by externalId instead and then check accesstoken matches).
        if (!userRepo.checkCredentials({ accessToken: accessToken, externalId: externalId })) {
            res.statusMessage = "User is not authenticated.";
            return res.status(401);
        };
        userRepo.getUserByAccessToken2(accessToken).then((user: IUser) => {
            return sellerRepo.getSellerByUserExternalId(user.externalId);
        }).then((seller: ISeller) => {
            if (seller) {
                return res.send(seller);
            } else {
                res.send({});
            }
        }).catch((err) => {
            res.status(403).json(err);
        });
    };

    save = (req: express.Request, res: express.Response) => {
        var now = new Date();

        var userExternalId = req.body.userExternalId;

        var saveSellerDefer = Q.defer<ISeller>();

        // Check if there's already a seller for the current user.
        sellerRepo.getSellerByUserExternalId(userExternalId)
            .then((sellerResult: ISeller) => {
                var doesSellerExist: Boolean = !!sellerResult;

                // Make SellerDocument from data from posted request/form.
                // Note: using 'object literal' instead of constructor+ set props, because it refactors more easily).
                var input = {
                    userExternalId: userExternalId,

                    isActive: true,
                    email: req.body.email,
                    company: req.body.company,
                    addressLine1: req.body.addressLine1,
                    addressLine2: req.body.addressLine2,
                    postalCode: req.body.postalCode,
                    city: req.body.city,
                    country: req.body.country,
                    countryCode: req.body.countryCode,
                    telephone: req.body.telephone,
                    region: req.body.region,
                    regionCode: req.body.regionCode,
                };

                // If already exists and no error then save, update otherwise.
                if (doesSellerExist) {
                    sellerRepo.update(input as ISeller)
                        .then((seller: ISeller) => {
                            saveSellerDefer.resolve(seller);
                        }).catch((err: any) => {
                            saveSellerDefer.reject(err);
                        });
                } else {
                    // Seller doesn't exist yet.
                    sellerRepo.create(input as ISeller)
                        .then((sellerRes: ISeller) => {
                            saveSellerDefer.resolve(sellerRes);
                        }).catch((err: any) => {
                            saveSellerDefer.reject(err);
                        });
                }
            });

        saveSellerDefer.promise.then(seller => {
            // Save it with the user
            userRepo.getUserByExternalId(userExternalId)
                .then(user => {
                    user.sellerId = seller.id;
                    user.save((err, userRes) => {
                        if (err) {
                            res.status(500).json({
                                "status": "Error",
                                "msg": err
                            });
                            return;
                        }

                        // Handle result.             
                        res.json({
                            "status": "Ok",
                            "seller": seller
                        });
                    });
                }, err => {
                    res.status(500).json({
                        "status": "Error",
                        "msg": err
                    });
                });
        }, err => {
            res.status(500).json({
                "status": "Error",
                "msg": err
            });
            // 
        });
    };
}
