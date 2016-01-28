import request = require('request');
import userModel = require('../models/userModel');
import proposalModel = require('../models/proposalModel');
import offerModel = require('../offers/offerModel');

import serviceFactory = require('../services/serviceFactory');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import tools = require('../lib/tools');
import configurationService = require('./configurationService');

import cachedProposalService = require('../services/cachedProposalService');

import Q = require('q');

interface IBigNumber {
    toNumber(): number
}

/**
 * Service for dealing with buying proposals on the blockchain. All functions
 * return promises.
 */
export class ProposalService {
    config = new configurationService.ConfigurationService().getConfiguration();
    registryContract;
    proposalContractDefinition;

    constructor() {
    }

    /**
     * Initialize the service by loading the registry contract.
     */
    initialize(): Q.Promise<void> {
        var defer = Q.defer<void>();
        var t = this;
        web3plus.loadContractFromFile('ProposalRegistry.sol',
            'ProposalRegistry', this.config.ethereum.contracts.proposalRegistry, true, function (loadContractError, con) {
                if (loadContractError) {
                    defer.reject(loadContractError);
                    return;
                }
                t.registryContract = con;
                t.proposalContractDefinition = t.registryContract.allContractTypes.Proposal.contractDefinition;
                
                // Even though the defer is of type void, TypeScript wants a parameter passed
                // to compile.
                defer.resolve(null);
            });

        return defer.promise;
    }

    /**
     * Build a function to return an IProposal from a proposal contract address.
     * Gets the details of the proposal asynchronously.
     * To be used as a callback function from web3.js functions that return a 
     * proposal address.
     * @param d A Deferred that is resolved with the new IProposal when it's complete.
     */
    buildGetProposalCallback(d: Q.Deferred<proposalModel.IProposal>) {
        var t = this;
        return function (proposalErr, proposalAddress) {
            if (proposalErr) {
                d.reject(proposalErr);
                return;
            }

            t.proposalContractDefinition.at(proposalAddress, function (propContrErr, proposal) {
                console.log(Date() + " Got contract object at " + proposalAddress);

                var getProperties = new Array<Q.Promise<void>>();

                var p = <proposalModel.IProposal>{};

                // We get each of the properties of the proposal async, all with a separate promise.
                // This leads to unreadable code, but it's the only known way of delivering
                // reasonable performance. See testProposalList.ts for more info.
                        
                p.contractAddress = proposalAddress;

                // These could be written more compactly as both the property of proposal and of
                // p are named identical.
                // addPropertyGetter<T>(propertyPromises Array<Q.Promise<void>>, contract, targetobject, propertyName) {...}
                // The calls would then be: addPropertyGetter(getProperties, proposal, p, "productName")
                // Drawback: properties of IProposal wouldn't be typesafe any more.
                getProperties.push(Q.denodeify<string>(proposal.productName)().then(function (name) { p.productName = name; }));
                getProperties.push(Q.denodeify<string>(proposal.productDescription)().then(function (description) { p.productDescription = description; }));
                //getProperties.push(Q.denodeify<string>(proposal.productSku)().then(function (sku) { p.productSku = sku; }));
                getProperties.push(Q.denodeify<string>(proposal.mainCategory)().then(function (mainCat) { p.mainCategory = mainCat; }));
                getProperties.push(Q.denodeify<string>(proposal.subCategory)().then(function (subCat) { p.subCategory = subCat; }));
                getProperties.push(Q.denodeify<any>(proposal.maxPrice)().then(function (mp) { p.maxPrice = mp.toNumber() / 100; }));
                getProperties.push(Q.denodeify<string>(proposal.endDate)().then(function (ed) { p.endDate = new Date(ed); }));
                getProperties.push(Q.denodeify<string>(proposal.ultimateDeliveryDate)().then(function (udd) { p.ultimateDeliveryDate = new Date(udd); }));

                Q.all(getProperties)
                    .then(function () {
                        d.resolve(p);
                    });
            });
        };
    }

