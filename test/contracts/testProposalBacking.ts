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

    it("should add backers for a proposal", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var price1 = 10299;
        var amount1 = 15;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var backerAddress1 = web3.eth.coinbase;

        var proposalContract;

        registryContract.addProposal(name1, "A very special product", "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

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

                // Add more "backers". This should update the amount, not add more backers, as we're backing
                // from the same address.
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
                var newBacker = proposalContract.backers(1);

                var backerIndex = proposalContract.backerIndex().toNumber();

                assert.equal(backerIndex, 1);

                // Backer address should be unchanged.
                assert.equal(newBacker[0], backerAddress1);

                var newAmount = newBacker[1].toNumber();

                // Because there is no guarantee for the sequence in which transaction are processed,
                // we don't know for sure what the current amount should be. We do however know that it 
                // should be between 1 and 8. Usually it will be 8.
                assert.ok(newAmount <= 8);
                assert.ok(newAmount >= 1);

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
        var price1 = 10293;
        var amount1 = 13;

        var txID1 = "tx" + Math.round(Math.random() * 1000000);

        // Amount: 40% up front
        var paymentAmount1 = Math.round(price1 * amount1 * 0.4);

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var backerAddress1 = web3.eth.coinbase;

        var proposalContract;

        registryContract.addProposal(name1, "A very special product", "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

                var backPromise = proposalContract.back(amount1, { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[0], backerAddress1);
                assert.equal(newBacker[1].toNumber(), amount1);

                // Register a pledge payment for this backer
                return proposalContract.setPaid(backerAddress1, 1, txID1, paymentAmount1);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                // Backer address should be unchanged.
                assert.equal(newBacker[0], backerAddress1, "Backer address is unchanged");

                assert.equal(newBacker[2], txID1, "Transaction ID is registered correctly");
                var registeredAmount = newBacker[3].toNumber();
                assert.equal(registeredAmount, paymentAmount1, "Amount is registered correctly");

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

        // Amount: 40% up front
        var paymentAmount1 = Math.round(price1 * amount1 * 0.4);

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var backerAddress1 = web3.eth.coinbase;

        var proposalContract;

        registryContract.addProposal(name1, "A very special product", "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(1);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

                var backPromise = proposalContract.back(amount1, { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[0], backerAddress1);
                assert.equal(newBacker[1].toNumber(), amount1);

                // Register a payment for this backer
                return proposalContract.setPaid(backerAddress1, 1, txID32, paymentAmount1);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                assert.equal(newBacker[2], txID32, "Transaction ID of 32 chars is registered correctly");
                assert.equal(newBacker[3].toNumber(), paymentAmount1, "Amount for setPaid with transaction ID of 32 chars is registered correctly");

                return registryContract.addProposal(name1, "A very special product, 2", "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newProposalAddress = registryContract.proposals(2);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

                var backPromise = proposalContract.back(amount1, { gas: 2500000 });
                return backPromise;
            })
            .then(web3plus.promiseCommital)
            .then(function testGetBacker(tx) {
                var newBacker = proposalContract.backers(1);

                // Register a payment for this backer, now use string of length 33
                return proposalContract.setPaid(backerAddress1, 1, txID33, paymentAmount1);
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
