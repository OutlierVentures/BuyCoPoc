import chai = require('chai'); var assert = chai.assert;
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');
import Q = require('q');
import async = require('async');

import web3config = require('../../test/contracts/web3config');
import server = require('../../server');
import testHelper = require('../../test/testHelper');

import offerModel = require('../../models/offerModel');
import proposalModel = require('../../models/proposalModel');
import proposalBackingModel = require('../../models/proposalBackingModel');
import categoryModel = require('../../models/categoryModel');
import userModel = require('../../models/userModel');

import serviceFactory = require('../../services/serviceFactory');
import contractInterfaces = require('../../contracts/contractInterfaces');
import cs = require('../../services/contractService');

import _ = require('underscore');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalController fulfilment", () => {
    var theServer: server.Server;
    var theApp: express.Express;
    var contractService: cs.ContractService;

    before(function (done) {
        this.timeout(100000);
        theServer = new server.Server();
        theServer.basePath = path.resolve(path.dirname(__filename), "../../") + "/";
        theApp = theServer.createApp();
        serviceFactory.getContractService()
            .then(c => {
                contractService = c;
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    after(function (done) {
        theServer.stop();
        done();
    });

    it("should execute start payments and payout on proposal with accepted offer on POST /api/proposal/:id/process-payments", function (done) {
        this.timeout(300000);

        var lastYear = (new Date()).getFullYear() - 1;

        var proposal: proposalModel.IProposal;
        var proposalContract: contractInterfaces.IProposalContract;
        var testUserToken: string;
        var newOffer: offerModel.IOffer;

        var startPayoutTransactionId: string;

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
            function createProposal(cb) {
                // Create a proposal with an end date in the past so that we can close it.
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
                    .expect(200)
                    .expect(function (res) {
                        proposal = <proposalModel.IProposal>res.body;
                    })
                    .end(cb);
            },
            function getProposalContract(cb) {
                // Get the proposal contract for assertions
                contractService.getProposalContractAt(proposal.contractAddress)
                    .then(pc => {
                        proposalContract = pc;
                        cb();
                    })
                    .catch(err => {
                        cb(err);
                    })
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
                    .expect(200)
                    .end(cb);
            },
            function createOffer(cb) {
                // Create a valid offer for it
                var cardId = testHelper.getTestUserCardId();
                var offerPrice = 0.09;
                var minAmount = 2;

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/offer')
                    .set("AccessToken", testUserToken)
                    .send({
                        "offer": {
                            "price": offerPrice,
                            "minimumAmount": minAmount,
                            "toCard": cardId,
                        }
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        newOffer = <offerModel.IOffer>res.body;

                        // Assert stuff on the result
                        assert.notEqual(newOffer.id, "0x", "New offer has an ID");
                        assert.notEqual(newOffer.id, "0x0000000000000000000000000000000000000000", "New offer has an ID");
                        assert.equal(newOffer.price, offerPrice, "New offer has the correct price");
                        assert.equal(newOffer.minimumAmount, minAmount, "New offer has the correct minimum amount");

                        // TODO: add test to GET ../offers for this proposal and ensure this one is included
                        // TODO: apply different ethereum accounts in the tests when available, to be 
                        // able to make multiple offers etc.
                    })
                    .end(cb);
            },
            function closeProposal(cb) {
                // Close the proposal. We expect the offer to be accepted.
                // Create a valid offer for it
                var cardId = testHelper.getTestUserCardId();
                var offerPrice = 0.09;
                var minAmount = 2;

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/close')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                    })
                    .end(cb);
            },
            function testIsClosed(cb) {
                request(theApp)
                    .get('/api/proposal/' + proposal.contractAddress)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var freshProposal = <proposalModel.IProposal>res.body;

                        // Assert that the proposal has been closed and that there's an accepted offer.
                        assert.ok(freshProposal.isClosed, "Proposal is closed");
                        assert.equal(freshProposal.acceptedOffer, newOffer.id, "Offer is accepted");
                    })
                    .end(cb);
            },
            function processPayments(cb) {
                // Call process-payments to make the start payment be paid
                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + "/process-payments")
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var backer = proposalContract.backers(1);

                        assert.ok(backer[4], "Start payment of backer 1 has been registered");
                        assert.equal(backer[5].toNumber(), 9, "Start payment amount of backer 1 is correct");

                        startPayoutTransactionId = proposalContract.startPayoutTransactionID();
                        assert.ok(proposalContract.startPayoutTransactionID(), "Start payout transaction ID has been set");
                        assert.equal(proposalContract.startPayoutAmount().toNumber(), 9, "Start payout amount is correct");

                        assert.ok(!proposalContract.endPayoutTransactionID(), "End payout transaction ID has not been registered");
                    })
                    .end(cb);
            },
            function processPaymentsAgain(cb) {
                // Call process-payments again. Ensure that nothing has changed on the start payments.
                // The end payments should still not be executed because delivery hasn't been reported.

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + "/process-payments")
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var backer = proposalContract.backers(1);

                        assert.ok(backer[4], "Start payment of backer 1 has been registered");
                        assert.equal(backer[5].toNumber(), 9, "Start payment amount of backer 1 is correct");

                        assert.equal(proposalContract.startPayoutTransactionID(), startPayoutTransactionId, "Start payout transaction ID has not changed");
                        assert.equal(proposalContract.startPayoutAmount().toNumber(), 9, "Start payout amount is correct");

                        assert.ok(!backer[6], "End payment of backer 1 has not been registered");
                        assert.equal(backer[7].toNumber(), 0, "End payment amount of backer 1 is 0");

                        assert.ok(!proposalContract.endPayoutTransactionID(), "End payout transaction ID has not been registered");
                        assert.equal(proposalContract.endPayoutAmount().toNumber(), 0, "End payout amount is correct");
                    })
                    .end(cb);
            },
        ], done);
    });

    it("should report delivery on proposal with accepted offer on POST /api/proposal/:id/delivery-report", function (done) {
        this.timeout(300000);

        var lastYear = (new Date()).getFullYear() - 1;

        var proposal: proposalModel.IProposal;
        var proposalContract: contractInterfaces.IProposalContract;
        var testUserToken: string;
        var newOffer: offerModel.IOffer;

        var startPayoutTransactionId: string;

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
            function createProposal(cb) {
                // Create a proposal with an end date in the past so that we can close it.
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
                    .expect(200)
                    .expect(function (res) {
                        proposal = <proposalModel.IProposal>res.body;
                    })
                    .end(cb);
            },
            function getProposalContract(cb) {
                // Get the proposal contract for assertions
                contractService.getProposalContractAt(proposal.contractAddress)
                    .then(pc => {
                        proposalContract = pc;
                        cb();
                    })
                    .catch(err => {
                        cb(err);
                    })
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
                    .expect(200)
                    .end(cb);
            },
            function createOffer(cb) {
                // Create a valid offer for it
                var cardId = testHelper.getTestUserCardId();
                var offerPrice = 0.09;
                var minAmount = 2;

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/offer')
                    .set("AccessToken", testUserToken)
                    .send({
                        "offer": {
                            "price": offerPrice,
                            "minimumAmount": minAmount,
                            "toCard": cardId,
                        }
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        newOffer = <offerModel.IOffer>res.body;

                        // Assert stuff on the result
                        assert.notEqual(newOffer.id, "0x", "New offer has an ID");
                        assert.notEqual(newOffer.id, "0x0000000000000000000000000000000000000000", "New offer has an ID");
                        assert.equal(newOffer.price, offerPrice, "New offer has the correct price");
                        assert.equal(newOffer.minimumAmount, minAmount, "New offer has the correct minimum amount");

                        // TODO: add test to GET ../offers for this proposal and ensure this one is included
                        // TODO: apply different ethereum accounts in the tests when available, to be 
                        // able to make multiple offers etc.
                    })
                    .end(cb);
            },
            function closeProposal(cb) {
                // Close the proposal. We expect the offer to be accepted.
                // Create a valid offer for it
                var cardId = testHelper.getTestUserCardId();
                var offerPrice = 0.09;
                var minAmount = 2;

                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + '/close')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                    })
                    .end(cb);
            },
            function testIsClosed(cb) {
                request(theApp)
                    .get('/api/proposal/' + proposal.contractAddress)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var freshProposal = <proposalModel.IProposal>res.body;

                        // Assert that the proposal has been closed and that there's an accepted offer.
                        assert.ok(freshProposal.isClosed, "Proposal is closed");
                        assert.equal(freshProposal.acceptedOffer, newOffer.id, "Offer is accepted");
                    })
                    .end(cb);
            },
            function processDelivery(cb) {
                // Call POST delivery-report to report delivery.
                request(theApp)
                    .post('/api/proposal/' + proposal.contractAddress + "/delivery-report")
                    .send({
                        isDeliveryCorrect: true,
                        backingIndex: 1
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var backer = proposalContract.backers(1);

                        assert.ok(backer[8], "Delivery of backer 1 has been reported");
                        assert.equal(backer[9], "Delivery of backer 1 is reported as correct");
                    })
                    .end(cb);
            },
        ], done);
    });
});