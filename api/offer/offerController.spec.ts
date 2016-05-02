import chai = require('chai'); var assert = chai.assert;
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');
import Q = require('q');
import async = require('async');

import server = require('../../server');
import testHelper = require('../../test/testHelper');

import proposalModel = require('../../models/proposalModel');
import proposalBackingModel = require('../../models/proposalBackingModel');
import offerModel = require('../../models/offerModel');
import userModel = require('../../models/userModel');
import _ = require('underscore');

import web3config = require('../../test/contracts/web3config');
var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("OfferController", () => {
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

    it("should return a list of offers on GET /api/proposal/:id/offer", function (done) {
        this.timeout(100000);

        var proposalId: string;
        var testUserToken: string;

        async.series([
            function getToken(cb) {
                testHelper.getTestUserToken()
                    .then(t => {
                        testUserToken = t;
                        cb();
                    })
                    .catch(err => {
                        cb(err);
                    });
            },
            function getProposal(cb) {
                // Get the proposal list to obtain a valid ID
                request(theApp)
                    .get('/api/proposal')
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        var list = <Array<proposalModel.IProposal>>res.body;
                        proposalId = list[0].contractAddress;
                    })
                    .end(cb);
            },
            function getOffers(cb) {
                request(theApp)
                    .get('/api/proposal/' + proposalId + '/offers')
                    .set("AccessToken", testUserToken)
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        var offers = <Array<offerModel.IOffer>>res.body;

                        // The result is empty when this proposal has no offers. We only 
                        // assert a succes code.
                    })
                    .end(cb);

            }], done);
    });


    it("should create an offer for a proposal on POST /api/proposal/:id:/offer", function (done) {
        this.timeout(200000);

        var proposalId: string;
        var newOffer: offerModel.IOffer;

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

        var offerPrice = 0.09;

        var newProposal: proposalModel.IProposal;
        var testUserToken: string;

        async.series([
            function getToken(cb) {
                testHelper.getTestUserToken()
                    .then(t => {
                        testUserToken = t;
                        cb();
                    })
                    .catch(err => {
                        cb(err);
                    });
            },
            // Create a new proposal to ensure we have a proposal that we can add an offer to.
            function createProposal(cb) {
                request(theApp)
                    .post('/api/proposal')
                    .set("AccessToken", testUserToken)
                    .send(newProposalData)
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        newProposal = <proposalModel.IProposal>res.body;
                        proposalId = newProposal.contractAddress;
                    })
                    .end(cb);
            },
            function createOffer(cb) {
                request(theApp)
                    .post('/api/proposal/' + proposalId + '/offer')
                    .set("AccessToken", testUserToken)
                    .send({
                        "offer": {
                            "price": offerPrice,
                            "minimumAmount": 456,
                            "toCard": testHelper.getTestUserCardId()
                        }
                    })
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        newOffer = <offerModel.IOffer>res.body;

                        // Assert stuff on the result
                        assert.notEqual(newOffer.id, "0x", "New offer has an ID");
                        assert.notEqual(newOffer.id, "0x0000000000000000000000000000000000000000", "New offer has an ID");
                        assert.equal(newOffer.price, offerPrice, "New offer has the correct price");
                        assert.equal(newOffer.minimumAmount, 456, "New offer has the correct minimum amount");

                        // TODO: apply different ethereum accounts in the tests when available, to be 
                        // able to make multiple offers etc.
                    })
                    .end(cb);
            },
            // Test whether GET ../offers returns the new offer
            function getOffers(cb) {
                request(theApp)
                    .get('/api/proposal/' + proposalId + '/offers')
                    .set("AccessToken", testUserToken)
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        var offers = <Array<offerModel.IOffer>>res.body;

                        assert(_(offers).any(o => o.id == newOffer.id), "New offer is listed for proposal on GET /api/proposal/:id/offers");
                    })
                    .end(cb);
            }
        ], done);
    });

    it("should return buyer information to the offer creator on GET /api/proposal/:proposalId:/offer/:offerId/buyers", function (done) {
        this.timeout(200000);

        var proposalId: string;
        var newOffer: offerModel.IOffer;

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

        var offerPrice = 0.09;
        var offerMinAmount = 2;

        var testUserToken: string;

        var proposal: proposalModel.IProposal;

        async.series([
            function getToken(cb) {
                testHelper.getTestUserToken()
                    .then(t => {
                        testUserToken = t;
                        cb();
                    })
                    .catch(err => {
                        cb(err);
                    });
            },
            function ensureCoinbase(cb) {
                // For this test it's essential that the coinbase address used for all the web3 
                // transactions is stored with a test user. Ensure that.
                testHelper.ensureTestUserHasCoinbaseAddress()
                    .then(u => {
                        cb();
                    })
                    .catch(err => {
                        cb(err);
                    });
            },
            function ensureTestBuyer(cb) {
                // For this test it's essential that the test user is a buyer.
                testHelper.ensureTestUserIsBuyer()
                    .then(u => {
                        cb();
                    })
                    .catch(err => {
                        cb(err);
                    });
            },

            // Create a new proposal to ensure we have a proposal that we can add an offer to.
            function createProposal(cb) {
                request(theApp)
                    .post('/api/proposal')
                    .set("AccessToken", testUserToken)
                    .send(newProposalData)
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        proposal = <proposalModel.IProposal>res.body;
                        proposalId = proposal.contractAddress;
                    })
                    .end(cb);
            },
            function createBacking(cb) {
                // Back a sufficient amount
                var cardId = testHelper.getTestUserCardId();
                var backAmount = 2;

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/back')
                    .set("AccessToken", testUserToken)
                    .send({
                        proposal: proposal,
                        amount: backAmount,
                        fromCard: cardId
                    })
                    .expect(res => testHelper.checkStatusCode(res))
                    .end(cb);
            },
            function createOffer(cb) {
                request(theApp)
                    .post('/api/proposal/' + proposalId + '/offer')
                    .set("AccessToken", testUserToken)
                    .send({
                        "offer": {
                            "price": offerPrice,
                            "minimumAmount": offerMinAmount,
                            "toCard": testHelper.getTestUserCardId()
                        }
                    })
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        newOffer = <offerModel.IOffer>res.body;

                        // Assert stuff on the result
                        assert.notEqual(newOffer.id, "0x", "New offer has an ID");
                        assert.notEqual(newOffer.id, "0x0000000000000000000000000000000000000000", "New offer has an ID");
                        assert.equal(newOffer.price, offerPrice, "New offer has the correct price");
                        assert.equal(newOffer.minimumAmount, offerMinAmount, "New offer has the correct minimum amount");

                        // TODO: apply different ethereum accounts in the tests when available, to be 
                        // able to make multiple offers etc.
                    })
                    .end(cb);
            },
            // Before closing we expect a 403, because we're not allowed to get the buyer data yet.
            function getBuyerDataError(cb) {
                request(theApp)
                    .get('/api/proposal/' + proposalId + '/offer/' + newOffer.id + '/buyers')
                    .set("AccessToken", testUserToken)
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res, 403))
                    .end(cb);
            },
            function closeProposal(cb) {
                // Close the proposal. We expect the offer to be accepted.
                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/close')
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .end(cb);
            },
            // Test whether GET ../offer/../buyers returns the list of backers with buyer data
            function getBuyerData(cb) {
                request(theApp)
                    .get('/api/proposal/' + proposalId + '/offer/' + newOffer.id + '/buyers')
                    .set("AccessToken", testUserToken)
                    .expect('Content-Type', /json/)
                    .expect(res => testHelper.checkStatusCode(res))
                    .expect(function (res) {
                        var buyers = <Array<proposalBackingModel.IProposalBacking>>res.body;

                        assert.ok(_(buyers).any(b => b.address == web3plus.web3.eth.coinbase), "There is a backer with the backer addresss");
                        assert.ok(buyers[0].buyerInfo, "First buyer has buyer info");
                        assert.ok(buyers[0].buyerInfo.company, "First buyer has a company name");
                    })
                    .end(cb);
            }
        ], done);

    });

});
