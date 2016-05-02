import chai = require('chai'); var assert = chai.assert;
import web3config = require('./web3config');
import fs = require('fs');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry offers", () => {
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

    it("should add offers for a proposal", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var name1 = "Ethiopia Adado Coop";
        var price1 = 10100;
        var amount1 = 550;

        // Currently all transactions are sent from a single address. Hence the "backer" is
        // also that address.
        var sellerAddress1 = web3.eth.coinbase;

        var proposalContract: contractInterfaces.IProposalContract;


        registryContract.addProposal(name1, "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetProposal(tx) {
                var newProposalAddress = registryContract.proposals(1);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc=> {
                proposalContract = pc;

                return proposalContract.offer(price1, amount1, "cardId12345", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetOffer(tx) {
                var newOfferAddress = proposalContract.offers(1);

                return contractService.getOfferContractAt(newOfferAddress);
            })
            .then(newOffer => {
                assert.equal(newOffer.owner(), sellerAddress1);
                assert.equal(newOffer.price().toNumber(), price1);
                assert.equal(newOffer.minimumAmount().toNumber(), amount1);

                // Add more "offers". This should update the amount, not add more backers, as we're backing
                // from the same address.
                proposalContract.offer(1, 1, "cardId12345", { gas: 2500000 });
                proposalContract.offer(2, 2, "cardId12345", { gas: 2500000 });
                proposalContract.offer(3, 3, "cardId12345", { gas: 2500000 });
                proposalContract.offer(4, 4, "cardId12345", { gas: 2500000 });
                proposalContract.offer(5, 5, "cardId12345", { gas: 2500000 });
                proposalContract.offer(6, 6, "cardId12345", { gas: 2500000 });
                proposalContract.offer(7, 7, "cardId12345", { gas: 2500000 });
                return proposalContract.offer(8, 8, "cardId12345", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetLatestOffer(tx) {
                var newOfferAddress = proposalContract.offers(1);
                return contractService.getOfferContractAt(newOfferAddress);
            })
            .then(newOffer => {
                var offerIndex = proposalContract.offerIndex().toNumber();

                assert.equal(offerIndex, 1);

                // Backer address should be unchanged.
                assert.equal(newOffer.owner(), sellerAddress1);

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
