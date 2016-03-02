import express = require("express");
import { UserRepository } from "../../models/userModel";

import configModel = require('../../models/configModel');
import serviceFactory = require('../../services/serviceFactory');
import proposalService = require('../../services/proposalService');
import upholdService = require('../../services/upholdService');

import proposalModel = require('../../models/proposalModel');
import offerModel = require('../../models/offerModel');
import userModel = require('../../models/userModel');

import web3plus = require('../../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');

var userRepo = new UserRepository();

/**
 * Controller for offers.
 */
export class OfferController {
    constructor() {
    }

    getOne = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");
        
        var offerId = req.params.id;
        var user: userModel.IUser;

        userRepo.getUserByAccessToken2(token)
            .then(u => {
                user = u;
                return serviceFactory.createOfferContractService();
            }, userErr => {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "loading user data"
                });
                return null;
            })
            .then(
            function (ocs) {
                return ocs.getOne(offerId, user);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing offer service"
                });
                return null;
            })
            .then(
            function (proposal) {
                res.json(proposal);
            })
            .catch(getErr => {
                res.status(500).json({
                    "error": getErr,
                    "error_location": "getting offer"
                });
                return null;
            });
    }

    /**
     * Get buyer info, only accessible to seller who made the offer where the offer is the accepted
     * offer.
     */
    getBuyers = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var proposalId = req.params.proposalId
        var offerId = req.params.offerId;
        var user: userModel.IUser;

        userRepo.getUserByAccessToken2(token)
            .then(u => {
                user = u;

                return serviceFactory.createOfferContractService();
            }, userErr => {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "loading user data"
                });
                return null;
            })
            .then(
            function (ocs) {
                return ocs.getBuyers(proposalId, offerId, user);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing offer service"
                });
                return null;
            })
            .then(
            function (buyers) {
                res.json(buyers);
            })
            .catch(getErr => {
                res.status(500).json({
                    "error": getErr,
                    "error_location": "getting offer buyer info"
                });
                return null;
            });
    }

    create = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");
        var proposalId = req.params.id;
        var offerData = <offerModel.IOffer>req.body.offer;
        var transactionId: string = req.body.transactionId;

        serviceFactory.createOfferContractService()
            .then(
            function (ocs) {
                if (transactionId)
                    // User has submitted backing transaction
                    return ocs.processCreate(transactionId, proposalId, offerData);
                else
                    return ocs.create(proposalId, offerData);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing offer service"
                });
                return null;
            })
            .then(
            function (proposal) {
                res.json(proposal);
            }, function (createErr) {
                res.status(500).json({
                    "error": createErr,
                    "error_location": "creating offer"
                });
                return null;
            })

    }
}
