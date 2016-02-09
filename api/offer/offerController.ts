import express = require("express");
import { UserRepository } from "../../models/userModel";

import configModel = require('../../models/configModel');
import serviceFactory = require('../../services/serviceFactory');
import proposalService = require('../../services/proposalService');
import upholdService = require('../../services/upholdService');

import proposalModel = require('../../models/proposalModel');
import offerModel = require('../../models/offerModel');

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
        //var token = req.header("AccessToken");

        // TODO: add permission checks. Offer detail data shouldn't be public.

        var offerId = req.params.id;

        serviceFactory.createOfferContractService()
            .then(
            function (ocs) {
                return ocs.getOne(offerId);
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
                    "error_location": "getting offer"
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
