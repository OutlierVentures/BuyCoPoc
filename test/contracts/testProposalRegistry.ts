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

    var proposalContractDefinition;

    var timeBeforeDeployment: number;
    var timeAfterDeployment: number;

    var testRegistryName = "BuyCo proposals registry";

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

                // Save the sub contract definitions to variables for easy access.
                proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;

                done(err);
            },
            testRegistryName);
    });

    it("should have the properties set at construction", function (done) {
        this.timeout(10000);

        assert.equal(registryContract.name(), testRegistryName);
        done();
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
        var name1 = "Ethiopia Adado Coop";
        var price1 = 10299;
        var name2 = "FTO Guatemala Huehuetenango";
        var price2 = 2990000;

        var proposalContract;

        registryContract.addProposal(name1, "A very special product", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

                assert.equal(proposalContract.productName(), name1);
                assert.equal(proposalContract.maxPrice().toNumber(), price1);

                return registryContract.addProposal(name2, "Another exceptional product", price2, "2016-04-01", "2016-07-01", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(2);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

                assert.equal(proposalContract.productName(), name2);
                assert.equal(proposalContract.maxPrice().toNumber(), price2);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
