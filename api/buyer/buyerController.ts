import express = require("express");
import { IUser, User, UserRepository } from "../../models/userModel";
import { IBuyer, BuyerRepository } from "../../models/buyerModel";
import Q = require("q");

var userRepo = new UserRepository();
var buyerRepo = new BuyerRepository();

/**
 * Controller for Buyers.
 */
// TODO BW dd. 2015-01-08: Perhaps all buyerModel stuff should only be called from separate buyerService, and this controller should only do the mapping of that service from and to request, resp. response.
export class BuyerController {
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
            return buyerRepo.getBuyerByUserExternalId(user.externalId);
        }).then((buyer: IBuyer) => {
            if (buyer) {
                return res.send(buyer);
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

        var saveBuyerDefer = Q.defer<IBuyer>();

        // Check if there's already a buyer for the current user.
        buyerRepo.getBuyerByUserExternalId(userExternalId)
            .then((buyerResult: IBuyer) => {
                var doesBuyerExist: Boolean = !!buyerResult;

                // Make BuyerDocument from data from posted request/form.
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
                if (doesBuyerExist) {
                    buyerRepo.update(input as IBuyer)
                        .then((buyer: IBuyer) => {
                            saveBuyerDefer.resolve(buyer);
                        }).catch((err: any) => {
                            saveBuyerDefer.reject(err);
                        });
                } else {
                    // Buyer doesn't exist yet.
                    buyerRepo.create(input as IBuyer)
                        .then((buyerRes: IBuyer) => {
                            saveBuyerDefer.resolve(buyerRes);
                        }).catch((err: any) => {
                            saveBuyerDefer.reject(err);
                        });
                }
            });

        saveBuyerDefer.promise.then(buyer => {
            // Save it with the user
            userRepo.getUserByExternalId(userExternalId)
                .then(user => {
                    user.buyerId = buyer.id;
                    // Currently any user with a buyer account uses the buyer perspective.
                    user.preferences.perspective = "buyer";
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
                            "buyer": buyer
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
