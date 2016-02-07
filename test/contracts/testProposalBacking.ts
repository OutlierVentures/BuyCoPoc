import assert = require('assert');
import web3config = require('./web3config');
import fs = require('fs');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');
import tools = require('../../lib/tools');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry backing", () => {
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

    it("should add backers for a proposal", function (done) {
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

                var backPromise = proposalContract.back(amount1, { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[0], backerAddress1);
                assert.equal(newBacker[1].toNumber(), amount1);

                // Back it more often. This should add more backers for the same address.
                proposalContract.back(1, { gas: 2500000 });
                proposalContract.back(2, { gas: 2500000 });
                proposalContract.back(3, { gas: 2500000 });
                proposalContract.back(4, { gas: 2500000 });
                proposalContract.back(5, { gas: 2500000 });
                proposalContract.back(6, { gas: 2500000 });
                proposalContract.back(7, { gas: 2500000 });
                var lastBacker = proposalContract.back(8, { gas: 2500000 });
                return lastBacker;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var latestBacker = proposalContract.backers(9);

                var backerIndex = proposalContract.backerIndex().toNumber();

                assert.equal(backerIndex, 9);

                // Backer address should be unchanged.
                assert.equal(latestBacker[0], backerAddress1);

                var latestBackerAmount = latestBacker[1].toNumber();

                // Because there is no guarantee for the sequence in which transaction are processed,
                // we don't know for sure what the current amount should be. We do however know that it 
                // should be between 1 and 8. Usually it will be 8.
                assert.ok(latestBackerAmount <= 8, "Amount for latest backer is 8 at the most");
                assert.ok(latestBackerAmount >= 1, "Amount for latest backer is 1 at the least");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should register a payment for a backer", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var price1 = 11035;
        var amount1 = 105;

        var pledgePaymentTxId = tools.newGuid(true);
        var startPaymentTxId = tools.newGuid(true);

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var backerAddress1: string = web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;
        var pledgePaymentAmount: number;
        var startPaymentAmount: number;

        registryContract.addProposal(name1, "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc=> {
                proposalContract = pc;

                var backPromise = proposalContract.back(amount1, { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[0], backerAddress1);
                assert.equal(newBacker[1].toNumber(), amount1);

                // Register a pledge payment for this backer
                pledgePaymentAmount = proposalContract.getPledgePaymentAmount(1).toNumber();
                return proposalContract.setPaid(1, 1, pledgePaymentTxId, pledgePaymentAmount);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var backer = proposalContract.backers(1);

                // Backer address should be unchanged.
                assert.equal(backer[0], backerAddress1, "Backer address is unchanged");

                assert.equal(backer[2], pledgePaymentTxId, "Pledge transaction ID is registered correctly");
                var registeredAmount = backer[3].toNumber();
                assert.equal(registeredAmount, pledgePaymentAmount, "Pledge payment amount is registered correctly");

                // Register a start payment for this backer
                startPaymentAmount = proposalContract.getStartPaymentAmount(1).toNumber();
                return proposalContract.setPaid(1, 2, startPaymentTxId, startPaymentAmount);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var backer = proposalContract.backers(1);

                assert.equal(backer[4], startPaymentTxId, "Start payment transaction ID is registered correctly");
                var registeredAmount = backer[5].toNumber();
                assert.equal(registeredAmount, startPaymentAmount, "Start payment amount is registered correctly");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    /**
     * The Backings in the contract are a struct. The transaction IDs are
     * of type `string`. Hence we would expect them to have arbitrary length.
     * However when a transaction ID of longer than 32 characters is sent,
     * the call to setPaid() fails (silently!).
     * This test tracks that limitation.
     * Of course ultimately we would want to store longer strings as tx IDs.
     * That's another issue.
     */
    it("should not register a payment with a transaction ID longer than 32 characters because of Solidity limits", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var price1 = 10293;
        var amount1 = 13;

        // A string of 32 characters
        var txID32 = "01234567890123456789012345678912";

        // A string of 33 characters
        var txID33 = "012345678901234567890123456789123";

        var paymentAmount1: number;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var backerAddress1: string = web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;

        registryContract.addProposal(name1, "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc=> {
                proposalContract = pc;

                var backPromise = proposalContract.back(amount1, { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[0], backerAddress1);
                assert.equal(newBacker[1].toNumber(), amount1);

                // Register a payment for this backer
                paymentAmount1 = proposalContract.getPledgePaymentAmount(1).toNumber();
                return proposalContract.setPaid(1, 1, txID32, paymentAmount1, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[2], txID32, "Transaction ID of 32 chars is registered correctly");
                assert.equal(newBacker[3].toNumber(), paymentAmount1, "Amount for setPaid with transaction ID of 32 chars is registered correctly");

                return registryContract.addProposal(name1, "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(2);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc=> {
                proposalContract = pc;

                var backPromise = proposalContract.back(amount1, { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                // Register a payment for this backer, now use string of length 33
                return proposalContract.setPaid(1, 1, txID33, paymentAmount1);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[2], "", "setPaid with Transaction ID of 33 chars is not registered correctly");
                assert.equal(newBacker[3].toNumber(), 0, "amount for setPaid with Transaction ID of 33 chars is not registered correctly");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
