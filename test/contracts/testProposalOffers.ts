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

    it("should add offers for a proposal", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var price1 = 10100;
        var amount1 = 550;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var sellerAddress1 = web3.eth.coinbase;

        var proposalContract;

        registryContract.addProposal(name1, "A very special product", "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetProposal(tx) {
                var newProposalAddress = registryContract.proposals(1);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

                return proposalContract.offer(price1, amount1, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetOffer(tx) {
                var newOfferAddress = proposalContract.offers(1);
                var newOffer = offerContractDefinition.at(newOfferAddress);

                assert.equal(newOffer.sellerAddress(), sellerAddress1);
                assert.equal(newOffer.price().toNumber(), price1);
                assert.equal(newOffer.minimumAmount().toNumber(), amount1);

                // Add more "offers". This should update the amount, not add more backers, as we're backing
                // from the same address.
                proposalContract.offer(1, 1, { gas: 2500000 });
                proposalContract.offer(2, 2, { gas: 2500000 });
                proposalContract.offer(3, 3, { gas: 2500000 });
                proposalContract.offer(4, 4, { gas: 2500000 });
                proposalContract.offer(5, 5, { gas: 2500000 });
                proposalContract.offer(6, 6, { gas: 2500000 });
                proposalContract.offer(7, 7, { gas: 2500000 });
                return proposalContract.offer(8, 8, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var newOfferAddress = proposalContract.offers(1);
                var newOffer = offerContractDefinition.at(newOfferAddress);

                var offerIndex = proposalContract.offerIndex().toNumber();

                assert.equal(offerIndex, 1);

                // Backer address should be unchanged.
                assert.equal(newOffer.sellerAddress(), sellerAddress1);

                var newPrice = newOffer.price().toNumber();
                var newAmount = newOffer.minimumAmount().toNumber();

                // Because there is no guarantee for the sequence in which transaction are processed,
                // we don't know for sure what the current amount should be. We do however now that it 
                // should be between 1 and 8. Usually it will be 8.
                assert.ok(newPrice <= 8);
                assert.ok(newPrice >= 1);

                // Whichever of the transactions was the final one, the price should be equal
                // to the amount.
                assert.equal(newAmount, newPrice);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
