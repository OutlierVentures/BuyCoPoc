import request = require('request');
import userModel = require('../models/userModel');
// import proposalModel = require('../models/proposalModel');

import { IProposal, Proposal, IProposalDocument, IProposalFilter } from '../models/proposalModel';
import {IMainCategory, ISubCategory} from '../models/categoryModel';
import offerModel = require('../offers/offerModel');

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
        // Queries with a set maxPrice are filtered with all items lesser than ('$lt' in Mongoose) instead of the default (exactly) equal.
        if (proposalFilter) {
            if (proposalFilter.maxPrice) {
                proposalFilter.maxPrice = { $lt: proposalFilter.maxPrice };
            }
        }
        return Proposal.find(proposalFilter).exec();
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
                    // TODO                    

                    var proposalsPromises = new Array<Promise<IProposal>>();

                    for (let i = 0; i < proposals.length; i++) {
                        var p = proposals[i];
                        // Get backings 
                        //this.proposalService.getBackers(p.contractAddress)
                        //.then((proposalBackings) => {
                        //    let sum = 0;
                        //    _.each(proposalBackings, (backing) => { sum += backing.amount; });
                        //    p.totalAmount = sum;
                        //    p.nrOfBackings = proposalBackings.length;
                        //    p.nrOfBackers = _.unique(_.pluck(proposalBackings, 'userId')).length;
                        //});
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
    ensureCacheProposal(p: IProposal): Promise<IProposal> {
        return Promise<IProposal>((resolve, reject) => {
            Proposal.findOne().where("contractAddress").equals(p.contractAddress).exec()
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
                        currentProposal.productName = p.productName;
                        currentProposal.productDescription = p.productDescription;
                        currentProposal.mainCategory = p.mainCategory;
                        currentProposal.subCategory = p.subCategory;

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