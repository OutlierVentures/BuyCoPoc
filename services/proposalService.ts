import request = require('request');
import userModel = require('../models/userModel');
import proposalModel = require('../models/proposalModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import configurationService = require('./configurationService');
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
                        
                p.id = proposalAddress;
                getProperties.push(Q.denodeify<string>(proposal.productName)().then(function (name) { p.productName = name; }));
                getProperties.push(Q.denodeify<string>(proposal.productDescription)().then(function (description) { p.productDescription = description; }));
                getProperties.push(Q.denodeify<any>(proposal.maxPrice)().then(function (mp) { p.maxPrice = mp.toNumber(); }));
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
     * Create a new proposal in the blockchain.
     * @param p the new proposal.
     * @return The IProposal with the property "id" set to the contract address.
     */
    create(p: proposalModel.IProposal): Q.Promise<proposalModel.IProposal> {
        var t = this;

        var defer = Q.defer<proposalModel.IProposal>();

        // Workaround for empty dates in current implementation
        var anyP = <any>p;
        if (!p.endDate)
            anyP.endDate = "";
        if (!p.ultimateDeliveryDate)
            anyP.ultimateDeliveryDate = "";

        this.registryContract.addProposal(p.productName,
            p.productDescription, p.maxPrice,
            p.endDate, p.ultimateDeliveryDate, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function getProposalResult(tx) {
                // At this point we have no unique reference to the proposal we
                // just added. As a workaround, we take the newest proposal.
                // That is NOT a reliable way and has to be fixed.
                // TODO: get the proposal by a unique identifier.
                var proposalIndex = t.registryContract.proposalIndex().toNumber();
                var newProposalAddress = t.registryContract.proposals(proposalIndex);

                p.id = newProposalAddress;

                defer.resolve(p);
            }, function getProposalErr(err) {
                defer.reject(err);
            });

        return defer.promise;
    }

}