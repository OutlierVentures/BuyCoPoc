import express = require("express");
import util = require('util');
import expressValidator = require('express-validator');

import { UserRepository } from "../../models/userModel";
import configModel = require('../../models/configModel');
import serviceFactory = require('../../services/serviceFactory');
import proposalService = require('../../services/proposalService');
import upholdService = require('../../services/upholdService');


import proposalModel = require('../../models/proposalModel');
import userModel = require('../../models/userModel');

import _ = require('underscore');

var userRepo = new UserRepository();

/**
 * Controller for BuyCo proposals.
 */
export class ProposalController {
    constructor() {
    }

    get = (req: express.Request, res: express.Response) => {
        var token = req.headers["accesstoken"];

        // Determine the applicable filters from the request URL - if any.
        // Example https://selfsigned.blockstars.io:4124/proposal/category/Books/Fantasy%20books?maxPrice=2&minimumTotalAmount=250
        // Most filter parameters are taken from the URL Query (e.g. URL parameters) api/
        let proposalFilter: proposalModel.IProposalFilter = req.query;

        // Only the maincategory and subcategory are in the URL part itself.
        var mainCategory = req.params.mainCategory;
        var subCategory = req.params.subCategory;

        proposalFilter.mainCategory = mainCategory;
        proposalFilter.subCategory = subCategory;
        
        // Create a proposal service and query it for proposals within the determined filter - if any.
        serviceFactory.createCachedProposalService()
            .then(
            function (cps) {
                return cps.get(proposalFilter);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposals service"
                });
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
            });
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
        var proposalData = <IProposal>req.body.proposal;
        var transactionId = <string>req.body.transactionId;

        req.checkBody('proposal.mainCategory', "Main category").notEmpty();
        req.checkBody('proposal.subCategory', "Sub category").notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            res.status(400).send('There have been validation errors: ' + util.inspect(errors));
            return;
        }

        serviceFactory.createProposalService()
            .then(ps => {
                if (transactionId)
                    // User has submitted backing transaction
                    return ps.processCreate(transactionId, proposalData);
                else
                    return ps.create(proposalData);
            })
            .then(proposal => {
                res.json(proposal);
            })
            .catch(createErr => {
                res.status(500).json({
                    "error": createErr,
                    "error_location": "creating proposal"
                });
                return null;
            });

    }

    /**
     * Back a proposal for an amount of products. This includes transferring the funds for
     * the maximum price.
     */
    back = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");
        var transactionId = <string>req.body.transactionId;
        var proposalData = <proposalModel.IProposal>req.body.proposal;
        var amount = <number>req.body.amount;
        var fromCard = <string>req.body.fromCard;

        var proposalService: proposalService.ProposalService;

        // TODO: transfer funds. This requires UX, including the user being informed of the transfer
        // and the source card ID for the funds specified.
        // For a more decentralized version this could be done client side. The Uphold token 
        // could live in the browser. Server side would then check whether the transfer had completed.
        // --> could we do this without holding the user's Uphold tokens entirely?
        userRepo.getUserByAccessToken(token, function (userErr, user) {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "loading user data"
                });
            }

            serviceFactory.createProposalService()
                .then(
                function (ps) {
                    proposalService = ps;

                    if (transactionId)
                        // User has submitted backing transaction
                        return ps.processBacking(transactionId, proposalData, amount * 1, user, fromCard);
                    else
                        return ps.back(proposalData, amount * 1, user, fromCard);
                },
                function (initErr) {
                    res.status(500).json({
                        "error": initErr,
                        "error_location": "initializing proposal service"
                    });
                    return null;
                })
                .then(function (proposalBacking) {
                    // Return the transaction ID
                    res.json(proposalBacking);
                }, function (backErr) {
                    res.status(500).json({
                        "error": backErr,
                        "error_location": "backing proposal"
                    });
                    return null;
                });
        });
    }

    /**
     * Report the delivery of an order.
     */
    deliveryReport = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");
        var proposalId = req.params.id;
        var backingIndex = <number>req.body.backingIndex;
        var transactionId = <string>req.body.transactionId;
        var isDeliveryCorrect = <boolean>req.body.isDeliveryCorrect;

        var proposalService: proposalService.ProposalService;

        // TODO: transfer funds. This requires UX, including the user being informed of the transfer
        // and the source card ID for the funds specified.
        // For a more decentralized version this could be done client side. The Uphold token 
        // could live in the browser. Server side would then check whether the transfer had completed.
        // --> could we do this without holding the user's Uphold tokens entirely?
        userRepo.getUserByAccessToken(token, function (userErr, user) {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "loading user data"
                });
            }

            serviceFactory.createProposalService()
                .then(
                function (ps) {
                    proposalService = ps;

                    if (transactionId)
                        // User has submitted backing transaction
                        return ps.processDeliveryReport(proposalId, transactionId, backingIndex, isDeliveryCorrect, user);
                    else
                        return ps.deliveryReport(proposalId, backingIndex, isDeliveryCorrect, user);
                },
                function (initErr) {
                    res.status(500).json({
                        "error": initErr,
                        "error_location": "initializing proposal service"
                    });
                    return null;
                })
                .then(function (proposalBacking) {
                    // Return the transaction ID
                    res.json(proposalBacking);
                }, function (backErr) {
                    res.status(500).json({
                        "error": backErr,
                        "error_location": "reporting delivery"
                    });
                    return null;
                });
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

    getOffers = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var user: userModel.IUser;

        userRepo.getUserByAccessToken2(token)
            .then(u => {
                user = u;

                return serviceFactory.createProposalService();
            }, userErr => {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "loading user data"
                });
                return null;
            })
            .then(
            function (ps) {
                return ps.getOffers(req.params.id, user);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposal service"
                });
                return null;
            })
            .then(
            function (offers) {
                res.json(offers);
            }, function (offersErr) {
                res.status(500).json({
                    "error": offersErr,
                    "error_location": "getting offres"
                });
                return null;
            })
    }

    getClosingCandidates = (req: express.Request, res: express.Response) => {
        var token = req.headers["accesstoken"];
        
        // Create a proposal service and query it for proposals within the determined filter - if any.
        serviceFactory.createCachedProposalService()
            .then(
            function (cps) {
                return cps.getClosingCandidates();
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposals service"
                });
                return null;
            })
            .then(
            function (proposals) {
                res.json(proposals);
            }, function (proposalsErr) {
                res.status(500).json({
                    "error": proposalsErr,
                    "error_location": "getting proposals which are candidate for closing"
                });
                return null;
            });
    }

    close = (req: express.Request, res: express.Response) => {
        var token = req.headers["accesstoken"];

        var proposalId = req.params.id;

        // Create a proposal service and query it for proposals within the determined filter - if any.
        serviceFactory.createProposalService()
            .then(
            function (ps) {
                return ps.close(proposalId);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposals service"
                });
                return null;
            })
            .then(
            function (proposal) {
                res.json(proposal);
            }, function (proposalsErr) {
                res.status(500).json({
                    "error": proposalsErr,
                    "error_location": "closing proposal"
                });
                return null;
            });
    }

    /**
     * Execute any outstanding payments to sellers, owners or buyers.
     */
    processPayments = (req: express.Request, res: express.Response) => {
        var proposalId = req.params.id;

        // Create a proposal service and query it for proposals within the determined filter - if any.
        serviceFactory.createFulfilmentService()
            .then(
            function (fuls) {
                return fuls.processPayments(proposalId);
            },
            function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing fulfilment service"
                });
                return null;
            })
            .then(
            function (proposal) {
                res.json(proposal);
            }, function (proposalsErr) {
                res.status(500).json({
                    "error": proposalsErr,
                    "error_location": "processing proposal payments"
                });
                return null;
            });
    }



}
