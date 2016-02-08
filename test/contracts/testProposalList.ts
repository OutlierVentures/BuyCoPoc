import assert = require('assert');
import web3config = require('./web3config');
import fs = require('fs');

import proposalModel = require('../../models/proposalModel');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');

import Q = require('q');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalRegistry list", () => {
    /**
     * The Solidity web3 contract.
     */
    var registryContract: contractInterfaces.IProposalRegistryContract;

    var firstProposal: contractInterfaces.IProposalContract;

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

                var name1 = "Ethiopia Adado Coop";
                var price1 = 10299;
                var name2 = "FTO Guatemala Huehuetenango";
                var price2 = 2990000;
                var name3 = "Peru Ciriaco Quispe";
                var price3 = 189456;

                serviceFactory.getContractService()
                    .then(cs => {
                        contractService = cs;

                        registryContract.addProposal(name1, "Electronics", "Camera", price1, "2016-03-01", "2016-05-01", { gas: 2500000 });
                        registryContract.addProposal(name2, "Food and drink", "Coffee", price2, "2016-03-01", "2016-05-01", { gas: 2500000 });

                        registryContract.addProposal(name3, "Food and drink", "Coffee", price3, "2016-03-01", "2016-05-01", { gas: 2500000 })
                            .then(web3plus.promiseCommital)
                            .then(function (tx) {
                                var firstProposalAddress = registryContract.proposals(1);

                                return contractService.getProposalContractAt(firstProposalAddress);
                            })
                            .then(pc=> {
                                firstProposal = pc;
                                done();
                            })
                            .catch(function (proposalErr) {
                                done(proposalErr)
                            });
                    }, err => done(err));
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

                        // We get each of the properties of the proposal async. Q.denodeify converts
                        // each of the contract method taking a callback method into a function that 
                        // returns a promise.
                        // We wait for these promises with Q.all, which makes them all execute in 
                        // parallel.
                        // Since we are doing 5 similar actions not synchronous but asynchronous, we 
                        // would expect approximately a 5x speedup over the variant that executes
                        // these synchronously and the proposals asynchronously. The speedup however
                        // is far larger.
                        
                        p.contractAddress = proposalAddress;
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


    it("should get properties of proposals within a reasonable time, but it doesn't", function (done) {
        // Getting should be fast, but it's very slow.
        this.timeout(60000);

        console.time("getProperty");

        // Result with remote geth node with 10 calls: +-400ms per call
        var numTimes = 10;
        for (var j = 0; j < numTimes; j++) {
            //var price = firstProposal.maxPrice();
            var name = firstProposal.productName();
        }

        console.timeEnd("getProperty");

        done();
    });

    it("should get properties of proposals within a reasonable time when using a callback", function (done) {
        // Getting should be fast.
        this.timeout(30000);

        console.time("getProperty");

        var numTimes = 20;
        var numResults = 0;

        // Results with a remote geth node with 10 calls: total 135ms for ALL calls.
        function getPropertyCallback(value) {
            numResults++;
            if (numResults == numTimes) {
                console.timeEnd("getProperty");
                done();
            }
        }

        var firstProposalAny = <any>firstProposal;

        for (var j = 0; j < numTimes; j++) {
            firstProposalAny.productName(getPropertyCallback);
        }
    });

    it("should add proposals and then return the list asynchronously using callbacks", function (done) {
        // Getting should be fast.
        // TODO: lower this number once performance problems
        // have been solved.
        this.timeout(20000);

        // This test gets the 3 contracts and their properties asynchronously. The properties
        // themselves are still retrieved synchronously. We would expect this method to take
        // roughly 1/3 of the time of the synchronous calls, as the same amount of work is done
        // for 3 proposals, but in parallel.
        // That is however not the case. It's a bit faster than the synchronous variant, but
        // not much. 

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

                    // Keep using contractDefinition.at() here because we're testing the contract libraries.
                    proposalContractDefinition.at(proposalAddress, function (propContrErr, proposal: contractInterfaces.IProposalContract) {
                        // Surprisingly, the proposals are processed / almost / synchronously.
                        // These console.logs appear about every 2 seconds and the whole thing 
                        // takes almost 6. 
                        // This likely means that the contents of this method block execution.
                        // While the first proposal is processed, no work can be started on the
                        // second proposal and so on. We get just a slight performance benefit
                        // because the contract is instantiated async.
                        console.log(Date() + " Got contract object at " + proposalAddress);

                        const p: proposalModel.IProposal = {
                            contractAddress: proposalAddress,
                            productName: proposal.productName(),
                            productDescription: proposal.productDescription(),
                            productSku: proposal.productSku(),
                            productUnitSize: proposal.productUnitSize(),
                            mainCategory: proposal.mainCategory(),
                            subCategory: proposal.subCategory(),
                            maxPrice: proposal.maxPrice().toNumber(),
                            endDate: new Date(proposal.endDate()),
                            ultimateDeliveryDate: new Date(proposal.ultimateDeliveryDate()),
                            pledgePaymentPercentage: proposal.pledgePaymentPercentage().toNumber(),
                            startPaymentPercentage: proposal.startPaymentPercentage().toNumber(),
                            minimumReportedCorrectDeliveryPercentage: proposal.minimumReportedCorrectDeliveryPercentage().toNumber(),
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


                        // Alternative dummy resolve to test performance characteristics without
                        // contract calls. Then runs as expected: resolving costs around 2000ms,
                        // so the same time as a single promise.

                        //function buildResolveFunction(d2: Q.Deferred<proposalModel.IProposal>) {
                        //    return function () {                       
                        //        d2.resolve(null);
                        //    }
                        //}

                        //setTimeout(buildResolveFunction(d), 2000);
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

        // Keep directly using contractDefinition.at() here instead of contractService,
        // because we're testing the contract libraries on a low level.
        var proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;

        var numProposals = registryContract.proposalIndex().toNumber();

        assert.equal(numProposals, 3);

        for (var i = 1; i <= numProposals; i++) {            
            // Call the getter synchronously.
            var proposalAddress = registryContract.proposals(i);

            var startTime = Date.now();


            console.log("Before loading contract:" + Date.now());
            var proposal: contractInterfaces.IProposalContract = proposalContractDefinition.at(proposalAddress);
            console.log("After loading contract:" + Date.now());

            const p: proposalModel.IProposal = {
                contractAddress: proposalAddress,
                productName: proposal.productName(),
                productDescription: proposal.productDescription(),
                productSku: proposal.productSku(),
                productUnitSize: proposal.productUnitSize(),
                mainCategory: proposal.mainCategory(),
                subCategory: proposal.subCategory(),
                maxPrice: proposal.maxPrice().toNumber(),
                endDate: new Date(proposal.endDate()),
                ultimateDeliveryDate: new Date(proposal.ultimateDeliveryDate()),
                pledgePaymentPercentage: proposal.pledgePaymentPercentage().toNumber(),
                startPaymentPercentage: proposal.startPaymentPercentage().toNumber(),
                minimumReportedCorrectDeliveryPercentage: proposal.minimumReportedCorrectDeliveryPercentage().toNumber(),
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
