import request = require('request');
import userModel = require('../models/userModel');
// import proposalModel = require('../models/proposalModel');

import { IProposal, Proposal, IProposalDocument, IProposalFilter } from '../models/proposalModel';
import {IMainCategory, ISubCategory} from '../models/categoryModel';
import offerModel = require('../models/offerModel');

import serviceFactory = require('../services/serviceFactory');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import tools = require('../lib/tools');
import configurationService = require('./configurationService');
import proposalService = require('./proposalService');

import _ = require('underscore');

import Q = require('q');
import { IPromise, Promise } from "q";

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

    initialize(psParam?: proposalService.ProposalService): IPromise<boolean> {
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
     * Gets all proposals that match the filter (or just all if no filter :).
     */
    get(proposalFilter: IProposalFilter): PromiseLike<IProposalDocument[]> {
        var query = Proposal.find({});

        // Apply filters to the mongo query. Use the typed methods of mongoose.
        // Field names are contained as strings and hence not typesafe. Not sure 
        // if there is a way to access field names typesafe (something like query.maxPrice.lte(10))
        if (proposalFilter) {
            if (proposalFilter.minPrice) {
                // Sellers are interested in a higher price. Test "greater than or equal"
                query = query.gte("maxPrice", proposalFilter.minPrice + 0);
            }
            if (proposalFilter.maxPrice) {
                // Buyers are interested in a lower price. Test "less than or equal"
                query = query.lte("maxPrice", proposalFilter.maxPrice + 0);
            }
            if (proposalFilter.partNumber) {
                // Use a case insensitive regex to get a case insensitive "contains".
                query = query.where("productSku", RegExp(proposalFilter.partNumber, "i"));
            }
            if (proposalFilter.minimumTotalAmount) {
                query = query.gte("totalAmount", proposalFilter.minimumTotalAmount);
            }
            if (proposalFilter.mainCategory) query = query.where("mainCategory", proposalFilter.mainCategory);
            if (proposalFilter.subCategory) query = query.where("subCategory", proposalFilter.subCategory);

        }

        return query.exec();
    }

    /**
     * Gets all proposals which are up for closing (enddate pased but not closed yet).
     */
    getClosingCandidates(): PromiseLike<IProposalDocument[]> {
        // TODO: handle time zones (now all times are UTC)
        var query = Proposal.find({
            isClosed: false,
            // COULD DO: add date as a parameter
            endDate: { $lte: new Date() }
        })

        return query.exec();
    }



    /**
     * Clear the proposals cache in Mongo.
     */
    clearMongoCache(): IPromise<boolean> {
        return Promise<boolean>((resolve, reject) => {
            Proposal.find({}).remove().exec()
                .then(proposals => resolve(true),
                err=> reject(err));
        });
    }

    /**
     * Ensures that the cache of proposals in MongoDB is up to date.
     */
    ensureMongoCache(): IPromise<MongoCacheUpdateResult> {
        return Promise<MongoCacheUpdateResult>((resolve, reject) => {

            // Get all promises. Then for each of them, ensure it's stored in Mongo.
            this.proposalService.getAll()
                .then((proposals) => {
                    console.log(`ensureMongoCache: got ${proposals.length} proposals from blockchain. Ensuring cache for each of them.`);

                    // Delete all proposals from the cache which are not currently in the contract
                    // (e.g. after clearing the blockchain during development)
                    var proposalsPromises = new Array<Promise<IProposal>>();
                    for (let i = 0; i < proposals.length; i++) {
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

    private addProposalBackingTotals(proposal: IProposal): Promise<IProposal> {

        var t = this;
        return Q.Promise<IProposal>((resolve, reject) => {
            try {
                return t.proposalService.getBackers(proposal.contractAddress)
                    .then((proposalBackings) => {
                        console.log(`addProposalBackingTotals: got ${proposalBackings.length} proposalbackings for proposal ${proposal.contractAddress}.`);
                        console.log('proposal.contractAddress: ');
                        console.log(proposal.contractAddress);
                        let sum = 0;
                        _.each(proposalBackings, (backing) => { sum += backing.amount; });
                        proposal.totalAmount = sum;
                        proposal.nrOfBackings = proposalBackings.length;
                        proposal.nrOfBackers = _.unique(_.pluck(proposalBackings, 'userId')).length;
                        resolve(proposal);
                    }).catch((err) => {
                        reject(err);
                    });
            } catch (err) {
                reject(err);
            }
        });
    };


    /**
     * Ensure that this proposal is present and up to date in the Mongo cache.
     * @param p
     */
    ensureCacheProposal(p: IProposal): Promise<IProposal> {
        var t = this;
        return Promise<IProposal>((resolve, reject) => {
            // Add backing stats
            t.addProposalBackingTotals(p)
                .then(p => {
                    // Try to find record from MongoDB
                    return Proposal.findOne().where("contractAddress").equals(p.contractAddress).exec();
                })
                .then((currentProposal) => {
                    // TODO: refactor this to a separate method too
                    var saveDefer = Q.defer<IProposal>();

                    if (!currentProposal) {
                        // Create it
                        Proposal.create(p, (err, res) => {
                            if (err) saveDefer.reject(err);
                            else saveDefer.resolve(res);
                        });
                    }
                    else {
                        // Update it
                        currentProposal.owner = p.owner;

                        currentProposal.productName = p.productName;
                        currentProposal.productDescription = p.productDescription;
                        currentProposal.mainCategory = p.mainCategory;
                        currentProposal.subCategory = p.subCategory;

                        currentProposal.productSku = p.productSku;
                        currentProposal.productUnitSize = p.productUnitSize;

                        currentProposal.endDate = p.endDate;
                        currentProposal.ultimateDeliveryDate = p.ultimateDeliveryDate;

                        currentProposal.maxPrice = p.maxPrice;

                        currentProposal.nrOfBackings = p.nrOfBackings;
                        currentProposal.nrOfBackers = p.nrOfBackers;
                        currentProposal.totalAmount = p.totalAmount;

                        currentProposal.save((err, res) => {
                            if (err) saveDefer.reject(err);
                            else saveDefer.resolve(currentProposal);
                        });

                        // TODO: process backers, offers, ... - best as related objects in Mongo
                    }

                    saveDefer.promise.then(savedProposal => {
                        console.log("Proposal " + p.contractAddress + " added or updated in cache.");
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

export class MongoCacheUpdateResult {
    updatedObjects: number;
    createdObjects: number;
}