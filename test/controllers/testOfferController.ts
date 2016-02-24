import assert = require('assert');
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');
import Q = require('q');
import async = require('async');

import web3config = require('../contracts/web3config');
import server = require('../../server');
import testHelper = require('../testHelper');

import proposalModel = require('../../models/proposalModel');
import offerModel = require('../../models/offerModel');
import userModel = require('../../models/userModel');
import _ = require('underscore');

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

    it("should list of offers on GET /api/proposal/:id/offer", function (done) {
        this.timeout(100000);

        var proposalId: string;

        // Get the proposal list to obtain a valid ID
        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                proposalId = list[0].contractAddress;
            })
            .end(function (err, res) {

                request(theApp)
                    .get('/api/proposal/' + proposalId + '/offers')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var offers = <Array<offerModel.IOffer>>res.body;
                
                        // The result is empty when this proposal has no offers. We only 
                        // assert a succes code.
                    })
                    .end(function (err, res) {
                        done(err);
                    });

            });

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

        async.series([
            // Create a new proposal to ensure we have a proposal that we can add an offer to.
            function createProposal(cb) {
                request(theApp)
                    .post('/api/proposal')
                    .send(newProposalData)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        newProposal = <proposalModel.IProposal>res.body;
                        proposalId = newProposal.contractAddress;
                    })
                    .end(cb);
            },
            function createOffer(cb) {
                request(theApp)
                    .post('/api/proposal/' + proposalId + '/offer')
                    .send({
                        "offer": {
                            "price": offerPrice,
                            "minimumAmount": 456,
                            "toCard": testHelper.getTestUserCardId()
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
                        assert.equal(newOffer.minimumAmount, 456, "New offer has the correct minimum amount");

                        // TODO: apply different ethereum accounts in the tests when available, to be 
                        // able to make multiple offers etc.
                    })
                    .end(cb);
            },
            // Test whether GET ../offers returns the new proposal
            function getOffers(cb) {
                request(theApp)
                    .get('/api/proposal/' + proposalId + '/offers')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var offers = <Array<offerModel.IOffer>>res.body;

                        assert(_(offers).any(o => o.id == newOffer.id), "New offer is listed for proposal on GET /api/proposal/:id/offers");
                    })
                    .end(cb);
            }
        ], done);

    });
});
