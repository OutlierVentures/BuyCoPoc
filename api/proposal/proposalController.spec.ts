import chai = require('chai'); var assert = chai.assert;
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');
import Q = require('q');

import web3config = require('../../test/contracts/web3config');
import server = require('../../server');
import testHelper = require('../../test/testHelper');

import proposalModel = require('../../models/proposalModel');
import proposalBackingModel = require('../../models/proposalBackingModel');
import categoryModel = require('../../models/categoryModel');
import userModel = require('../../models/userModel');

import serviceFactory = require('../../services/serviceFactory');

import _ = require('underscore');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalController", () => {
    var theServer: server.Server;
    var theApp: express.Express;

    before(function (done) {
        this.timeout(10000);
        theServer = new server.Server();
        theServer.basePath = path.resolve(path.dirname(__filename), "../../") + "/";
        theApp = theServer.createApp();

        done();
    });

    after(function (done) {
        theServer.stop();
        done();
    });

    it("should return a list of proposals on GET /api/proposal", function (done) {
        this.timeout(10000);

        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            //.expect('Content-Length', '20')
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                
                // Assert stuff on the result
                assert.ok(list.length > 0, "More than one result");
                assert.ok(list[0].productName.length > 0, "First product has a name");
            })
            .end(function (err, res) {
                done(err);
            });
    });

    it("should return a proposal on GET /api/proposal/:id", function (done) {
        this.timeout(100000);

        var proposalId: string;
        var productName: string;

        // Get the proposal list to obtain a valid ID
        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                proposalId = list[0].contractAddress;
                productName = list[0].productName;
            })
            .end(function (err, res) {

                request(theApp)
                    .get('/api/proposal/' + proposalId)
                    .expect('Content-Type', /json/)
                    .expect(function (res) { testHelper.checkStatusCode(res, 200); })
                    .expect(function (res) {
                        var proposal = <proposalModel.IProposal>res.body;
                
                        // Assert stuff on the result
                        assert.equal(proposal.contractAddress, proposalId, "Returned proposal has correct ID");
                        assert.equal(proposal.productName, productName, "Returned product has correct name");
                    })
                    .end(function (err, res) {
                        done(err);
                    });

            });

    });

    it("should return a list of proposals in a category on GET /api/proposal/category/:main/:sub", function (done) {
        this.timeout(10000);

        request(theApp)
            .get('/api/proposal/category/Electronics/Camera')
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                
                // TODO: get a category that contains data from Mongo, then use that
                // to have at least one result
                assert.ok(list, "List is set");
            })
            .end(function (err, res) {
                done(err);
            });
    });



    it("should create a proposal on POST /api/proposal", function (done) {
        this.timeout(200000);

        var newProposalData = {
            proposal: {
                productName: "A testing product",
                productDescription: "From the unit tests " + Date(),
                productSku: "SKU123",
                productUnitSize: "1 unit",
                mainCategory: "Electronics",
                subCategory: "Camera",
                maxPrice: 0.10,
                //endDate: "2016-12-01",
                //ultimateDeliveryDate: "2017-12-01"
            }
        };

        var newProposal: proposalModel.IProposal;

        request(theApp)
            .post('/api/proposal')
            .send(newProposalData)
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {
                newProposal = <proposalModel.IProposal>res.body;
                
                // Assert stuff on the result
                assert.notEqual(newProposal.contractAddress, "0x", "New proposal has an ID");
                assert.ok(!newProposal.endDate, "New proposal has an empty end date");
                assert.equal(newProposal.productSku, "SKU123", "New proposal has correct SKU");
                assert.equal(newProposal.productUnitSize, "1 unit", "New proposal has correct unit size");
                assert.equal(newProposal.mainCategory, "Electronics", "New proposal has correct main category");
                assert.equal(newProposal.subCategory, "Camera", "New proposal has correct sub category");
            })
            .end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }

                // Get the proposal from the contract directly to verify that it was indeed stored correctly.
                serviceFactory.getContractService()
                    .then(cs=> {
                        return cs.getProposalContractAt(newProposal.contractAddress);
                    })
                    .then(proposalFromContract => {
                        assert.equal(proposalFromContract.productName(), newProposal.productName, "contract has correct productName");
                        assert.equal(proposalFromContract.productSku(), newProposal.productSku, "contract has correct productSku");
                        assert.equal(proposalFromContract.productUnitSize(), newProposal.productUnitSize, "contract has correct productUnitSize");
                        assert.equal(proposalFromContract.productDescription(), newProposal.productDescription, "contract has correct productDescription");
                        assert.equal(proposalFromContract.mainCategory(), newProposal.mainCategory, "contract has correct mainCategory");
                        assert.equal(proposalFromContract.subCategory(), newProposal.subCategory, "contract has correct subCategory");

                        done();
                    }, err => done(err));

            });
    });

    it("should get the backers for a proposal on GET /api/proposal/:id/backers", function (done) {
        this.timeout(100000);

        var proposal: proposalModel.IProposal;

        // Get the proposal list to obtain a valid ID
        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                proposal = list[0];
            })
            .end(function (err, res) {

                request(theApp)
                    .get('/api/proposal/' + proposal.contractAddress + '/backers')
                    .expect('Content-Type', /json/)
                    .expect(function (res) { testHelper.checkStatusCode(res, 200); })
                    .expect(function (res) {
                        var backers = <Array<proposalBackingModel.IProposalBacking>>res.body;

                        // We can't assert much here. The fact that we got here without error is the result of the test.
                       
                    })
                    .end(function (err, res) {
                        done(err);
                    });

            });

    });


    it("should back a proposal on POST /api/proposal/:id/back", function (done) {
        this.timeout(300000);

        var proposal: proposalModel.IProposal;
        var amount = 1;
        // Currently all our requests to the blockchain come from a
        // single address.
        var sourceAddress = web3.eth.coinbase;

        // Find a valid user token to simulate the originating user
        testHelper.getTestUserToken()
            .then(function (testUserToken) {

                // Create a proposal with a low amount to keep the transfer amount low
                request(theApp)
                    .post('/api/proposal')
                    .send({
                        proposal: {
                            productName: "A testing product", "productDescription": "From the unit tests " + Date(),
                            productSku: "SKU123",
                            mainCategory: "Electronics",
                            subCategory: "Camera",
                            maxPrice: 0.10,
                            endDate: "2016-12-01",
                            ultimateDeliveryDate: "2017-12-01"
                        }
                    })
                    .expect('Content-Type', /json/)
                    .expect(function (res) { testHelper.checkStatusCode(res, 200); })
                    .end(function (err, res) {
                        if (err) done(err);

                        var proposal = <proposalModel.IProposal>res.body;
                        var cardId = testHelper.getTestUserCardId();

                        request(theApp)
                            .post('/api/proposal/' + proposal.contractAddress + '/back')
                            .set("AccessToken", testUserToken)
                            .send({
                                proposal: proposal,
                                amount: amount,
                                fromCard: cardId
                            })
                            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
                            .expect(function (res) {
                                // Nothing to assert here; POST ../back gives no content.
                            })
                            .end(function (err, res) {
                                if (err) done(err);

                                // We check the result by doing another request, to see if the list of backers
                                // contains our address and amount.
                                request(theApp)
                                    .get('/api/proposal/' + proposal.contractAddress + '/backers')
                                    .expect('Content-Type', /json/)
                                    .expect(function (res) { testHelper.checkStatusCode(res, 200); })
                                    .expect(function (res) {
                                        var backers = <Array<proposalBackingModel.IProposalBacking>>res.body;

                                        var backerAddress = sourceAddress;

                                        assert(_(backers).any((backer) => { return backer.amount == amount && backer.address == backerAddress; }),
                                            "Backers contain address " + backerAddress + " for amount " + amount);
                                    })
                                    .end(function (err, res) {
                                        done(err);
                                    });

                            });
                    });
            },
            function (userErr) {
                done(userErr);
            });


    });

    it("should return a list of proposals ready to close GET /api/proposal/closing-candidates", function (done) {
        this.timeout(10000);

        request(theApp)
            .get('/api/proposal/closing-candidates')
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                
                // TODO: ensure there's a proposal ready to close, then use that
                // to have at least one result
                assert.ok(list, "List is set");
            })
            .end(function (err, res) {
                done(err);
            });
    });

    it("should not close a proposal with end date in the future on POST /api/proposal/:id/close", function (done) {
        this.timeout(100000);

        var twoYearsAhead = (new Date()).getFullYear() + 2;

        // Create a proposal with an end date far in the future
        request(theApp)
            .post('/api/proposal')
            .send({
                proposal: {
                    productName: "A testing product", "productDescription": "From the unit tests " + Date(),
                    productSku: "SKU123",
                    mainCategory: "Electronics",
                    subCategory: "Camera",
                    maxPrice: 0.10,
                    endDate: twoYearsAhead + "-11-01",
                    ultimateDeliveryDate: twoYearsAhead + "-12-01"
                }
            })
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .end(function (err, res) {
                if (err) done(err);

                var proposal = <proposalModel.IProposal>res.body;
                var cardId = testHelper.getTestUserCardId();

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/close')
                    // Ideally this would be 400, as it's a bad request. The proposal isn't ready 
                    // to close, yet we request closing it. However because the controller delegates
                    // everything to the service, it can't determine whether there was a validation
                    // error or something else. Hence everything arrives as a 500.
                    .expect(function (res) { testHelper.checkStatusCode(res, 500); })
                    .end(function (err, res) {
                        done(err);
                    });
            });
    });

    it("should close a proposal with end date in the past on POST /api/proposal/:id/close", function (done) {
        this.timeout(100000);

        var lastYear = (new Date()).getFullYear() - 1;

        // Create a proposal with an end date in the past
        request(theApp)
            .post('/api/proposal')
            .send({
                proposal: {
                    productName: "A testing product", "productDescription": "From the unit tests " + Date(),
                    productSku: "SKU123",
                    mainCategory: "Electronics",
                    subCategory: "Camera",
                    maxPrice: 0.10,
                    endDate: lastYear + "-11-01",
                    ultimateDeliveryDate: lastYear + "-12-01"
                }
            })
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .end(function (err, res) {
                if (err) done(err);

                var proposal = <proposalModel.IProposal>res.body;
                var cardId = testHelper.getTestUserCardId();

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/close')
                    .expect(function (res) { testHelper.checkStatusCode(res, 200); })
                    .expect(function (res) {
                        var proposal = <proposalModel.IProposal>res.body;
                                                
                        assert.ok(proposal.isClosed, "Proposal is closed");
                    })
                    .end(function (err, res) {
                        done(err);
                    });
            });
    });


});
