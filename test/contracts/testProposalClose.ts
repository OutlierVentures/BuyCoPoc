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

    it("should not close a proposal if requirements aren't met", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var askPrice1 = 10100;
        var askAmount1 = 550;

        // The seller wants a higher price than the buyers are willing to pay. This offer should
        // not be accepted.
        var sellPrice1 = 20000;
        var sellAmount1 = 500;

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

                // Make an offer
                return proposalContract.offer(sellPrice1, sellAmount1, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testCloseProposal(tx) {

                return proposalContract.close({ gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var acceptedOfferAddress = proposalContract.acceptedOffer();               

                // The offer should not have been accepted.
                assert.equal(acceptedOfferAddress, "0x0000000000000000000000000000000000000000");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should close a proposal if requirements are met", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var askPrice1 = 10100;
        var askAmount1 = 550;
        var sellPrice1 = 10000;
        var sellAmount1 = 500;

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

                // Make an offer
                return proposalContract.offer(sellPrice1, sellAmount1, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testCloseProposal(tx) {
                var tot = proposalContract.getTotalBackedAmount().toNumber();

                return proposalContract.close({ gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var acceptedOfferAddress = proposalContract.acceptedOffer();
                var acceptedOffer = offerContractDefinition.at(acceptedOfferAddress);

                // Offer address should be unchanged.
                assert.equal(acceptedOffer.sellerAddress(), sellerAddress1);

                var acceptedPrice = acceptedOffer.price().toNumber();
                var acceptedAmount = acceptedOffer.minimumAmount().toNumber();

                assert.equal(acceptedPrice, sellPrice1);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
