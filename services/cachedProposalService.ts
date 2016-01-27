import request = require('request');
import userModel = require('../models/userModel');
import proposalModel = require('../models/proposalModel');
import offerModel = require('../offers/offerModel');

import serviceFactory = require('../services/serviceFactory');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import tools = require('../lib/tools');
import configurationService = require('./configurationService');
import proposalService = require('./proposalService');

import Q = require('q');

interface IBigNumber {
    toNumber(): number
}

/**
 * Service for dealing with buying proposals on the blockchain. All functions
 * return promises.
 */
export class CachedProposalService {
    proposalService: proposalService.ProposalService;

    constructor() {
    }

    initialize(): Q.IPromise<boolean> {
        var defer = Q.defer<boolean>();

        serviceFactory.createProposalService()
            .then((ps) => {
                this.proposalService = ps;
                defer.resolve(true);
            })
            .catch((err) => {
                defer.reject(err);
            });

        return defer.promise;
    }

    /**
     * Ensures that the cache of proposals in MongoDB is up to date.
     */
    ensureMongoCache(): Q.IPromise<MongoCacheUpdateResult> {
        var defer = Q.defer<MongoCacheUpdateResult>();

        // Get all promises
        this.proposalService.getAll()
            .then((proposals) => {
                var allProposalsPromises = new Array<Q.Promise<proposalModel.IProposal>>();

                for (var i = 0; i < proposals.length; i++) {
                    var p = proposals[i];
                    var proposalDefer = Q.defer<proposalModel.IProposal>();
                    allProposalsPromises.push(proposalDefer.promise);

                    proposalModel.Proposal.findOne().where("contractAddress").equals(p.contractAddress).exec()
                        .then((currentProposal) => {
                            var savePromise;

                            if (!currentProposal) {
                                // Create it
                                savePromise = proposalModel.Proposal.create(p);
                            }
                            else {
                                // Update it
                                currentProposal.productName = p.productName;
                                currentProposal.productDescription = p.productDescription;
                                currentProposal.mainCategory = p.mainCategory;
                                currentProposal.subCategory = p.subCategory;

                                currentProposal.endDate = p.endDate;
                                currentProposal.ultimateDeliveryDate = p.ultimateDeliveryDate;

                                currentProposal.maxPrice = p.maxPrice;

                                var saveDefer = Q.defer<proposalModel.IProposal>();
                                savePromise = saveDefer.promise;

                                currentProposal.save((err, res) => {
                                    if (err) saveDefer.reject(err);
                                    else saveDefer.resolve(currentProposal);
                                });

                                // TODO: process backers, offers, ... - best as related objects in Mongo
                            }

                            savePromise.then(savedProposal => {
                                proposalDefer.resolve(savedProposal);
                            }, err => {
                                proposalDefer.reject(err);
                            });
                        }, (err) => {
                            proposalDefer.reject(err);
                        });
                }

                Q.all(allProposalsPromises)
                    .then(allProposals => {
                        // TODO: actually keep track of updated and created records (pass the info 
                        // in each of the proposals).
                        var result: MongoCacheUpdateResult = {
                            createdObjects: allProposals.length,
                            updatedObjects: 0
                        };

                        defer.resolve(result);
                    }, err => {
                        defer.reject(err);
                    });
            });


        return defer.promise;
    }

}

class MongoCacheUpdateResult {
    updatedObjects: number;
    createdObjects: number;
}