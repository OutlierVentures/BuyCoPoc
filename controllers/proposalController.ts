import express = require("express");
import { UserRepository } from "../models/userModel";

import configModel = require('../models/configModel');
import serviceFactory = require('../services/serviceFactory');
import proposalService = require('../services/proposalService');
import upholdService = require('../services/upholdService');

import proposalModel = require('../models/proposalModel');

import web3plus = require('../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');

var userRepo = new UserRepository();

/**
 * Controller for Circle membership operations.
 */
export class ProposalController {
    constructor() {
    }

    getAll = (req: express.Request, res: express.Response) => {
        var token = req.headers["accesstoken"];

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

    /**
     * Back a proposal for an amount of products. This includes transferring the funds for
     * the maximum price.
     */
    back = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");
        var proposalData = <proposalModel.IProposal>req.body.proposal;
        var amount = <number>req.body.amount;

        var proposalService: proposalService.ProposalService;

        // TODO: transfer funds. This requires UX, including the user being informed of the transfer
        // and the source card ID for the funds specified.
        // For a more decentralized version this could be done client side. The Uphold token 
        // could live in the browser. Server side would then check whether the transfer had completed.
        // --> could we do this without holding the user's Uphold tokens entirely?
        userRepo.getUserByAccessToken(token, function (userErr, user) {
            serviceFactory.createProposalService()
                .then(
                function (ps) {
                    proposalService = ps;

                    return ps.back(proposalData, amount * 1, user);
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
                function (tx) {
                    // Empty response, no need to communicate anything.
                    res.sendStatus(200);
                }, function (backErr) {
                    res.status(500).json({
                        "error": backErr,
                        "error_location": "backing proposal"
                    });
                    return null;
                })

        });


    }

    getBackers = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");

        serviceFactory.createProposalService()
            .then(
            function (ps) {
                return ps.getBackers(req.params.id);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposal service"
                });
                return null;
            })
            .then(
            function (backers) {
                res.json(backers);
            }, function (backersErr) {
                res.status(500).json({
                    "error": backersErr,
                    "error_location": "getting backers"
                });
                return null;
            })
    }

}