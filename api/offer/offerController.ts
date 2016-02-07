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

    create = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");
        var proposalId = req.params.id;
        var offerData = <offerModel.IOffer>req.body;

        serviceFactory.createOfferContractService()
            .then(
            function (ocs) {
                return ocs.create(proposalId, offerData);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposal service"
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
