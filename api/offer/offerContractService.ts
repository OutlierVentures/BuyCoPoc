import request = require('request');
import userModel = require('../../models/userModel');
import proposalModel = require('../../models/proposalModel');
import proposalBackingModel = require('../../models/proposalBackingModel');
import offerModel = require('../../models/offerModel');
import buyerModel = require('../../models/buyerModel');
import serviceFactory = require('../../services/serviceFactory');
import proposalService = require('../../services/proposalService');
import web3plus = require('../../node_modules/web3plus/lib/web3plus');
import tools = require('../../lib/tools');
import configurationService = require('../../services/configurationService');
import contractService = require('../../services/contractService');

import contractInterfaces = require('../../contracts/contractInterfaces');

import Q = require('q');
import { Promise } from 'q';

import _ = require('underscore');

/**
 * Service for dealing with offers to buying proposals on the blockchain. All functions
 * return promises.
 */
export class OfferContractService {
    config = new configurationService.ConfigurationService().getConfiguration();
    contractService: contractService.ContractService;

    constructor() {
    }

    /**
     * Initialize the service.
     */
    initialize(): Q.Promise<void> {
        var defer = Q.defer<void>();
        var t = this;

        serviceFactory.getContractService()
            .then(cs => {
                t.contractService = cs;
                defer.resolve(null);
            }, err => {
                defer.reject(err);
            });


        return defer.promise;
    }

    /**
     * Build a function to return an IOffer from a proposal contract address.
     * Gets the details of the proposal asynchronously.
     * To be used as a callback function from web3.js functions that return a 
     * proposal address.
     * @param d A Deferred that is resolved with the new IProposal when it's complete.
     */
    private buildGetOfferCallback(d: Q.Deferred<offerModel.IOffer>) {
        var t = this;
        return function (offerErr, offerAddress) {
            if (offerErr) {
                d.reject(offerErr);
                return;
            }

            t.contractService.getOfferContractAt(offerAddress)
                .then(offer => {
                    return t.offerContractToObject(offer);
                })
                .then(o => {
                    d.resolve(o);
                })
                .catch(err => {
                    d.reject(err);
                });
        };
    }

    offerContractToObject(offer: contractInterfaces.IOfferContract): Promise<offerModel.IOffer> {
        return Promise<offerModel.IOffer>((resolve, reject) => {
            var getProperties = new Array<Q.Promise<void>>();

            var o = <offerModel.IOffer>{};

            // We get each of the properties of the offer async, all with a separate promise.
            // This leads to unreadable code, but it's the only known way of delivering
            // reasonable performance. See testProposalList.ts for more info.

            o.id = offer.address;

            getProperties.push(Q.denodeify<string>(offer.owner)().then(function (addr) { o.owner = addr; }));
            getProperties.push(Q.denodeify<contractInterfaces.IBigNumber>(offer.price)().then(function (p) { o.price = p.toNumber() / 100; }));
            getProperties.push(Q.denodeify<contractInterfaces.IBigNumber>(offer.minimumAmount)().then(function (ma) { o.minimumAmount = ma.toNumber(); }));
            getProperties.push(Q.denodeify<string>(offer.cardId)().then(function (cid) { o.toCard = cid; }));

            Q.all(getProperties)
                .then(function () {
                    resolve(o);
                })
                .catch(err => {
                    reject(err);
                })
        });
    }

    /**
     * Get all offers for a proposal.
     * @param proposalContract the proposal contract object. We could accept an IProposal here,
     * but that would require another expensive request to load the contract which is probably already available.
     */
    getAll(proposalContract): Q.Promise<Array<offerModel.IOffer>> {
        var deferred = Q.defer<Array<offerModel.IOffer>>();

        var t = this;

        // Get the details of each proposal in separate promises. Each of those requires
        // one or more JSON RPC calls to the blockchain node.
        var getOfferDetailsPromises = new Array<Q.Promise<offerModel.IOffer>>();


        var numOffers = proposalContract.offerIndex().toNumber();

        for (var i = 1; i <= numOffers; i++) {
            var defer = Q.defer<offerModel.IOffer>();

            getOfferDetailsPromises.push(defer.promise);

            // Call the getter asynchronously by passing a callback.
            proposalContract.offers(i, t.buildGetOfferCallback(defer));
        }

        Q.all(getOfferDetailsPromises)
            .then(function (allOffers) {
                deferred.resolve(allOffers);
            })
            .catch(function (allOffersErr) {
                deferred.reject(allOffersErr);
            });

        return deferred.promise;
    }

    /**
    * Get a single offer by its contract address.
    */
    getOne(offerId: string, user: userModel.IUser): Q.Promise<offerModel.IOffer> {
        var deferred = Q.defer<offerModel.IOffer>();

        var t = this;

        var defer = Q.defer<offerModel.IOffer>();

        // Reuse the proposal builder.
        var getOffer = t.buildGetOfferCallback(defer);
        getOffer(null, offerId);

        defer.promise
            .then(function (proposal) {
                deferred.resolve(proposal);
            })
            .catch(function (proposalErr) {
                deferred.reject(proposalErr);
            });

        return deferred.promise;
    }

