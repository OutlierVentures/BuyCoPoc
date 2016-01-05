import express = require("express");
import userModel = require('../models/userModel');
import configModel = require('../models/configModel');
import serviceFactory = require('../services/serviceFactory');
import proposalModel = require('../models/proposalModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');

/**
 * Controller for Circle membership operations.
 */
export class ProposalController {
    constructor() {
    }

    getAll = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");

        serviceFactory.createProposalService()
            .then(
            function (ps) {
                return ps.getAll();
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposals service"
                });
                // How to ensure that the process stops here? Is the next then()
                // processed in this case?
                return null;
            })
            .then(
            function (proposals) {
                res.json(proposals);
            }, function (proposalsErr) {
                res.status(500).json({
                    "error": proposalsErr,
                    "error_location": "getting proposals"
                });
                return null;
            })
    }

    getOne = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");

        serviceFactory.createProposalService()
            .then(
            function (ps) {
                return ps.getOne(req.params.id);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposals service"
                });
                // How to ensure that the process stops here? Is the next then()
                // processed in this case?
                return null;
            })
            .then(
            function (proposals) {
                res.json(proposals);
            }, function (proposalsErr) {
                res.status(500).json({
                    "error": proposalsErr,
                    "error_location": "getting proposals"
                });
                return null;
            })
    }

    create = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");
        var proposalData = <proposalModel.IProposal>req.body;

        serviceFactory.createProposalService()
            .then(
            function (ps) {
                return ps.create(proposalData);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposal service"
                });
                // How to ensure that the process stops here? Is the next then()
                // processed in this case?
                return null;
            })
            .then(
            function (proposal) {
                res.json(proposal);
            }, function (createErr) {
                res.status(500).json({
                    "error": createErr,
                    "error_location": "creating proposal"
                });
                return null;
            })

    }
}
