import request = require('request');
import userModel = require('../models/userModel');
import proposalModel = require('../models/proposalModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import configurationService = require('./configurationService');
import Q = require('q');

interface IBigNumber {
    toNumber(): number
}

export class ProposalService {
    config = new configurationService.ConfigurationService().getConfiguration();
    registryContract;

    constructor() {
    }

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
                
                // Even though the defer is of type void, TypeScript wants a parameter passed
                // to compile.
                defer.resolve(null);
            });

        return defer.promise;
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

        for (var i = 1; i <= t.registryContract.proposalIndex(); i++) {
            var defer = Q.defer<proposalModel.IProposal>();

            getProposalDetailsPromises.push(defer.promise);

            // Call the getter asynchronously by passing a callback.
            t.registryContract.proposals(i, function (proposalErr, proposalAddress) {
                if (proposalErr) {
                    defer.reject(proposalErr);
                    return;
                }

                var proposalContractDefinition = t.registryContract.allContractTypes.Proposal.contractDefinition;
                var proposal = proposalContractDefinition.at(proposalAddress);

                // Construct a local object with all the properties of the proposal.
                // This is extremely slow (seconds), presumably because each of the properties 
                // requires a separate JSON RPC call. Still wouldn't expect it to be
                // THAT slow though.
                // Could change them all to async calls, but that would make the code really
                // hard to read.
                var p: proposalModel.IProposal = {
                    productName: proposal.productName(),
                    productDescription: proposal.productName(),
                    maxPrice: proposal.maxPrice().toNumber(),
                    endDate: proposal.endDate(),
                    ultimateDeliveryDate: proposal.ultimateDeliveryDate(),
                };
                defer.resolve(p);
            });
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

}