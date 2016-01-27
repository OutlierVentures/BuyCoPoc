import assert = require('assert');
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');
import Q = require('q');

import web3config = require('../contracts/web3config');
import server = require('../../server');

import proposalModel = require('../../models/proposalModel');
import offerModel = require('../../offers/offerModel');
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
        var maxPrice: number;
        var offerPrice: number;

        // Get the proposal list to obtain a valid ID
        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                proposalId = list[0].contractAddress;
                maxPrice = list[0].maxPrice;
                offerPrice = maxPrice - 0.01;
            })
            .end(function (err, res) {

                request(theApp)
                    .post('/api/proposal/' + proposalId + '/offer')
                    .send({
                        "price": offerPrice,
                        "minimumAmount": 456
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var newOffer = <offerModel.IOffer>res.body;
                
                        // Assert stuff on the result
                        assert.notEqual(newOffer.id, "0x", "New proposal has an ID");
                        assert.notEqual(newOffer.id, "0x0000000000000000000000000000000000000000", "New proposal has an ID");                       
                        assert.equal(newOffer.price, offerPrice, "New proposal has the correct price");
                        assert.equal(newOffer.minimumAmount, 456, "New proposal has the correct minimum amount");

                        // TODO: add test to GET ../offers for this proposal and ensure this one is included
                        // TODO: apply different ethereum accounts in the tests when available, to be 
                        // able to make multiple offers etc.
                    })
                    .end(function (err, res) {
                        done(err);
                    });
            });
    });
});
