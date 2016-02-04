import request = require('request');
import domain = require('domain');

import userModel = require('../models/userModel');
import proposalModel = require('../models/proposalModel');
import proposalBackingModel = require('../models/proposalBackingModel');
import offerModel = require('../offers/offerModel');
import contractInterfaces = require('../contracts/contractInterfaces');

import serviceFactory = require('../services/serviceFactory');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import tools = require('../lib/tools');
import configurationService = require('./configurationService');
import contractService = require('./contractService');

import cachedProposalService = require('../services/cachedProposalService');

import { Promise } from 'q';
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
    contractService: contractService.ContractService;
    registryContract: contractInterfaces.IProposalRegistryContract;

    constructor() {
    }

    /**
     * Initialize the service by loading the registry contract.
     */
    initialize(): Q.Promise<void> {
        var defer = Q.defer<void>();
        var t = this;

        serviceFactory.getContractService()
            .then(cs => {
                t.contractService = cs;
                t.registryContract = cs.registryContract;

                // Even though the defer is of type void, TypeScript wants a parameter passed
                // to compile.
                defer.resolve(null);
            }, err => defer.reject(err));

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

            t.contractService.getProposalContractAt(proposalAddress)
                .then(proposal=> {
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
                    // The calls would then be: addPropertyGetter<string>(getProperties, proposal, p, "productName")
                    // Drawback: properties of IProposal wouldn't be typesafe any more.
                    getProperties.push(Q.denodeify<string>(proposal.productName)().then(function (name) { p.productName = name; }));
                    getProperties.push(Q.denodeify<string>(proposal.productDescription)().then(function (description) { p.productDescription = description; }));
                    getProperties.push(Q.denodeify<string>(proposal.productSku)().then(function (sku) { p.productSku = sku; }));
                    getProperties.push(Q.denodeify<string>(proposal.productUnitSize)().then(function (unitSize) { p.productUnitSize = unitSize; }));
                    getProperties.push(Q.denodeify<string>(proposal.mainCategory)().then(function (mainCat) { p.mainCategory = mainCat; }));
                    getProperties.push(Q.denodeify<string>(proposal.subCategory)().then(function (subCat) { p.subCategory = subCat; }));
                    getProperties.push(Q.denodeify<contractInterfaces.IBigNumber>(proposal.maxPrice)().then(function (mp) { p.maxPrice = mp.toNumber() / 100; }));
                    getProperties.push(Q.denodeify<string>(proposal.endDate)().then(function (ed) { p.endDate = new Date(ed); }));
                    getProperties.push(Q.denodeify<string>(proposal.ultimateDeliveryDate)().then(function (udd) { p.ultimateDeliveryDate = new Date(udd); }));

                    Q.all(getProperties)
                        .then(function () {
                            d.resolve(p);
                        }, err => {
                            d.reject(err);
                        });
                }, err=> d.reject(err));
        };
    }

    /**
     * Get all proposals.
     * TODO: include filters by category, amount etc. Should be done at
     * contract side to prevent many JSON RPC calls at scale.
     */
    getAll() {
        return Q.Promise<Array<proposalModel.IProposal>>(
            (resolve, reject) => {
                var t = this;

                // Get the details of each proposal in separate promises.
                // Each of those requires one or more JSON RPC calls to the blockchain node.
                var proposalDetailsPromises = new Array<Q.Promise<proposalModel.IProposal>>();

                var numProposals = t.registryContract.proposalIndex().toNumber();

                for (let i = 1; i <= numProposals; i++) {
                    const defer = Q.defer<proposalModel.IProposal>();
                    proposalDetailsPromises.push(defer.promise);

                    // Call the getter asynchronously by passing a callback.
                    t.registryContract.proposals(i, t.buildGetProposalCallback(defer));
                }

                Q.all(proposalDetailsPromises)
                    .then((allProposals) => {
                        resolve(allProposals);
                    })
                    .catch((allProposalsErr) => {
                        reject(allProposalsErr);
                    });
            });
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
     * Get the proposalBackings for the given proposal.
     */
    getBackers(proposalId): Q.Promise<Array<proposalBackingModel.IProposalBacking>> {
        var deferred = Q.defer<Array<proposalBackingModel.IProposalBacking>>();

        var t = this;

        // Get the proposal contract
        var proposalContract;
        var getBackerDetailsPromises = new Array<Q.Promise<proposalBackingModel.IProposalBacking>>();

        t.contractService.getProposalContractAt(proposalId)
            .then(proposalContract => {
                var numBackers = proposalContract.backerIndex().toNumber();

                for (var i = 1; i <= numBackers; i++) {
                    var defer = Q.defer<proposalBackingModel.IProposalBacking>();

                    getBackerDetailsPromises.push(defer.promise);

                    // The getter for the backers can cause exceptions deep down in the belly
                    // of web3.js. See https://github.com/OutlierVentures/BuyCo/issues/37
                    // We wrap it in a domain to prevent this from crashing the whole app.

                    var d = domain.create()
                    d.on('error', function (err) {
                        // Handle the error safely, reject the promise with the error message.
                        if (err.message) err = err.message;
                        defer.reject(err);
                    })

                    d.run(t.createGetBackerFunction(defer, proposalContract, i))
                }

                Q.all(getBackerDetailsPromises)
                    .then(function (allBackers) {
                        deferred.resolve(allBackers);
                    }, function (allBackersErr) {
                        deferred.reject(allBackersErr);
                    });
            }, err=> deferred.reject(err));


        return deferred.promise;
    }

    createGetBackerFunction(defer: Q.Deferred<proposalBackingModel.IProposalBacking>, proposalContract, index: number) {
        var t = this;
        return function () {
            proposalContract.backers(index, function (backerErr, backer) {
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

        var proposalIndexBefore = t.registryContract.proposalIndex().toNumber();

        this.registryContract.addProposal(p.productName,
            p.mainCategory, p.subCategory,
            p.maxPrice,
            p.endDate.toString(), p.ultimateDeliveryDate.toString(), { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function getProposalResult(tx) {
                // At this point we have no unique reference to the proposal we
                // just added. As a workaround, we take the newest proposal.
                // That is NOT a reliable way and has to be fixed. It has happened before
                // that the proposal was not added and this was left unnoticed (that's
                // why the simple check on increasing proposalIndex).
                
                // The solution lies in the transaction hash. At this point we can get that 
                // from the tx.
                // TODO: check how to get the transactionHash for existing contracts (AFAIK
                // it's only set on results of web3.eth.contract.new(...)).
                // TODO: get the proposal by tx hash
                var proposalIndex = t.registryContract.proposalIndex().toNumber();

                if (proposalIndex != proposalIndexBefore + 1) {
                    defer.reject("Could not add proposal.");
                    return;
                }

                var newProposalAddress = t.registryContract.proposals(proposalIndex);

                p.contractAddress = newProposalAddress;

                return t.contractService.getProposalContractAt(newProposalAddress);
            })
            .then(proposalContract => {               
                // Fill additional properties. This is a separate method because of 
                // Solidity limitations ("stack too deep").
                return proposalContract.setDetails(p.productDescription, p.productSku, p.productUnitSize);
            })
            .then(web3plus.promiseCommital)
            .then(function getProposalResult(tx) {

                // Normalize amount for display and caching
                p.maxPrice = p.maxPrice / 100;

                // Update cache for this proposal only
                var cps = new cachedProposalService.CachedProposalService();
                cps.initialize(this)
                    .then(res => {
                        return cps.ensureCacheProposal(p);
                    })
                    .then(res => {
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
     * @param p the proposal.
     * @return a representation of the backing
     */
    back(p: proposalModel.IProposal, amount: number, backingUser: userModel.IUser, fromCard: string): Q.Promise<proposalBackingModel.IProposalBacking> {
        var t = this;

        var defer = Q.defer<proposalBackingModel.IProposalBacking>();
        return t.contractService.getProposalContractAt(p.contractAddress)
            .then(proposalContract => {

                var backPromise = proposalContract.back(amount, { gas: 2500000 });

                return backPromise;
            })
            .then(txId => {
                return this.processBacking(txId, p, amount, backingUser, fromCard);
            });
    }

    /**
     * Process backing an existing proposal in the blockchain. The ID of the transaction to proposalContract.back()
     * should be passed.
     * 
     * @param transactionId transaction ID of the call to proposalContract.back()
     * @param p the new proposal.
     * @return The IProposal with the property "id" set to the contract address.
     */
    processBacking(transactionId: string, p: proposalModel.IProposal, amount: number, backingUser: userModel.IUser, fromCard: string): Q.Promise<proposalBackingModel.IProposalBacking> {
        var defer = Q.defer<proposalBackingModel.IProposalBacking>();


        var proposalContract: contractInterfaces.IProposalContract;

        var t = this;

        t.contractService.getProposalContractAt(p.contractAddress)
            .then(pr=> {
                proposalContract = pr;
                return web3plus.promiseCommital(transactionId);
            })
            .then(function (tx) {
                // Get the from address from the transaction. If it is our global account or the account
                // of an individual user, both will be set here.
                var backingAddress = tx.from;

                // Check whether the backer was actually added. Otherwise reject.
                // WARNING: this way of getting the backing by index is not foolproof (like other
                // places where this is done).
                var backerFromContract = proposalContract.backers(proposalContract.backerIndex());

                if (!(backerFromContract[0] == backingAddress && backerFromContract[1].toNumber() == amount)) {
                    defer.reject("Backing could not be added to contract.");
                    return;
                }

                // Save link to the backing in our database. Just save the address. In the contract itself
                // we don't store user data (yet) for privacy reasons.
                // TODO: add amount, other properties
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

        var proposalContract: contractInterfaces.IProposalContract;

        // Load the proposal contract
        t.contractService.getProposalContractAt(proposalId)
            .then(pc=> {
                proposalContract = pc;
                return serviceFactory.createOfferContractService();
            }, err => { defer.reject(err); return null; })
            .then(os => {
                return os.getAll(proposalContract);
            },
            createServiceError => { defer.reject(createServiceError); return null; })
            .then(offers => {
                defer.resolve(offers);
            },
            offersErr => { defer.reject(offersErr); return null; });
        ;

        return defer.promise;
    }
}
