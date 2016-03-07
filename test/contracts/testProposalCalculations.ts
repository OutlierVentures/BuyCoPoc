import chai = require('chai'); var assert = chai.assert;
import web3config = require('./web3config');
import fs = require('fs');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');
import tools = require('../../lib/tools');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry calculation", () => {
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


    it("should calculate correct payment amounts", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var price1 = 10299;
        var amount1 = 15;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var backerAddress1 = web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;

        registryContract.addProposal(name1, "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc=> {
                proposalContract = pc;

                assert.equal(proposalContract.productName(), name1);
                assert.equal(proposalContract.maxPrice().toNumber(), price1);

                var backPromise = proposalContract.back(amount1, "cardId12345", { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[0], backerAddress1);
                assert.equal(newBacker[1].toNumber(), amount1);

                // Pledge payment: 5% up front
                assert.equal(proposalContract.pledgePaymentPercentage().toNumber(), 5);
                var pledgePaymentAmount = Math.floor(price1 * amount1 * 0.05);

                // The calculations in the contract on (u)ints always round downwards, so
                // compare to Math.floor().
                assert.equal(proposalContract.getPledgePaymentAmount(1).toNumber(), pledgePaymentAmount, "pledge payment amount is correct");

                // Start payment: 45% up front
                assert.equal(proposalContract.startPaymentPercentage().toNumber(), 45);
                var startPaymentAmount = Math.floor(price1 * amount1 * 0.45);

                assert.equal(proposalContract.getStartPaymentAmount(1).toNumber(), startPaymentAmount, "start payment amount is correct");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should calculate the total backed amount", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
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
            .then(function setPaid(tx) {

                // Set pledge paid.
                return proposalContract.setPaid(1, 1, tools.newGuid(true), proposalContract.getPledgePaymentAmount(1), { gas: 2500000 });
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
