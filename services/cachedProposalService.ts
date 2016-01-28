import request = require('request');
import userModel = require('../models/userModel');
import proposalModel = require('../models/proposalModel');
import {IMainCategory, ISubCategory} from '../models/categoryModel';
import offerModel = require('../offers/offerModel');

import serviceFactory = require('../services/serviceFactory');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import tools = require('../lib/tools');
import configurationService = require('./configurationService');
import proposalService = require('./proposalService');

import Q = require('q');
import { Promise } from "q";

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

    initialize(psParam?: proposalService.ProposalService): Q.IPromise<boolean> {
        return Promise<boolean>((resolve, reject) => {
            if (psParam) {
                this.proposalService = psParam;
                resolve(true);
            }
            else {
                serviceFactory.createProposalService()
                    .then((ps) => {
                        this.proposalService = ps;
                        resolve(true);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        });
    }

    /**
     * Gets all proposals.
     * TODO: allow filtering.
     */
    get(): PromiseLike<proposalModel.IProposalDocument[]> {
        return proposalModel.Proposal.find({}).exec();
    }

    /**
     * Ensures that the cache of proposals in MongoDB is up to date.
     */
    ensureMongoCache(): Q.IPromise<MongoCacheUpdateResult> {
        return Promise<MongoCacheUpdateResult>((resolve, reject) => {

            // Get all promises. Then for each of them, ensure it's stored in Mongo.
            this.proposalService.getAll()
                .then((proposals) => {
                    var proposalsPromises = new Array<Q.Promise<proposalModel.IProposal>>();

                    for (var i = 0; i < proposals.length; i++) {
                        var p = proposals[i];
                        proposalsPromises.push(this.ensureCacheProposal(p));
                    }

                    Q.all(proposalsPromises)
                        .then(allProposals => {
                            // TODO: actually keep track of updated and created records (pass the info 
                            // in each of the proposals).
                            var result: MongoCacheUpdateResult = {
                                createdObjects: allProposals.length,
                                updatedObjects: 0
                            };

                            resolve(result);
                        }, err => {
                            reject(err);
                        });
                });
        });
    }

    /**
     * Ensure that this proposal is present and up to date in the Mongo cache.
     * @param p
     */
    ensureCacheProposal(p: proposalModel.IProposal): Promise<proposalModel.IProposal> {
        return Promise<proposalModel.IProposal>((resolve, reject) => {
            proposalModel.Proposal.findOne().where("contractAddress").equals(p.contractAddress).exec()
                .then((currentProposal) => {
                    // TODO: refactor this to a separate method too
                    var saveDefer = Q.defer<proposalModel.IProposal>();

                    if (!currentProposal) {
                        // Create it
                        proposalModel.Proposal.create(p, (err, res) => {
                            if (err) saveDefer.reject(err);
                            else saveDefer.resolve(res);
                        });
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

                        currentProposal.save((err, res) => {
                            if (err) saveDefer.reject(err);
                            else saveDefer.resolve(currentProposal);
                        });

                        // TODO: process backers, offers, ... - best as related objects in Mongo
                    }

                    saveDefer.promise.then(savedProposal => {
                        resolve(savedProposal);
                    }, err => {
                        reject(err);
                    });
                }, (err) => {
                    reject(err);
                });
        });

    }

}

class MongoCacheUpdateResult {
    updatedObjects: number;
    createdObjects: number;
}