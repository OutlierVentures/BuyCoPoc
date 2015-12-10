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
    var offerContractDefinition;

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
                offerContractDefinition = registryContract.allContractTypes.Offer.contractDefinition;

                done(err);
            },
            testRegistryName);
    });

    it("should calculate the total backed amount", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "iPhone 6S";
        var askPrice1 = 10100;
        var askAmount1 = 550;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var sellerAddress1 = web3.eth.coinbase;

        var proposalContract;

        registryContract.addProposal(name1, "A very special product", askPrice1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetProposal(tx) {
                var newProposalAddress = registryContract.proposals(1);

                proposalContract = proposalContractDefinition.at(newProposalAddress);
                return proposalContract.back(askAmount1, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {

                var totalAmount = proposalContract.getTotalBackedAmount().toNumber();
                assert.equal(totalAmount, askAmount1);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