    /**
   * Get a single offer by its contract address.
   */
    getBuyers(proposalId: string, offerId: string, user: userModel.IUser): Promise<proposalBackingModel.IProposalBacking[]> {

        var t = this;
        var offer: offerModel.IOffer;
        var proposalContract: contractInterfaces.IProposalContract;
        var proposalService: proposalService.ProposalService;

        var backersWithInfo: proposalBackingModel.IProposalBacking[];

        return Promise<proposalBackingModel.IProposalBacking[]>((resolve, reject) => {
            this.getOne(offerId, user)
                .then(o => {
                    offer = o;

                    // Is the user the owner of the offer?
                    if (!_(user.blockchainAccounts.accounts).any(acc => acc.address == offer.owner))
                        throw ("User is not the owner of this offer and doesn't have permission to see the buyer data.");

                    return t.contractService.getProposalContractAt(proposalId);
                })
                .then(pc => {
                    proposalContract = pc;

                    if (proposalContract.acceptedOffer() != offerId)
                        throw ("This offer has not been accepted. User doesn't have permission to see the buyer data.");

                    // This is the accepted offer and the user is the owner.

                    return serviceFactory.createProposalService();
                })
                .then(ps => {
                    proposalService = ps;

                    return ps.getBackers(proposalId);
                })
                .then(backers => {
                    backersWithInfo = backers;

                    // Get the addresses of all backers
                    var backerAddresses = _(backersWithInfo).map(b => b.address);

                    // Load the buyer data
                    return userModel.User
                        .find({ "blockchainAccounts.accounts.address": { "$in": backerAddresses } })
                        .populate({ path: "buyerId" }).exec();
                })
                .then(usersWithBuyerInfo => {
                    // Match the buyer info with the backing.

                    // There must be a far more efficient and concise way to do this with mongo and/or underscore.
                    for (var k in backersWithInfo) {
                        var backer = backersWithInfo[k];
                        var theBuyerUser = _(usersWithBuyerInfo).find(us => {
                            if (!us.blockchainAccounts) return false;
                            if (!us.blockchainAccounts.accounts) return false;
                            return _(us.blockchainAccounts.accounts).any(ba => ba.address == backer.address);
                        });


                        var buyerInfo = <buyerModel.IBuyer><any>theBuyerUser.buyerId;
                        if (buyerInfo) backer.buyerInfo = buyerInfo;
                    }

                    resolve(backersWithInfo);
                })
                .catch(function (proposalErr) {
                    reject(proposalErr);
                });

        });
    }


    /**
     * Create a new offer for a proposal in the blockchain.
     * @param proposalId proposal to add the offer to
     * @param o the new offer
     * @return The IProposal with the property "id" set to the contract address.
     */
    create(proposalId: string, o: offerModel.IOffer): Q.Promise<offerModel.IOffer> {
        var t = this;

        o.owner = web3plus.web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;

        return t.contractService.getProposalContractAt(proposalId)
            .then(pc => {
                proposalContract = pc;

                var offerPromise = proposalContract.offer(o.price * 100, o.minimumAmount, tools.guidRemoveDashes(o.toCard), { gas: 2500000 });

                return offerPromise;
            })
            .then(txId => {
                return this.processCreate(txId, proposalId, o);
            });
    }

    /**
     * Process the creation a new offer for a proposal in the blockchain.
     * @param proposalId proposal to add the offer to
     * @param o the new offer
     * @return The IProposal with the property "id" set to the contract address.
     */
    processCreate(transactionId: string, proposalId: string, o: offerModel.IOffer): Q.Promise<offerModel.IOffer> {
        var t = this;

        var defer = Q.defer<offerModel.IOffer>();

        var proposalContract: contractInterfaces.IProposalContract;

        t.contractService.getProposalContractAt(proposalId)
            .then(pr => {
                proposalContract = pr;
                return web3plus.promiseCommital(transactionId);
            })
            .then(function createOfferResult(tx) {
                var offerIndex = proposalContract.offerIndex().toNumber();
                var newOfferAddress = proposalContract.offers(offerIndex);

                t.contractService.getOfferContractAt(newOfferAddress)
                    .then(offerContract => {
                        var newOfferOwner = offerContract.owner();

                        if (!(newOfferOwner == o.owner
                            && offerContract.minimumAmount().toNumber() == o.minimumAmount
                            && offerContract.price().toNumber() == o.price * 100)) {
                            defer.reject("Offer could not be added to contract.");
                            return;
                        }

                        o.id = newOfferAddress;

                        // Ensure that proposal cache is updated
                        return serviceFactory.createCachedProposalService();
                    })
                    .then(cps => {
                        return cps.ensureCacheProposalContract(proposalContract);
                    })
                    .then(p => {
                        defer.resolve(o);
                    })
                    .catch(err => {
                        defer.reject(err);
                    });

            }).catch(err => {
                defer.reject(err);
            });

        return defer.promise;
    }
}