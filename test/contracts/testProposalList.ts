﻿import assert = require('assert');
import web3config = require('./web3config');
import fs = require('fs');
import Q = require('q');
import proposalModel = require('../../models/proposalModel');

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
                if (err) {
                    done(err);
                    return;
                }

                timeAfterDeployment = Date.now();
                registryContract = res;

                // Save the sub contract definitions to variables for easy access.
                proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;

                var name1 = "Ethiopia Adado Coop";
                var price1 = 10299;
                var name2 = "FTO Guatemala Huehuetenango";
                var price2 = 2990000;
                var name3 = "Peru Ciriaco Quispe";
                var price3 = 189456;

                var proposalContract;

                registryContract.addProposal(name1, "A very special product", price1, "2016-03-01", "2016-05-01", { gas: 2500000 });
                registryContract.addProposal(name2, "A very special product", price2, "2016-03-01", "2016-05-01", { gas: 2500000 });

                registryContract.addProposal(name3, "A very special product", price3, "2016-03-01", "2016-05-01", { gas: 2500000 })
                    .then(web3plus.promiseCommital)
                    .then(function (tx) {
                        done();
                    })
                    .catch(function (proposalErr) {
                        done(proposalErr)
                    });
            },
            testRegistryName);
    });

    it("should add proposals and then return the list asynchronously using promises", function (done) {
        // Getting should be fast.
        // TODO: lower this number once performance problems
        // have been solved.
        this.timeout(20000);

        var getProposalDetailsPromises = new Array<Q.Promise<proposalModel.IProposal>>();

        var proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;

        var numProposals = registryContract.proposalIndex().toNumber();

        assert.equal(numProposals, 3);

        for (var i = 1; i <= numProposals; i++) {
            var defer = Q.defer<proposalModel.IProposal>();

            getProposalDetailsPromises.push(defer.promise);

            function buildGetProposalCallback(d: Q.Deferred<proposalModel.IProposal>) {
                return function (proposalErr, proposalAddress) {
                    if (proposalErr) {
                        d.reject(proposalErr);
                        return;
                    }

                    proposalContractDefinition.at(proposalAddress, function (propContrErr, proposal) {
                        console.log(Date() + " Got contract object at " + proposalAddress);

                        var getProperties = new Array<Q.Promise<void>>();

                        var p = <proposalModel.IProposal>{};

                        p.id = proposalAddress;
                        getProperties.push(Q.denodeify<string>(proposal.productName)().then(function (name) { p.productName = name; }));
                        getProperties.push(Q.denodeify<string>(proposal.productDescription)().then(function (description) { p.productDescription = description; }));
                        getProperties.push(Q.denodeify<any>(proposal.maxPrice)().then(function (mp) { p.maxPrice = mp.toNumber(); }));
                        getProperties.push(Q.denodeify<string>(proposal.endDate)().then(function (ed) { p.endDate = new Date(ed); }));
                        getProperties.push(Q.denodeify<string>(proposal.ultimateDeliveryDate)().then(function (udd) { p.ultimateDeliveryDate = new Date(udd); }));

                        Q.all(getProperties)
                            .then(function () {
                                d.resolve(p);
                            });

                        //var p: proposalModel.IProposal = {
                        //    id: proposalAddress,
                        //    productName: proposal.productName(),
                        //    productDescription: proposal.productDescription(),
                        //    maxPrice: proposal.maxPrice().toNumber(),
                        //    endDate: proposal.endDate(),
                        //    ultimateDeliveryDate: proposal.ultimateDeliveryDate(),
                        //};

                        //var p: proposalModel.IProposal = {
                        //    id: "dummy id",
                        //    productName: "dummy name",
                        //    productDescription: "dummy description",
                        //    maxPrice: 1,
                        //    endDate: new Date(),
                        //    ultimateDeliveryDate: new Date(),
                        //};

                        //d.resolve(p);
                        
                        
                        //var getManyTimes = new Array<Q.Promise<string>>();


                        //var getName = Q.denodeify<string>(proposal.productName);

                        //for (var j = 0; j < 10; j++) {
                        //    //var price = proposal.maxPrice();
                        //    getManyTimes.push(getName());
                        //}

                        //Q.all(getManyTimes)
                        //    .then(function (names) {
                        //        d.resolve(null);
                        //    });


                    });

                };
            }

            // Call the getter asynchronously by passing a callback.
            registryContract.proposals(i, buildGetProposalCallback(defer));
        }

        Q.all(getProposalDetailsPromises)
            .then(function (allProposals) {
                assert.equal(allProposals.length, numProposals);

                done();
            })
            .catch(function (allProposalsErr) {
                done(allProposalsErr);
            });
    });

    it("should add proposals and then return the list asynchronously using callbacks", function (done) {
        // Getting should be fast.
        // TODO: lower this number once performance problems
        // have been solved.
        this.timeout(20000);

        var getProposalDetailsPromises = new Array<Q.Promise<proposalModel.IProposal>>();

        var proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;

        var numProposals = registryContract.proposalIndex().toNumber();

        assert.equal(numProposals, 3);

        for (var i = 1; i <= numProposals; i++) {
            var defer = Q.defer<proposalModel.IProposal>();

            getProposalDetailsPromises.push(defer.promise);

            function buildGetProposalCallback(d: Q.Deferred<proposalModel.IProposal>) {
                return function (proposalErr, proposalAddress) {
                    if (proposalErr) {
                        d.reject(proposalErr);
                        return;
                    }

                    proposalContractDefinition.at(proposalAddress, function (propContrErr, proposal) {
                        console.log(Date() + " Got contract object at " + proposalAddress);

                        var p: proposalModel.IProposal = {
                            id: proposalAddress,
                            productName: proposal.productName(),
                            productDescription: proposal.productDescription(),
                            maxPrice: proposal.maxPrice().toNumber(),
                            endDate: proposal.endDate(),
                            ultimateDeliveryDate: proposal.ultimateDeliveryDate(),
                        };

                        //var p: proposalModel.IProposal = {
                        //    id: "dummy id",
                        //    productName: "dummy name",
                        //    productDescription: "dummy description",
                        //    maxPrice: 1,
                        //    endDate: new Date(),
                        //    ultimateDeliveryDate: new Date(),
                        //};

                        d.resolve(p);
                    });
                };
            }

            // Call the getter asynchronously by passing a callback.
            registryContract.proposals(i, buildGetProposalCallback(defer));
        }

        console.log("Promises created.");

        Q.all(getProposalDetailsPromises)
            .then(function (allProposals) {
                assert.equal(allProposals.length, numProposals);

                done();
            })
            .catch(function (allProposalsErr) {
                done(allProposalsErr);
            });
    });

    it("should add proposals and then return the list synchronously", function (done) {
        // Getting should be fast.
        // TODO: lower this number once performance problems
        // have been solved.
        this.timeout(20000);

        var allProposals = new Array<proposalModel.IProposal>();

        var proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;

        var numProposals = registryContract.proposalIndex().toNumber();

        assert.equal(numProposals, 3);

        for (var i = 1; i <= numProposals; i++) {            
            // Call the getter synchronously.
            var proposalAddress = registryContract.proposals(i);

            var startTime = Date.now();


            console.log("Before loading contract:" + Date.now());
            var proposal = proposalContractDefinition.at(proposalAddress);
            console.log("After loading contract:" + Date.now());

            var p: proposalModel.IProposal = {
                id: proposalAddress,
                productName: proposal.productName(),
                productDescription: proposal.productDescription(),
                maxPrice: proposal.maxPrice().toNumber(),
                endDate: proposal.endDate(),
                ultimateDeliveryDate: proposal.ultimateDeliveryDate(),
            };

            //var p: proposalModel.IProposal = {
            //    id: "dummy id",
            //    productName: "dummy name",
            //    productDescription: "dummy description",
            //    maxPrice: 1,
            //    endDate: new Date(),
            //    ultimateDeliveryDate: new Date(),
            //};


            allProposals.push(p);
        }

        assert.equal(allProposals.length, numProposals);
        done();
    });
});