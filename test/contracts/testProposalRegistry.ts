import assert = require('assert');
import web3config = require('./web3config');
import fs = require('fs');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry", () => {
    /**
     * The Solidity web3 contract.
     */
    var registryContract;

    var timeBeforeDeployment: number;
    var timeAfterDeployment: number;

    before(function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        timeBeforeDeployment = Date.now();

        web3config.createWeb3();

        web3plus.deployContractFromFile("ProposalRegistry.sol",
            "ProposalRegistry",
            true,
            function (err, res) {
                timeAfterDeployment = Date.now();
                registryContract = res;
                done(err);
            });
    });

    it("should have a correct creation time", function (done) {
        this.timeout(10000);

        // Get the creation time of the Circle from the blockchain through block.timestamp,
        // and verify that it is correct.

        // To facilitate this for calling code, a convenience function getCreationTime() could
        // be created in web3plus.enhanceContract().

        web3.eth.getTransaction(registryContract.transactionHash, function processTransactionInfo(err, tx) {
            web3.eth.getBlock(tx.blockNumber, function processBlockInfo(err, block) {
                // Allow a margin of some seconds between the time measurement in the test code
                // and the block time on the blockchain node.
                var margin = 10;

                // block.timestamp is specified in seconds, Date.now() in milliseconds.
                assert.ok((block.timestamp + margin) * 1000 >= timeBeforeDeployment, "Block timestamp is after timeBeforeDeployment");
                assert.ok(block.timestamp * 1000 <= timeAfterDeployment, "Block timestamp is before timeBeforeDeployment");
                done();
            });
        });

    });

    it("should add a proposal and then return it", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);
        var name1 = "iPhone 6S";
        var price1 = 10299;
        var name2 = "Ferrari Testarossa";
        var price2 = 2990000;

        var proposalContractDefinition;
        var proposalContract;

        registryContract.addProposal(name1, price1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                // Assert the properties
                // Get loan amount through sub contract
                proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;
                proposalContract = proposalContractDefinition.at(newProposalAddress);

                assert.equal(proposalContract.product(), name1);
                assert.equal(proposalContract.price().toNumber(), price1);

                return registryContract.addProposal(name2, price2, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(2);

                proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;
                proposalContract = proposalContractDefinition.at(newProposalAddress);

                assert.equal(proposalContract.product(), name2);
                assert.equal(proposalContract.price().toNumber(), price2);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
