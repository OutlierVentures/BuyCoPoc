import assert = require('assert');
import web3config = require('./web3config');
import fs = require('fs');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');
import tools = require('../../lib/tools');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry payouts", () => {
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

    it("should allow the start payout only when the conditions are met", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var askPrice = 10100;
        var askAmount1 = 550;
        var askAmount2 = 100;

        var sellPrice1 = 10000;
        var sellAmount1 = 500;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var sellerAddress1 = web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;

        registryContract.addProposal(name1, "Food and drink", "Coffee", askPrice, "2016-03-01", "2016-05-01", { gas: 2500000 })
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

                assert.ok(!proposalContract.isReadyForStartPayout(), "Not ready for start payout");
                assert.ok(!proposalContract.isStartPaymentComplete(), "Start payment not complete");

                // Set first pledge paid
                return proposalContract.setPaid(1, 1, tools.newGuid(true), askAmount1 * askPrice * proposalContract.pledgePaymentPercentage().toNumber() / 100, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {
                // Set second pledge paid
                return proposalContract.setPaid(2, 1, tools.newGuid(true), askAmount2 * askPrice * proposalContract.pledgePaymentPercentage().toNumber() / 100, { gas: 2500000 });
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
            .then(function testGetTotalBackedAmount(tx) {
                var acceptedOfferAddress = proposalContract.acceptedOffer();

                assert.ok(proposalContract.isClosed());
                assert.notEqual(acceptedOfferAddress, "0x0000000000000000000000000000000000000000", "Accepted offer is not empty");

                assert.ok(!proposalContract.isReadyForStartPayout(), "Not ready for start payout");
                assert.ok(!proposalContract.isStartPaymentComplete(), "Start payment not complete");

                // Set first start paid
                return proposalContract.setPaid(1, 2, tools.newGuid(true), askAmount1 * askPrice * proposalContract.startPaymentPercentage().toNumber() / 100, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {

                assert.ok(!proposalContract.isReadyForStartPayout(), "Not ready for start payout");
                assert.ok(!proposalContract.isStartPaymentComplete(), "Start payment not complete");

                // Set second start paid
                return proposalContract.setPaid(2, 2, tools.newGuid(true), askAmount2 * askPrice * proposalContract.startPaymentPercentage().toNumber() / 100, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                assert.ok(proposalContract.isReadyForStartPayout(), "Ready for start payout");
                assert.ok(proposalContract.isStartPaymentComplete(), "Start payment complete");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should allow the end payout only when the conditions are met", function (done) {
        // This is the most elaborate test (and probably the slowest) because it simulates
        // the whole process. This is required to be able to test the end payout functionality
        // starting from a clean slate.
        this.timeout(300000);

        var name1 = "Ethiopia Adado Coop";
        var askPrice = 10100;
        var askAmount1 = 550;
        var askAmount2 = 100;

        var sellPrice1 = 10000;
        var sellAmount1 = 500;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var sellerAddress1 = web3.eth.coinbase;

        var startPayoutTxId: string;

        var proposalContract: contractInterfaces.IProposalContract;

        registryContract.addProposal(name1, "Food and drink", "Coffee", askPrice, "2016-03-01", "2016-05-01", { gas: 2500000 })
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

                assert.ok(!proposalContract.isReadyForStartPayout(), "Not ready for start payout");
                assert.ok(!proposalContract.isStartPaymentComplete(), "Start payment not complete");

                // Set first pledge paid
                return proposalContract.setPaid(1, 1, tools.newGuid(true), askAmount1 * askPrice * proposalContract.pledgePaymentPercentage().toNumber() / 100, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {
                // Set second pledge paid
                return proposalContract.setPaid(2, 1, tools.newGuid(true), askAmount2 * askPrice * proposalContract.pledgePaymentPercentage().toNumber() / 100, { gas: 2500000 });
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
            .then(function testGetTotalBackedAmount(tx) {
                var acceptedOfferAddress = proposalContract.acceptedOffer();

                assert.ok(proposalContract.isClosed());
                assert.notEqual(acceptedOfferAddress, "0x0000000000000000000000000000000000000000", "Accepted offer is not empty");

                assert.ok(!proposalContract.isReadyForStartPayout(), "Not ready for start payout");
                assert.ok(!proposalContract.isStartPaymentComplete(), "Start payment not complete");

                assert.equal(proposalContract.getStartPaymentAmount(1).toNumber(), askAmount1 * askPrice * proposalContract.startPaymentPercentage().toNumber() / 100, "Start payment amount");

                // Set first start paid
                return proposalContract.setPaid(1, 2, tools.newGuid(true), proposalContract.getStartPaymentAmount(1), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetTotalBackedAmount(tx) {

                assert.ok(!proposalContract.isReadyForStartPayout(), "Not ready for start payout");
                assert.ok(!proposalContract.isStartPaymentComplete(), "Start payment not complete");

                // Set second start paid
                return proposalContract.setPaid(2, 2, tools.newGuid(true), proposalContract.getStartPaymentAmount(2), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                assert.ok(proposalContract.isReadyForStartPayout(), "Ready for start payout");
                assert.ok(proposalContract.isStartPaymentComplete(), "Start payment complete");

                // Assert the start payout amount is correct
                var startPayoutAmount = sellPrice1 * (askAmount1 + askAmount2)
                    * (proposalContract.pledgePaymentPercentage().toNumber() + proposalContract.startPaymentPercentage().toNumber()) / 100;
                assert.equal(proposalContract.getStartPayoutAmount().toNumber(), startPayoutAmount, "Start payout amount");

                assert.equal(proposalContract.startPayoutAmount().toNumber(), 0, "Start payout amount paid");

                // Register start payment
                startPayoutTxId = tools.newGuid(true);

                return proposalContract.registerStartPayout(startPayoutTxId, proposalContract.getStartPayoutAmount(), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                assert.equal(proposalContract.startPayoutAmount().toNumber(), proposalContract.getStartPayoutAmount().toNumber(), "Start payout amount paid");
                assert.equal(proposalContract.startPayoutTransactionID(), startPayoutTxId, "Start payout transaction ID");

                // Try to register start payment again with a new value. That should
                // not be processed.
                return proposalContract.registerStartPayout(tools.newGuid(true), proposalContract.getStartPayoutAmount(), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                assert.equal(proposalContract.startPayoutTransactionID(), startPayoutTxId, "Start payout transaction ID unchanged");

                assert.ok(!proposalContract.isPaymentComplete(), "End payment not complete");

                // Set first end paid
                return proposalContract.setPaid(1, 3, tools.newGuid(true), proposalContract.getEndPaymentAmount(1), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                assert.ok(!proposalContract.isPaymentComplete(), "End payment not complete");
                assert.ok(!proposalContract.isReadyForEndPayout(), "Not ready for start payout");

                // Set second end paid
                return proposalContract.setPaid(2, 3, tools.newGuid(true), proposalContract.getEndPaymentAmount(2), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                // End payment should now be complete, but we're not ready for payout yet
                // as no deliveries have been reported.
                assert.ok(proposalContract.isPaymentComplete(), "End payment complete");
                assert.ok(!proposalContract.isReadyForEndPayout(), "Not ready for start payout");

                // Register delivery to make eligible for end payment
                return proposalContract.reportDelivery(1, true);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                assert.ok(proposalContract.isReadyForEndPayout(), "Ready for end payout");

                assert.equal(proposalContract.endPayoutAmount().toNumber(), 0, "End payout amount paid");

                var endPayoutAmount = sellPrice1 * (askAmount1 + askAmount2) - proposalContract.getStartPayoutAmount().toNumber();

                assert.equal(proposalContract.getEndPayoutAmount().toNumber(), endPayoutAmount, "End payout amount");

                // Register end payment
                return proposalContract.registerEndPayout(tools.newGuid(true), proposalContract.getEndPayoutAmount(), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                assert.equal(proposalContract.endPayoutAmount().toNumber(), proposalContract.getEndPayoutAmount().toNumber(), "End payout amount paid");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });
});
