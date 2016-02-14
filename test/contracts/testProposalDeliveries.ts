import assert = require('assert');
import web3config = require('./web3config');
import fs = require('fs');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry deliveries", () => {
    /**
     * The Solidity web3 contract.
     */
    var registryContract: contractInterfaces.IProposalRegistryContract;

    var contractService: contractService.ContractService;

    var timeBeforeDeployment: number;
    var timeAfterDeployment: number;

    var testRegistryName = "BuyCo proposals registry";

    before(function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        web3config.createWeb3();

        web3plus.deployContractFromFile("ProposalRegistry.sol",
            "ProposalRegistry",
            true,
            function (err, res) {
                registryContract = res;

                serviceFactory.getContractService()
                    .then(cs => {
                        contractService = cs;
                        done();
                    }, err => done(err));
            },
            testRegistryName);
    });

    it("should not register a delivery if there is no accepted offer", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "A testing product";
        var askPrice1 = 10100;
        var askAmount1 = 550;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var sellerAddress1 = web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;

        registryContract.addProposal(name1, "Food and drink", "Coffee", askPrice1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetProposal(tx) {
                var newProposalAddress = registryContract.proposals(1);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc=> {
                proposalContract = pc;
                return proposalContract.back(askAmount1, "cardId12345", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {
                var minDeliveryCount = proposalContract.getMinimumCorrectDeliveryCount().toNumber();

                assert.equal(minDeliveryCount, askAmount1 * 0.5, "Minimum required delivery reports");
                assert.ok(!proposalContract.isDeliveryComplete(), "Not enough deliveries have been reported to release the final payment");

                return proposalContract.reportDelivery(1, true);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var deliveryCount = proposalContract.getCorrectDeliveryCount().toNumber();

                assert.equal(deliveryCount, 0, "No deliveries reported");
                assert.ok(!proposalContract.isDeliveryComplete(), "Not enough deliveries have been reported to release the final payment");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should register a delivery when there is an accepted offer", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var askPrice1 = 10100;
        var askAmount1 = 550;
        var askAmount2 = 100;

        var sellPrice1 = 10000;
        var sellAmount1 = 500;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var sellerAddress1 = web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;

        registryContract.addProposal(name1, "Food and drink", "Coffee", askPrice1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetProposal(tx) {
                var newProposalAddress = registryContract.proposals(1);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc=> {
                proposalContract = pc;

                // First backer
                return proposalContract.back(askAmount1, "cardId12345", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {
                // Second backer
                return proposalContract.back(askAmount2, "cardId12345", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {
                // Make an offer
                return proposalContract.offer(sellPrice1, sellAmount1, "cardId12345", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testCloseProposal(tx) {
                // Close the proposal
                return proposalContract.close({ gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var acceptedOfferAddress = proposalContract.acceptedOffer();

                assert.ok(proposalContract.isClosed());
                assert.notEqual(acceptedOfferAddress, "0x0000000000000000000000000000000000000000", "Accepted offer is not empty");

                assert.ok(!proposalContract.isDeliveryComplete(), "Not enough deliveries have been reported to release the final payment");

                return proposalContract.reportDelivery(1, true);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var deliveryCount = proposalContract.getCorrectDeliveryCount().toNumber();

                assert.equal(deliveryCount, askAmount1, "Delivery was reported");
                assert.ok(proposalContract.isDeliveryComplete(), "Enough deliveries have been reported to release the final payment");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
