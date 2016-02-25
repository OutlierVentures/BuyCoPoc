import chai = require('chai'); var assert = chai.assert;
import web3config = require('./web3config');
import fs = require('fs');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry closing", () => {
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

        timeBeforeDeployment = Date.now();

        web3config.createWeb3();

        web3plus.deployContractFromFile("ProposalRegistry.sol",
            "ProposalRegistry",
            true,
            function (err, res) {
                timeAfterDeployment = Date.now();
                registryContract = res;

                serviceFactory.getContractService()
                    .then(cs => {
                        contractService = cs;
                        done();
                    }, err => done(err));
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

                // Make an offer
                return proposalContract.offer(sellPrice1, sellAmount1, "cardId12345", { gas: 2500000 });
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

                // Make an offer
                return proposalContract.offer(sellPrice1, sellAmount1, "cardId12345", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testCloseProposal(tx) {
                return proposalContract.close({ gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var acceptedOfferAddress = proposalContract.acceptedOffer();

                assert.ok(proposalContract.isClosed());
                assert.notEqual(acceptedOfferAddress, "0x0000000000000000000000000000000000000000", "Accepted offer is not empty");

                return contractService.getOfferContractAt(acceptedOfferAddress);
            })
            .then(acceptedOffer => {
                // Offer address should be unchanged.
                assert.equal(acceptedOffer.owner(), sellerAddress1, "Seller address is registered correctly");

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