    /**
     * Get all proposals.
     * TODO: include filters by category, amount etc. Should be done at
     * contract side to prevent many JSON RPC calls at scale.
     */
    getAll(): Q.Promise<Array<proposalModel.IProposal>> {
        var deferred = Q.defer<Array<proposalModel.IProposal>>();

        var t = this;

        // Get the details of each proposal in separate promises. Each of those requires
        // one or more JSON RPC calls to the blockchain node.
        var getProposalDetailsPromises = new Array<Q.Promise<proposalModel.IProposal>>();


        var numProposals = t.registryContract.proposalIndex().toNumber();

        for (var i = 1; i <= numProposals; i++) {
            var defer = Q.defer<proposalModel.IProposal>();

            getProposalDetailsPromises.push(defer.promise);

            // Call the getter asynchronously by passing a callback.
            t.registryContract.proposals(i, t.buildGetProposalCallback(defer));
        }

        Q.all(getProposalDetailsPromises)
            .then(function (allProposals) {
                deferred.resolve(allProposals);
            })
            .catch(function (allProposalsErr) {
                deferred.reject(allProposalsErr);
            });

        return deferred.promise;
    }

    /**
    * Get a single proposal by its contract address.
    */
    getOne(proposalId: string): Q.Promise<proposalModel.IProposal> {
        var deferred = Q.defer<proposalModel.IProposal>();

        var t = this;

        // Get the details of each proposal in separate promises. Each of those requires
        // one or more JSON RPC calls to the blockchain node.
        var getProposalDetailsPromises = new Array<Q.Promise<proposalModel.IProposal>>();

        var defer = Q.defer<proposalModel.IProposal>();

        // Reuse the proposal builder.
        var getProposal = t.buildGetProposalCallback(defer);
        getProposal(null, proposalId);

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
     * Get a single proposal by its contract address.
     */
    getBackers(proposalId): Q.Promise<Array<proposalModel.IProposalBacking>> {
        var deferred = Q.defer<Array<proposalModel.IProposalBacking>>();

        var t = this;

        // Get the proposal contract
        var proposalContract;
        var getBackerDetailsPromises = new Array<Q.Promise<proposalModel.IProposalBacking>>();

        proposalContract = t.proposalContractDefinition.at(proposalId);

        var numBackers = proposalContract.backerIndex().toNumber();

        for (var i = 1; i <= numBackers; i++) {
            var defer = Q.defer<proposalModel.IProposalBacking>();

            getBackerDetailsPromises.push(defer.promise);
            proposalContract.backers(i, function (backerErr, backer) {
                if (backerErr) {
                    defer.reject(backerErr);
                    return;
                }
                var backerAddress = backer[0];
                var amount = backer[1].toNumber();

                var startTx: string;
                if (backer[2] && backer[2].length == 32)
                    startTx = tools.guidAddDashes(backer[2])

                var startPaymentAmount: number;
                if (backer[3])
                    startPaymentAmount = backer[3].toNumber();

                var endTx: string;
                if (backer[4] && backer[4].length == 32)
                    endTx = tools.guidAddDashes(backer[4])

                var endPaymentAmount: number;
                if (backer[5])
                    endPaymentAmount = backer[5].toNumber();

                defer.resolve({
                    address: backerAddress,
                    amount: amount,
                    userId: "unknown", // TODO: get this from mongoDB by address
                    startPaymentTransactionId: startTx,
                    startPaymentAmount: startPaymentAmount,
                    endPaymentTransactionId: endTx,
                    endPaymentAmount: endPaymentAmount,
                });
            });
        }

        Q.all(getBackerDetailsPromises)
            .then(function (allBackers) {
                deferred.resolve(allBackers);
            }, function (allBackersErr) {
                deferred.reject(allBackersErr);
            });

        return deferred.promise;
    }

    /**
     * Create a new proposal in the blockchain.
     * @param p the new proposal.
     * @return The IProposal with the property "id" set to the contract address.
     */
    create(p: proposalModel.IProposal): Q.Promise<proposalModel.IProposal> {
        var t = this;

        var defer = Q.defer<proposalModel.IProposal>();

        // Normalize amount for contract
        p.maxPrice = p.maxPrice * 100;

        // Workaround for empty dates in current implementation
        var anyP = <any>p;
        if (!p.endDate)
            anyP.endDate = "";
        if (!p.ultimateDeliveryDate)
            anyP.ultimateDeliveryDate = "";

        this.registryContract.addProposal(p.productName,
            p.productDescription, p.mainCategory, p.subCategory,
            p.maxPrice,
            p.endDate, p.ultimateDeliveryDate, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function getProposalResult(tx) {
                // At this point we have no unique reference to the proposal we
                // just added. As a workaround, we take the newest proposal.
                // That is NOT a reliable way and has to be fixed.
                // TODO: get the proposal by a unique identifier.
                var proposalIndex = t.registryContract.proposalIndex().toNumber();
                var newProposalAddress = t.registryContract.proposals(proposalIndex);

                p.contractAddress = newProposalAddress;

                // Update cache for this proposal only
                var cps = new cachedProposalService.CachedProposalService();
                cps.initialize(this)
                    .then(res => {
                        return cps.ensureCacheProposal(p);
                    })
                    .then(res => {
                        // Normalize amount for display, again
                        p.maxPrice = p.maxPrice / 100;
                        defer.resolve(p);
                    }, err => {
                        defer.reject("Error while updating proposal cache: " + err);
                    });

            }, function getProposalErr(err) {
                defer.reject(err);
            });

        return defer.promise;
    }

    /**
     * Back an existing proposal in the blockchain.
     * @param p the new proposal.
     * @return The IProposal with the property "id" set to the contract address.
     */
    back(p: proposalModel.IProposal, amount: number, backingUser: userModel.IUser, fromCard: string): Q.Promise<proposalModel.IProposalBacking> {
        var t = this;

        var defer = Q.defer<proposalModel.IProposalBacking>();

        var proposalContract = this.proposalContractDefinition.at(p.contractAddress);

        var backPromise = proposalContract.back(amount, { gas: 2500000 });

        // TODO: use different eth address for buyer once we support that.
        var backingAddress = web3plus.web3.eth.coinbase;

        backPromise.then(web3plus.promiseCommital)
            .then(function (res) {
                // Save link to the backing in our database. Just save the address. In the contract itself
                // we don't store user data (yet) for privacy reasons.
                backingUser.backings.push({
                    proposalAddress: p.contractAddress
                });
                backingUser.save(
                    function (userErr, userRes) {
                        if (userErr) {
                            defer.reject(userErr);
                            return;
                        }

                        // Do payment and store it
                        var upholdService = serviceFactory.createUpholdService(backingUser.accessToken);

                        // TODO: move percentage to contract payment terms
                        var paymentPercentage = 0.5;

                        // Amounts are specified in cents, hence / 100.
                        var paymentAmount = Math.round(amount * proposalContract.maxPrice().toNumber() * paymentPercentage) / 100;
                        
                        // Create transaction
                        upholdService.createTransaction(fromCard, paymentAmount, "GBP", t.config.uphold.vaultAccount.cardBitcoinAddress,
                            function (txErr, paymentTransaction) {
                                if (txErr) {
                                    defer.reject(txErr);
                                    return;
                                }

                                upholdService.commitTransaction(paymentTransaction,
                                    function (commitErr, committedTransaction) {
                                        if (commitErr) {
                                            defer.reject(txErr);
                                            return;
                                        }

                                        // Store transaction with backing after it's finished
                                        // paymentType 1 = initial payment
                                        proposalContract.setPaid(backingAddress, 1, tools.guidRemoveDashes(committedTransaction.id),
                                            paymentAmount * 100)
                                            .then(web3plus.promiseCommital)
                                            .then(function (setPaidResult) {
                                                // Test correct storage
                                                var backing = proposalContract.backers(proposalContract.backerIndexByAddress(backingAddress));
                                                if (!backing[2]) {
                                                    defer.reject("Error saving transaction ID");
                                                    return;
                                                }

                                                defer.resolve({
                                                    address: backingAddress,
                                                    amount: amount,
                                                    userId: backingUser.id,
                                                    startPaymentTransactionId: committedTransaction.id,
                                                    startPaymentAmount: paymentAmount,
                                                    endPaymentTransactionId: undefined,
                                                    endPaymentAmount: undefined,
                                                });
                                            },
                                            function (setPaidError) {
                                                defer.reject(setPaidError);
                                            });
                                    });
                            });
                    });

            }, function (err) {
                defer.reject(err);
            });

        return defer.promise;
    }

    /**
     * Get offers for a proposal.
     * @param proposalId
     */
    getOffers(proposalId: string): Q.Promise<Array<offerModel.IOffer>> {
        var defer = Q.defer<Array<offerModel.IOffer>>();
        var t = this;

        // Load the proposal contract
        t.proposalContractDefinition.at(proposalId, (proposalContractErr, proposalContract) => {
            if (proposalContractErr) {
                defer.reject(proposalContractErr);
                return;
            }

            serviceFactory.createOfferContractService()
                .then((os) => {
                    return os.getAll(proposalContract);
                },
                (createServiceError) => {
                    defer.reject(createServiceError);
                    return null;
                })
                .then((offers) => {
                    defer.resolve(offers);
                },
                (offersErr) => {
                    defer.reject(offersErr);
                    return null;
                });

        });

        return defer.promise;
    }
}
